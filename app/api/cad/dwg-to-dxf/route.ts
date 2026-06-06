import { NextRequest } from 'next/server'
import path from 'node:path'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_DWG_BYTES = 20 * 1024 * 1024
const ARC_SEGMENTS = 48
const CIRCLE_SEGMENTS = 96

// Bounds on geometry expansion so a crafted DWG (deeply nested / array-replicated
// INSERTs) can't explode output and hang the request.
const MAX_INSERT_REPEAT = 256
const MAX_OUTPUT_POLYLINES = 50_000
const MAX_OUTPUT_VERTICES = 2_000_000

interface ExpandBudget {
  polylines: number
  vertices: number
  exceeded: boolean
}

// Resource guards for this unauthenticated, CPU/memory-heavy endpoint. NOTE: this
// state is per-instance (serverless/Fluid Compute), so it's a best-effort cap, not
// a global guarantee — pair with platform rate limiting (Vercel WAF) for real DoS
// protection.
const MAX_CONCURRENT_PARSES = 2
let activeParses = 0
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const ipHits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (ipHits.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  ipHits.set(ip, recent)
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      if (v.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) ipHits.delete(k)
    }
  }
  return recent.length > RATE_LIMIT_MAX
}

interface Pt {
  x: number
  y: number
}

interface ApiPolyline {
  vertices: Array<[number, number]>
  closed: boolean
}

interface DwgEntity {
  type: string
  [k: string]: unknown
}

interface DwgBlockRecord {
  handle?: string
  name?: string
  basePoint?: Pt
  entities?: DwgEntity[]
}

interface DwgDatabase {
  entities?: DwgEntity[]
  tables?: {
    BLOCK_RECORD?: {
      entries?: DwgBlockRecord[]
    }
  }
}

interface EntityTransform {
  x: number
  y: number
  sx: number
  sy: number
  rotation: number
  baseX: number
  baseY: number
}

interface DwgVersionInfo {
  hdr?: string
  description?: string
  type?: string
  version?: number
}

interface DwgConversionDiagnostics {
  dwgHeader?: string
  dwgVersion?: string
  dwgVersionType?: string
  modelSpaceObjectCount?: number
  blockRecordCount?: number
  unknownEntityCount?: number
  legacyEntityTableCount?: number
  legacyEntityObjectResolutionCount?: number
  legacyEntityTypeCounts?: Record<string, number>
  legacyEntityPolylineCount?: number
  legacyEntityFallbackStatus?: 'not-available' | 'empty' | 'failed' | 'parsed'
  legacyEntityFallbackError?: string
  dxfFallbackStatus?: 'not-available' | 'no-output' | 'failed' | 'parsed'
  dxfFallbackError?: string
  dxfFallbackPolylineCount?: number
  typeCounts?: Record<string, number>
  paperSpaceCount?: number
  totalEntities?: number
  skippedTypes?: string[]
}

type LibreDwgWasm = {
  dwg_free?: (ptr: unknown) => void
}

interface LibreDwgInstance {
  dwg_read_data: (buf: ArrayBuffer, fileType: number) => unknown
  dwg_write_dxf?: (fileContent: ArrayBuffer | string) => Uint8Array | null
  convert: (data: unknown) => DwgDatabase
  convertEx?: (data: unknown) => {
    database: DwgDatabase
    stats?: {
      unknownEntityCount?: number
    }
  }
  dwg_get_version_type?: (data: unknown) => DwgVersionInfo | undefined
  dwg_getall_entities_in_model_space?: (data: unknown) => unknown[]
  dwg_get_num_entities?: (data: unknown) => number
  dwg_get_num_objects?: (data: unknown) => number
  dwg_get_entity_index?: (data: unknown, index: number) => unknown
  dwg_get_object?: (data: unknown, index: number) => unknown
  dwg_object_get_fixedtype?: (object: unknown) => number
  dwg_object_get_dxfname?: (object: unknown) => string
  dwg_object_to_entity_tio?: (object: unknown) => unknown
  dwg_dynapi_entity_value?: (entity: unknown, field: string) => { data?: unknown }
  dwg_entity_polyline_2d_get_vertices?: (object: unknown) => Array<{
    point?: { x?: unknown; y?: unknown; z?: unknown }
    start_width?: unknown
    end_width?: unknown
    bulge?: unknown
    flag?: unknown
    tangent_dir?: unknown
  }>
  HEAPU32?: Uint32Array
  dwg_free?: (data: unknown) => void
}

interface LibreDwgModule {
  LibreDwg: {
    create(wasmDir: string): Promise<LibreDwgInstance & LibreDwgWasm>
  }
  Dwg_File_Type: { DWG: number; DXF: number }
}

let modulePromise: Promise<LibreDwgModule> | null = null
let instancePromise: Promise<LibreDwgInstance & LibreDwgWasm> | null = null

async function getLibreDwg() {
  if (!modulePromise) {
    modulePromise = import('@mlightcad/libredwg-web') as unknown as Promise<LibreDwgModule>
  }
  const mod = await modulePromise

  if (!instancePromise) {
    instancePromise = (async () => {
      const wasmDir = path.join(
        process.cwd(),
        'node_modules',
        '@mlightcad',
        'libredwg-web',
        'wasm/',
      )
      return mod.LibreDwg.create(wasmDir)
    })().catch((err) => {
      instancePromise = null
      throw err
    })
  }
  return { mod, instance: await instancePromise }
}

function arcVertices(cx: number, cy: number, r: number, startAngle: number, endAngle: number): Pt[] {
  // libredwg expresses angles in radians, CCW from +X. Normalize sweep.
  let sweep = endAngle - startAngle
  if (sweep <= 0) sweep += Math.PI * 2
  const pts: Pt[] = []
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS
    const a = startAngle + sweep * t
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

function circleVertices(cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

function readDwgVersionHeader(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 6))
  return Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('')
    .trim()
}

const DWG_VERSION_DESCRIPTIONS: Record<string, string> = {
  AC1009: 'AutoCAD Release 11/12 legacy DWG (AC1009)',
  AC1010: 'AutoCAD pre-R13 DWG (AC1010)',
  AC1011: 'AutoCAD pre-R13 DWG (AC1011)',
  AC1012: 'AutoCAD Release 13 DWG (AC1012)',
  AC1014: 'AutoCAD Release 14 DWG (AC1014)',
  AC1015: 'AutoCAD 2000/2000i/2002 DWG (AC1015)',
  AC1018: 'AutoCAD 2004/2005/2006 DWG (AC1018)',
  AC1021: 'AutoCAD 2007/2008/2009 DWG (AC1021)',
  AC1024: 'AutoCAD 2010/2011/2012 DWG (AC1024)',
  AC1027: 'AutoCAD 2013/2014/2015/2016/2017 DWG (AC1027)',
  AC1032: 'AutoCAD 2018/2019/2020/2021/2022 DWG (AC1032)',
}

function describeDwgHeader(header?: string): string | undefined {
  if (!header) return undefined
  return DWG_VERSION_DESCRIPTIONS[header] ?? `DWG ${header}`
}

function describeDwgVersionInfo(version?: DwgVersionInfo): string | undefined {
  if (!version) return undefined
  if (version.description && version.hdr) return `${version.description} (${version.hdr})`
  return version.description ?? describeDwgHeader(version.hdr)
}

function isLegacyDwgHeader(header?: string): boolean {
  return header === 'AC1009' || header === 'AC1010' || header === 'AC1011' || header === 'AC1012' || header === 'AC1014'
}

function isProbablyNewerDwgHeader(header?: string): boolean {
  if (!header?.startsWith('AC')) return false
  const numeric = Number(header.slice(2))
  return Number.isFinite(numeric) && numeric > 1032
}

function zeroEntityErrorMessage(diagnostics: DwgConversionDiagnostics): string {
  const version = diagnostics.dwgVersion ?? describeDwgHeader(diagnostics.dwgHeader) ?? 'this DWG'
  const lowLevelText =
    diagnostics.modelSpaceObjectCount !== undefined
      ? ` Low-level model-space scan found ${diagnostics.modelSpaceObjectCount} object(s).`
      : ''

  if (isLegacyDwgHeader(diagnostics.dwgHeader)) {
    return (
      `libredwg opened ${version}, but the libredwg-web database converter returned zero entities. ` +
      'This is a legacy DWG conversion path issue, not a newer-release issue. ' +
      'Re-save/export the drawing as DXF, or save as DWG R2000/R2004/R2010/R2013/R2018 and re-upload.' +
      lowLevelText
    )
  }

  if (isProbablyNewerDwgHeader(diagnostics.dwgHeader)) {
    return (
      `libredwg opened ${version}, but the converter returned zero entities. ` +
      'This DWG appears newer than the currently supported conversion path. ' +
      'Re-save/export as DXF or DWG R2018 or earlier and re-upload.' +
      lowLevelText
    )
  }

  return (
    `libredwg opened ${version}, but the converter returned zero entities. ` +
    'The drawing may contain unsupported/proxy objects, may store usable geometry outside model space, or may need to be re-saved as DXF.' +
    lowLevelText
  )
}

function noDwgDataErrorMessage(header?: string): string {
  const version = describeDwgHeader(header)

  if (isLegacyDwgHeader(header)) {
    return (
      `libredwg returned no data for ${version}. ` +
      'This legacy DWG could not be opened by the current WASM converter. Re-save/export as DXF and re-upload.'
    )
  }

  if (isProbablyNewerDwgHeader(header)) {
    return (
      `libredwg returned no data for ${version}. ` +
      'The file appears newer than the currently supported conversion path. Re-save/export as DXF or DWG R2018 or earlier.'
    )
  }

  return (
    `libredwg returned no data for this DWG${header ? ` (${header})` : ''}. ` +
    'The file may be encrypted, a non-DWG file, corrupted, or unsupported by the current converter.'
  )
}

function pointFromUnknown(value: unknown): Pt | null {
  if (!value || typeof value !== 'object') return null
  const point = value as { x?: unknown; y?: unknown }
  const x = Number(point.x)
  const y = Number(point.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

function readEntityField(instance: LibreDwgInstance, entity: unknown, field: string): unknown {
  try {
    return instance.dwg_dynapi_entity_value?.(entity, field)?.data
  } catch {
    return undefined
  }
}

function readNumberEntityField(instance: LibreDwgInstance, entity: unknown, field: string, fallback = 0): number {
  const value = Number(readEntityField(instance, entity, field))
  return Number.isFinite(value) ? value : fallback
}

function normalizeDwgEntityType(instance: LibreDwgInstance, object: unknown, legacyDwg: boolean): string {
  try {
    const dxfName = instance.dwg_object_get_dxfname?.(object)
    if (dxfName) return dxfName.toUpperCase()
  } catch {
    // Some legacy objects do not expose a DXF name through this binding.
  }

  let fixedType: number | undefined
  try {
    const value = instance.dwg_object_get_fixedtype?.(object)
    fixedType = Number.isFinite(value) ? value : undefined
  } catch {
    fixedType = undefined
  }

  if (fixedType === undefined) return 'UNKNOWN'

  if (legacyDwg) {
    const legacyTypes: Record<number, string> = {
      1: 'LINE',
      3: 'CIRCLE',
      8: 'ARC',
      14: 'INSERT',
      19: 'POLYLINE2D',
      20: 'VERTEX',
    }
    const legacyType = legacyTypes[fixedType]
    if (legacyType) return legacyType
  }

  const standardTypes: Record<number, string> = {
    7: 'INSERT',
    15: 'POLYLINE2D',
    16: 'POLYLINE3D',
    17: 'ARC',
    18: 'CIRCLE',
    19: 'LINE',
    77: 'LWPOLYLINE',
  }
  return standardTypes[fixedType] ?? `TYPE_${fixedType}`
}

function resolveLegacyEntityObject(
  instance: LibreDwgInstance,
  data: unknown,
  entityPointer: unknown,
  diagnostics: DwgConversionDiagnostics,
): unknown {
  if (
    typeof entityPointer !== 'number' ||
    !instance.HEAPU32 ||
    typeof instance.dwg_get_object !== 'function'
  ) {
    return entityPointer
  }

  try {
    const objid = instance.HEAPU32[entityPointer >>> 2]
    const objectCount =
      typeof instance.dwg_get_num_objects === 'function'
        ? Number(instance.dwg_get_num_objects(data)) || 0
        : 0

    if (objectCount > 0 && objid >= objectCount) {
      return entityPointer
    }

    const object = instance.dwg_get_object(data, objid)
    if (object) {
      diagnostics.legacyEntityObjectResolutionCount =
        (diagnostics.legacyEntityObjectResolutionCount ?? 0) + 1
      return object
    }
  } catch {
    return entityPointer
  }

  return entityPointer
}

function legacyEntityToDwgEntity(
  instance: LibreDwgInstance,
  object: unknown,
  diagnostics: DwgConversionDiagnostics,
): DwgEntity | null {
  const type = normalizeDwgEntityType(instance, object, isLegacyDwgHeader(diagnostics.dwgHeader))
  diagnostics.legacyEntityTypeCounts = diagnostics.legacyEntityTypeCounts ?? {}
  diagnostics.legacyEntityTypeCounts[type] = (diagnostics.legacyEntityTypeCounts[type] ?? 0) + 1

  const entity = (() => {
    try {
      return instance.dwg_object_to_entity_tio?.(object) ?? object
    } catch {
      return object
    }
  })()

  switch (type) {
    case 'LINE': {
      const startPoint = pointFromUnknown(readEntityField(instance, entity, 'start'))
      const endPoint = pointFromUnknown(readEntityField(instance, entity, 'end'))
      if (!startPoint || !endPoint) return null
      return { type, startPoint, endPoint }
    }
    case 'CIRCLE': {
      const center = pointFromUnknown(readEntityField(instance, entity, 'center'))
      const radius = readNumberEntityField(instance, entity, 'radius', NaN)
      if (!center || !Number.isFinite(radius) || radius <= 0) return null
      return { type, center, radius }
    }
    case 'ARC': {
      const center = pointFromUnknown(readEntityField(instance, entity, 'center'))
      const radius = readNumberEntityField(instance, entity, 'radius', NaN)
      const startAngle = readNumberEntityField(instance, entity, 'start_angle', NaN)
      const endAngle = readNumberEntityField(instance, entity, 'end_angle', NaN)
      if (
        !center ||
        !Number.isFinite(radius) ||
        radius <= 0 ||
        !Number.isFinite(startAngle) ||
        !Number.isFinite(endAngle)
      ) {
        return null
      }
      return { type, center, radius, startAngle, endAngle }
    }
    case 'POLYLINE':
    case 'POLYLINE2D': {
      try {
        const rawVertices = instance.dwg_entity_polyline_2d_get_vertices?.(object) ?? []
        const vertices = rawVertices
          .map((vertex) => {
            const point = pointFromUnknown(vertex.point)
            if (!point) return null
            return {
              x: point.x,
              y: point.y,
              bulge: Number(vertex.bulge ?? 0) || 0,
            }
          })
          .filter((vertex): vertex is { x: number; y: number; bulge: number } => vertex !== null)
        if (vertices.length < 2) return null
        const flag = readNumberEntityField(instance, entity, 'flag', 0)
        return { type: 'POLYLINE2D', flag, vertices }
      } catch {
        return null
      }
    }
    default:
      return null
  }
}

function tryLegacyEntityTableFallback(
  instance: LibreDwgInstance,
  data: unknown,
  diagnostics: DwgConversionDiagnostics,
): ApiPolyline[] {
  if (typeof instance.dwg_get_num_entities !== 'function' || typeof instance.dwg_get_entity_index !== 'function') {
    diagnostics.legacyEntityFallbackStatus = 'not-available'
    return []
  }

  let count = 0
  try {
    count = Number(instance.dwg_get_num_entities(data)) || 0
    diagnostics.legacyEntityTableCount = count
  } catch (err) {
    diagnostics.legacyEntityFallbackStatus = 'failed'
    diagnostics.legacyEntityFallbackError = String(err)
    return []
  }

  if (count === 0) {
    diagnostics.legacyEntityFallbackStatus = 'empty'
    return []
  }

  const polylines: ApiPolyline[] = []
  try {
    for (let i = 0; i < count; i++) {
      const entityPointer = instance.dwg_get_entity_index(data, i)
      const object = resolveLegacyEntityObject(instance, data, entityPointer, diagnostics)
      if (!object) continue
      const entity = legacyEntityToDwgEntity(instance, object, diagnostics)
      if (!entity) continue
      const polyline = entityToPrimitivePolyline(entity)
      if (polyline && polyline.vertices.length >= 2) {
        polylines.push(polyline)
      }
    }
  } catch (err) {
    diagnostics.legacyEntityFallbackStatus = 'failed'
    diagnostics.legacyEntityFallbackError = String(err)
    return []
  }

  diagnostics.legacyEntityFallbackStatus = 'parsed'
  diagnostics.legacyEntityPolylineCount = polylines.length
  return polylines
}

function identityTransform(): EntityTransform {
  return { x: 0, y: 0, sx: 1, sy: 1, rotation: 0, baseX: 0, baseY: 0 }
}

function applyTransform(point: Pt, transform: EntityTransform): Pt {
  const localX = (point.x - transform.baseX) * transform.sx
  const localY = (point.y - transform.baseY) * transform.sy
  const cos = Math.cos(transform.rotation)
  const sin = Math.sin(transform.rotation)
  return {
    x: transform.x + localX * cos - localY * sin,
    y: transform.y + localX * sin + localY * cos,
  }
}

function transformPolyline(polyline: ApiPolyline, transform: EntityTransform): ApiPolyline {
  return {
    closed: polyline.closed,
    vertices: polyline.vertices.map(([x, y]) => {
      const p = applyTransform({ x, y }, transform)
      return [p.x, p.y]
    }),
  }
}

function composeInsertTransform(parent: EntityTransform, insert: DwgEntity, basePoint?: Pt): EntityTransform {
  const insertionPoint = pointFromUnknown(insert.insertionPoint) ?? { x: 0, y: 0 }
  const parentInsertion = applyTransform(insertionPoint, parent)
  return {
    x: parentInsertion.x,
    y: parentInsertion.y,
    sx: parent.sx * Number(insert.xScale ?? 1),
    sy: parent.sy * Number(insert.yScale ?? 1),
    rotation: parent.rotation + Number(insert.rotation ?? 0),
    baseX: basePoint?.x ?? 0,
    baseY: basePoint?.y ?? 0,
  }
}

/**
 * Expand a polyline with bulge values into a flat sequence of points.
 * Bulge = tan(theta / 4) where theta is the included arc angle. Negative bulge
 * means clockwise. Standard DXF/DWG curve representation for rounded slots, etc.
 */
function expandBulgePolyline(vertices: Array<{ x: number; y: number; bulge?: number }>, closed: boolean): Pt[] {
  const out: Pt[] = []
  const n = vertices.length
  if (n === 0) return out
  for (let i = 0; i < n; i++) {
    const v0 = vertices[i]
    const v1 = vertices[(i + 1) % n]
    out.push({ x: v0.x, y: v0.y })
    const isLast = i === n - 1
    if (isLast && !closed) break
    const bulge = v0.bulge ?? 0
    if (bulge === 0) continue
    const theta = 4 * Math.atan(bulge)
    const chordDx = v1.x - v0.x
    const chordDy = v1.y - v0.y
    const chordLen = Math.hypot(chordDx, chordDy)
    if (chordLen === 0) continue
    const radius = chordLen / (2 * Math.sin(Math.abs(theta) / 2))
    // Midpoint of chord
    const midX = (v0.x + v1.x) / 2
    const midY = (v0.y + v1.y) / 2
    // Perpendicular offset to arc center; sign comes from bulge sign
    const nx = -chordDy / chordLen
    const ny = chordDx / chordLen
    const offset = radius * Math.cos(theta / 2) * (bulge > 0 ? 1 : -1)
    const cx = midX + nx * offset
    const cy = midY + ny * offset
    const a0 = Math.atan2(v0.y - cy, v0.x - cx)
    const a1 = Math.atan2(v1.y - cy, v1.x - cx)
    let sweep = a1 - a0
    if (bulge > 0 && sweep < 0) sweep += Math.PI * 2
    if (bulge < 0 && sweep > 0) sweep -= Math.PI * 2
    for (let k = 1; k < ARC_SEGMENTS; k++) {
      const t = k / ARC_SEGMENTS
      const a = a0 + sweep * t
      out.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius })
    }
  }
  if (closed && out.length > 0) {
    out.push({ x: out[0].x, y: out[0].y })
  }
  return out
}

function entityToPrimitivePolyline(entity: DwgEntity): ApiPolyline | null {
  switch (entity.type) {
    case 'LINE': {
      const e = entity as unknown as { startPoint?: unknown; endPoint?: unknown }
      const startPoint = pointFromUnknown(e.startPoint)
      const endPoint = pointFromUnknown(e.endPoint)
      if (!startPoint || !endPoint) return null
      return {
        vertices: [
          [startPoint.x, startPoint.y],
          [endPoint.x, endPoint.y],
        ],
        closed: false,
      }
    }
    case 'CIRCLE': {
      const e = entity as unknown as { center?: unknown; radius?: unknown }
      const center = pointFromUnknown(e.center)
      const radius = Number(e.radius)
      if (!center || !Number.isFinite(radius) || radius <= 0) return null
      const v = circleVertices(center.x, center.y, radius)
      return { vertices: v.map((p) => [p.x, p.y]), closed: true }
    }
    case 'ARC': {
      const e = entity as unknown as { center?: unknown; radius?: unknown; startAngle?: unknown; endAngle?: unknown }
      const center = pointFromUnknown(e.center)
      const radius = Number(e.radius)
      const startAngle = Number(e.startAngle)
      const endAngle = Number(e.endAngle)
      if (
        !center ||
        !Number.isFinite(radius) ||
        radius <= 0 ||
        !Number.isFinite(startAngle) ||
        !Number.isFinite(endAngle)
      ) {
        return null
      }
      const v = arcVertices(center.x, center.y, radius, startAngle, endAngle)
      return { vertices: v.map((p) => [p.x, p.y]), closed: false }
    }
    case 'LWPOLYLINE': {
      const e = entity as unknown as {
        flag?: number
        vertices: Array<{ x: number; y: number; bulge?: number }>
      }
      const closed = ((e.flag ?? 0) & 1) === 1
      const v = expandBulgePolyline(e.vertices ?? [], closed)
      return { vertices: v.map((p) => [p.x, p.y]), closed }
    }
    case 'POLYLINE2D': {
      const e = entity as unknown as {
        flag?: number
        vertices: Array<{ x: number; y: number; bulge?: number }>
      }
      const closed = ((e.flag ?? 0) & 1) === 1
      const v = expandBulgePolyline(e.vertices ?? [], closed)
      return { vertices: v.map((p) => [p.x, p.y]), closed }
    }
    default:
      return null
  }
}

function entityToPolylines(
  entity: DwgEntity,
  transform: EntityTransform,
  blocksByName: Map<string, DwgBlockRecord>,
  budget: ExpandBudget,
  visited: Set<string>,
  depth = 0,
): ApiPolyline[] {
  if (budget.exceeded) return []

  if (entity.type === 'INSERT') {
    if (depth > 6) return []
    const blockName = typeof entity.name === 'string' ? entity.name : ''
    // Cycle guard: a block that INSERTs itself (directly or transitively) would
    // otherwise recurse until the depth cap on every node — bail on revisit.
    if (!blockName || visited.has(blockName)) return []
    const block = blocksByName.get(blockName)
    if (!block?.entities?.length) return []
    const insertTransform = composeInsertTransform(transform, entity, block.basePoint)
    const rowCount = Math.min(MAX_INSERT_REPEAT, Math.max(1, Number(entity.rowCount ?? 1) || 1))
    const columnCount = Math.min(MAX_INSERT_REPEAT, Math.max(1, Number(entity.columnCount ?? 1) || 1))
    const rowSpacing = Number(entity.rowSpacing ?? 0) || 0
    const columnSpacing = Number(entity.columnSpacing ?? 0) || 0
    const out: ApiPolyline[] = []
    const nextVisited = new Set(visited).add(blockName)

    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        if (budget.exceeded) return out
        const repeatedTransform = {
          ...insertTransform,
          x: insertTransform.x + col * columnSpacing * insertTransform.sx,
          y: insertTransform.y + row * rowSpacing * insertTransform.sy,
        }
        for (const child of block.entities) {
          out.push(...entityToPolylines(child, repeatedTransform, blocksByName, budget, nextVisited, depth + 1))
          if (budget.exceeded) return out
        }
      }
    }
    return out
  }

  const primitive = entityToPrimitivePolyline(entity)
  if (!primitive) return []
  budget.polylines += 1
  budget.vertices += primitive.vertices.length
  if (budget.polylines > MAX_OUTPUT_POLYLINES || budget.vertices > MAX_OUTPUT_VERTICES) {
    budget.exceeded = true
  }
  return [transformPolyline(primitive, transform)]
}

function isClosedDxfPolyline(vertices: Array<[number, number]>): boolean {
  if (vertices.length < 3) return false
  const first = vertices[0]
  const last = vertices[vertices.length - 1]
  return Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6
}

async function parseDxfPolylines(dxfText: string): Promise<ApiPolyline[]> {
  const dxfModule = await import('dxf')
  const helper = new dxfModule.Helper(dxfText)
  const result = helper.toPolylines()

  return result.polylines
    .map((polyline) => {
      const vertices = polyline.vertices
        .map((vertex) => [Number(vertex[0]), Number(vertex[1])] as [number, number])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))

      return {
        vertices,
        closed: isClosedDxfPolyline(vertices),
      }
    })
    .filter((polyline) => polyline.vertices.length >= 2)
}

async function tryDxfWriterFallback(
  instance: LibreDwgInstance,
  buffer: ArrayBuffer,
  diagnostics: DwgConversionDiagnostics,
): Promise<ApiPolyline[]> {
  if (typeof instance.dwg_write_dxf !== 'function') {
    diagnostics.dxfFallbackStatus = 'not-available'
    return []
  }

  let dxfBytes: Uint8Array | null
  try {
    dxfBytes = instance.dwg_write_dxf(buffer)
  } catch (err) {
    diagnostics.dxfFallbackStatus = 'failed'
    diagnostics.dxfFallbackError = String(err)
    return []
  }

  if (!dxfBytes || dxfBytes.length === 0) {
    diagnostics.dxfFallbackStatus = 'no-output'
    return []
  }

  try {
    const dxfText = new TextDecoder().decode(dxfBytes)
    const polylines = await parseDxfPolylines(dxfText)
    diagnostics.dxfFallbackStatus = 'parsed'
    diagnostics.dxfFallbackPolylineCount = polylines.length
    return polylines
  } catch (err) {
    diagnostics.dxfFallbackStatus = 'failed'
    diagnostics.dxfFallbackError = String(err)
    return []
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  if (isRateLimited(ip)) {
    return Response.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    )
  }
  if (activeParses >= MAX_CONCURRENT_PARSES) {
    return Response.json(
      { error: 'Server is busy converting other files. Please retry in a moment.' },
      { status: 503 },
    )
  }
  activeParses++
  try {
    return await handleDwgConversion(req)
  } finally {
    activeParses--
  }
}

async function handleDwgConversion(req: NextRequest): Promise<Response> {
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength && contentLength > MAX_DWG_BYTES) {
    return Response.json(
      { error: `DWG too large. Max ${MAX_DWG_BYTES / 1024 / 1024}MB.` },
      { status: 413 },
    )
  }

  let file: File | null = null
  try {
    const form = await req.formData()
    const entry = form.get('file')
    if (entry instanceof File) file = entry
  } catch {
    return Response.json({ error: 'Invalid multipart body.' }, { status: 400 })
  }

  if (!file) {
    return Response.json({ error: 'Missing "file" field.' }, { status: 400 })
  }
  if (file.size > MAX_DWG_BYTES) {
    return Response.json(
      { error: `DWG too large. Max ${MAX_DWG_BYTES / 1024 / 1024}MB.` },
      { status: 413 },
    )
  }

  const buffer = await file.arrayBuffer()
  const dwgHeader = readDwgVersionHeader(buffer)
  const diagnostics: DwgConversionDiagnostics = {
    dwgHeader: dwgHeader || undefined,
    dwgVersion: describeDwgHeader(dwgHeader),
  }

  let mod: LibreDwgModule
  let instance: LibreDwgInstance & LibreDwgWasm
  try {
    const res = await getLibreDwg()
    mod = res.mod
    instance = res.instance
  } catch (err) {
    return Response.json(
      { error: 'DWG converter failed to initialize.', detail: String(err) },
      { status: 500 },
    )
  }

  let dwgPtr: unknown
  try {
    dwgPtr = instance.dwg_read_data(buffer, mod.Dwg_File_Type.DWG)
  } catch (err) {
    return Response.json(
      { error: 'DWG parse threw.', detail: String(err) },
      { status: 422 },
    )
  }
  if (!dwgPtr) {
    return Response.json(
      {
        error: noDwgDataErrorMessage(dwgHeader),
        diagnostics,
      },
      { status: 422 },
    )
  }

  let db: DwgDatabase
  let legacyEntityPolylines: ApiPolyline[] = []
  try {
    try {
      const version = instance.dwg_get_version_type?.(dwgPtr)
      diagnostics.dwgHeader = version?.hdr ?? diagnostics.dwgHeader
      diagnostics.dwgVersion = describeDwgVersionInfo(version) ?? diagnostics.dwgVersion
      diagnostics.dwgVersionType = version?.type
    } catch {
      // The header bytes above are enough for user-facing diagnostics.
    }

    try {
      const modelSpaceObjects = instance.dwg_getall_entities_in_model_space?.(dwgPtr)
      diagnostics.modelSpaceObjectCount = Array.isArray(modelSpaceObjects)
        ? modelSpaceObjects.length
        : undefined
    } catch {
      // Older DWG layouts can fail this low-level scan; conversion below is authoritative.
    }

    if (typeof instance.convertEx === 'function') {
      const converted = instance.convertEx(dwgPtr)
      db = converted.database
      diagnostics.unknownEntityCount = converted.stats?.unknownEntityCount
    } else {
      db = instance.convert(dwgPtr)
    }

    if ((db.entities?.length ?? 0) === 0) {
      legacyEntityPolylines = tryLegacyEntityTableFallback(instance, dwgPtr, diagnostics)
    }
  } catch (err) {
    return Response.json(
      { error: 'DWG conversion to database failed.', detail: String(err), diagnostics },
      { status: 422 },
    )
  } finally {
    if (typeof instance.dwg_free === 'function') {
      try { instance.dwg_free(dwgPtr) } catch { /* best-effort cleanup */ }
    }
  }

  const entities = db.entities ?? []
  const blockRecords = db.tables?.BLOCK_RECORD?.entries ?? []
  diagnostics.blockRecordCount = blockRecords.length
  const blocksByName = new Map<string, DwgBlockRecord>()
  for (const block of blockRecords) {
    if (block.name && block.entities?.length) {
      blocksByName.set(block.name, block)
    }
  }

  const polylines: ApiPolyline[] = []
  const typeCounts: Record<string, number> = {}
  const skippedTypes = new Set<string>()
  let paperSpaceCount = 0
  const budget: ExpandBudget = { polylines: 0, vertices: 0, exceeded: false }
  for (const ent of entities) {
    typeCounts[ent.type] = (typeCounts[ent.type] ?? 0) + 1
    if (ent.isInPaperSpace) {
      paperSpaceCount++
      continue
    }
    const entityPolylines = entityToPolylines(ent, identityTransform(), blocksByName, budget, new Set())
    for (const pl of entityPolylines) {
      if (pl.vertices.length >= 2) {
        polylines.push(pl)
      }
    }
    if (entityPolylines.length === 0 && ent.type !== 'ATTRIB') {
      skippedTypes.add(ent.type)
    }
    if (budget.exceeded) break
  }

  if (budget.exceeded) {
    return Response.json(
      {
        error:
          'This DWG is too complex to render (too many entities or deeply nested blocks). Please simplify it or export it as DXF and re-upload.',
      },
      { status: 422 },
    )
  }

  if (polylines.length === 0) {
    diagnostics.typeCounts = typeCounts
    diagnostics.paperSpaceCount = paperSpaceCount
    diagnostics.totalEntities = entities.length
    diagnostics.skippedTypes = Array.from(skippedTypes)

    if (legacyEntityPolylines.length > 0) {
      return Response.json({
        polylines: legacyEntityPolylines,
        skippedTypes: Array.from(skippedTypes),
        diagnostics,
      })
    }

    const fallbackPolylines = await tryDxfWriterFallback(instance, buffer, diagnostics)
    if (fallbackPolylines.length > 0) {
      return Response.json({
        polylines: fallbackPolylines,
        skippedTypes: Array.from(skippedTypes),
        diagnostics,
      })
    }

    // Useful diagnostics: tell the client exactly what's in the file. The
    // 99% case of "no polylines" is the part being drawn in paper space, or
    // all entities being SPLINE/INSERT/etc. that we don't yet expand.
    return Response.json(
      {
        error:
          entities.length === 0
            ? zeroEntityErrorMessage(diagnostics)
            : `Parsed ${entities.length} entities but none could be rendered. Types: ${JSON.stringify(typeCounts)}. Paper-space entities: ${paperSpaceCount}.`,
        diagnostics,
      },
      { status: 422 },
    )
  }

  return Response.json({ polylines, skippedTypes: Array.from(skippedTypes) })
}
