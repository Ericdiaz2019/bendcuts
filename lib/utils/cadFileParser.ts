import { BufferGeometry, Vector3, BufferAttribute, Box3 } from 'three'
import type {
  BendFeature,
  CADAnalysis,
  CADFileType,
  CADPreviewKind,
  EndCutFeature,
  Feature,
  HoleFeature,
} from '@/lib/types/configuration'
import { ACCEPTED_CAD_EXTENSIONS, getCadFormatCapability } from '@/lib/cad/formatCapabilities'
import { computeFileHash } from '@/lib/cad/fileHash'
import type { ParsedGeometry } from '@/lib/cad/types'
import { buildManualReviewGeometry } from '@/lib/cad/formats/manualReview'
import { parseIllustrator } from '@/lib/cad/formats/illustrator'
import { parseDwg } from '@/lib/cad/formats/dwg'
import { buildExtrudedSheetMeshes, boundingBoxOfPolylines } from '@/lib/cad/formats/extrudedSheet'

/** Default preview thickness for flat-sheet extrusion when no gauge is known yet.
 * 2mm reads as a believable sheet-metal slab at typical part scales without
 * dominating the silhouette. The geometry can be rebuilt on gauge change. */
const DEFAULT_SHEET_PREVIEW_THICKNESS_MM = 2

export type { ParsedGeometry } from '@/lib/cad/types'

// Import CAD parsing libraries
// Note: occt-import-js is imported dynamically to avoid SSR issues
interface OcctMeshData {
  attributes?: {
    position?: { array: ArrayLike<number> }
    normal?: { array: ArrayLike<number> }
  }
  index?: { array: ArrayLike<number> }
  name?: string
}

interface OcctParseResult {
  success?: boolean
  errorText?: string
  meshes?: OcctMeshData[]
  root?: {
    vertices?: number[]
    indices?: number[]
  }
}

interface OcctTriangulationParams {
  linearUnit: 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot'
  linearDeflectionType: 'bounding_box_ratio' | 'absolute_value'
  linearDeflection: number
  angularDeflection: number
}

interface OcctImporter {
  ReadStepFile(content: Uint8Array, params: OcctTriangulationParams): OcctParseResult
  ReadIgesFile(content: Uint8Array, params: OcctTriangulationParams): OcctParseResult
}

interface RawBendGeometry {
  center: Vector3
  axis: Vector3
  majorRadius: number
  /** True sweep angle in radians (from torus face topology), when extractable. */
  sweepAngleRad?: number
}

interface RawHoleGeometry {
  center: Vector3
  axis: Vector3
  diameter: number
  /** True axial extent in source units (from cylinder face topology), when extractable. */
  axialLength?: number
}

interface StepTubeFeatureAnalysis {
  bendCount: number | null
  bendConfidence: number
  bendMethod: string
  cutCount: number
  cutConfidence: number
  cutMethod: string
  toroidalSurfaceCount: number
  cylindricalSurfaceCount: number
  smallCylindricalGroupCount: number
  laserFeatureCount: number
  solidBodyCount: number
  partShape: 'tube' | 'sheet-bracket' | 'flat-sheet' | 'unknown'
  /** Per-bend geometry, one entry per detected torus group. */
  bendGeometries: RawBendGeometry[]
  /** Per-hole geometry, one entry per detected laser-feature cylinder group. */
  holeGeometries: RawHoleGeometry[]
}

interface StepTorusSurface {
  entityId: string
  center: Vector3
  axis: Vector3
  majorRadius: number
  minorRadius: number
  sweepAngleRad?: number
}

interface StepTorusGroup {
  center: Vector3
  axis: Vector3
  majorRadius: number
  surfaces: StepTorusSurface[]
}

interface StepCylinderSurface {
  entityId: string
  center: Vector3
  axis: Vector3
  radius: number
  axialLength?: number
}

interface StepCylinderGroup {
  center: Vector3
  axis: Vector3
  radius: number
  surfaces: StepCylinderSurface[]
}

let occtInstance: OcctImporter | null = null
const CAD_DEBUG = process.env.NEXT_PUBLIC_CAD_DEBUG === 'true'

function cadDebugLog(...args: unknown[]): void {
  if (CAD_DEBUG) {
    console.log(...args)
  }
}

function cadDebugWarn(...args: unknown[]): void {
  if (CAD_DEBUG) {
    console.warn(...args)
  }
}

interface CADParserOptions {
  scale?: number
  centerGeometry?: boolean
}

/**
 * Unit conversion factors to millimeters (base unit)
 */
const UNIT_CONVERSION_TO_MM: Record<string, number> = {
  // Metric units
  'metre': 1000,
  'meter': 1000,
  'm': 1000,
  'millimetre': 1,
  'millimeter': 1,
  'mm': 1,
  'centimetre': 10,
  'centimeter': 10,
  'cm': 10,
  'micrometre': 0.001,
  'micrometer': 0.001,
  'μm': 0.001,
  'nanometre': 0.000001,
  'nanometer': 0.000001,
  'nm': 0.000001,
  
  // Imperial units
  'inch': 25.4,
  'in': 25.4,
  '"': 25.4,
  'foot': 304.8,
  'ft': 304.8,
  "'": 304.8,
  'yard': 914.4,
  'yd': 914.4,
  
  // Special STEP file notations
  '.metre.': 1000,
  '.milli.': 1,
  '.millimetre.': 1,
  '.inch.': 25.4,
  
  // Default fallbacks
  'unknown': 1,
  '': 1
}

/**
 * Parse units directly from STEP file content
 */
async function parseUnitsFromStepFile(file: File): Promise<string | null> {
  try {
    // Read enough header/data context to include STEP unit assignments from common exporters.
    const chunk = file.slice(0, 65536)
    const text = await chunk.text()

    // Many CAD exporters define inches as a conversion-based length unit while
    // also including SI metre helper units. Prefer the explicit converted
    // length unit when it is present.
    const conversionBasedLengthUnitPattern = /CONVERSION_BASED_UNIT\s*\(\s*'([^']+)'\s*,[\s\S]*?\)\s*LENGTH_UNIT\s*\(\s*\)/gi
    const conversionMatches = text.matchAll(conversionBasedLengthUnitPattern)
    for (const match of conversionMatches) {
      if (match[1]) {
        const unit = normalizeUnitName(match[1])
        if (unit in UNIT_CONVERSION_TO_MM) {
          cadDebugLog('Found STEP conversion-based length unit:', unit)
          return unit
        }
      }
    }
    
    // Look for SI_UNIT patterns in STEP file
    const siUnitPatterns = [
      /SI_UNIT\s*\(\s*[$*]\s*,\s*\.([^,)]+)\.\s*\)\s*LENGTH_UNIT\s*\(\s*\)/gi,
      /SI_UNIT\s*\(\s*\*\s*,\s*\.([^,)]+)\.\s*,/gi,
      /SI_UNIT\s*\(\s*\*\s*,\s*([^,)]+)\s*,/gi,
      /LENGTH_UNIT\s*\(\s*\)\s*,\s*\.([^,)]+)\./gi,
      /UNIT\s*\(\s*LENGTH_MEASURE\s*,\s*\.([^,)]+)\./gi
    ]
    
    for (const pattern of siUnitPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          let unit = match[1].toLowerCase().trim()
          // Remove dots and normalize
          unit = unit.replace(/\./g, '')
          
          cadDebugLog('Found STEP unit from file parsing:', unit)
          
          // Map common STEP unit variations
          const unitMapping: Record<string, string> = {
            'milli': 'millimeter',
            'millimetre': 'millimeter', 
            'metre': 'meter',
            'inch': 'inch',
            'foot': 'foot'
          }
          
          return unitMapping[unit] || unit
        }
      }
    }
    
    // Look for UNCERTAINTY_MEASURE_WITH_UNIT patterns which often contain unit info
    const uncertaintyPattern = /UNCERTAINTY_MEASURE_WITH_UNIT[^(]*\([^,]*,\s*\.([^,)]+)\./gi
    const uncertaintyMatches = text.matchAll(uncertaintyPattern)
    for (const match of uncertaintyMatches) {
      if (match[1]) {
        const unit = match[1].toLowerCase().replace(/\./g, '').trim()
        cadDebugLog('Found STEP unit from uncertainty measure:', unit)
        return unit === 'milli' ? 'millimeter' : unit
      }
    }
    
    return null
  } catch (error) {
    cadDebugWarn('Failed to parse units from STEP file:', error)
    return null
  }
}

/**
 * Normalize unit names to standard forms
 */
function normalizeUnitName(unit: string): string {
  const normalized = unit.toLowerCase().trim().replace(/\./g, '')
  
  const unitMappings: Record<string, string> = {
    'milli': 'millimeter',
    'millimetre': 'millimeter',
    'mm': 'millimeter',
    'metre': 'meter', 
    'm': 'meter',
    'centimetre': 'centimeter',
    'cm': 'centimeter',
    'in': 'inch',
    '"': 'inch',
    'ft': 'foot',
    "'": 'foot',
    'yd': 'yard'
  }
  
  return unitMappings[normalized] || normalized
}

function parseStepNumber(value: string): number | null {
  const parsed = Number(value.trim().replace(/d/gi, 'e'))
  return Number.isFinite(parsed) ? parsed : null
}

function parseStepEntities(text: string): Map<string, string> {
  const entities = new Map<string, string>()
  const entityPattern = /#(\d+)\s*=\s*([\s\S]*?);/g

  for (const match of text.matchAll(entityPattern)) {
    entities.set(match[1], match[2].replace(/\s+/g, ' ').trim())
  }

  return entities
}

function parseStepNumericTuple(entity: string): Vector3 | null {
  const tupleMatches = [...entity.matchAll(/\(([^()]*)\)/g)]

  for (let i = tupleMatches.length - 1; i >= 0; i--) {
    const values = tupleMatches[i][1]
      .split(',')
      .map(part => parseStepNumber(part))
      .filter((value): value is number => value !== null)

    if (values.length >= 3) {
      return new Vector3(values[0], values[1], values[2])
    }
  }

  return null
}

function resolveStepVector(entities: Map<string, string>, id: string): Vector3 | null {
  const entity = entities.get(id)
  return entity ? parseStepNumericTuple(entity) : null
}

/**
 * STEP topology helpers — used to derive per-feature dimensions (bend sweep
 * angle, cylinder axial extent) that the surface entities alone don't carry.
 *
 * The strategy is deliberately coarse: instead of walking the full topology
 * graph (FACE_OUTER_BOUND → EDGE_LOOP → ORIENTED_EDGE → EDGE_CURVE → VERTEX_POINT),
 * we find every ADVANCED_FACE referencing the surface and recursively collect
 * the CARTESIAN_POINTs reachable from each face. Those points sit on the
 * surface's boundary edges; their projection onto the relevant axis/plane
 * gives the dimension we need with sane fallbacks when STEP gets weird.
 */

function extractEntityRefs(entityText: string): string[] {
  return Array.from(entityText.matchAll(/#(\d+)/g), m => m[1])
}

/**
 * Recursive walk: starting from a face id, collect every CARTESIAN_POINT
 * reachable via #refs. Bounded by maxDepth and a visited set so degenerate
 * STEP files can't blow the stack.
 */
function collectCartesianPointsBelow(
  entities: Map<string, string>,
  rootId: string,
  maxDepth = 8
): Vector3[] {
  const visited = new Set<string>()
  const points: Vector3[] = []
  const stack: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }]

  while (stack.length) {
    const next = stack.pop()
    if (!next) break
    const { id, depth } = next
    if (visited.has(id) || depth > maxDepth) continue
    visited.add(id)
    const text = entities.get(id)
    if (!text) continue

    if (/^CARTESIAN_POINT\b/i.test(text)) {
      const tuple = parseStepNumericTuple(text)
      if (tuple) points.push(tuple)
      continue // leaves
    }

    // DIRECTION tuples are unit vectors, not positions — skip so they can't
    // pollute the in-plane projection.
    if (/^DIRECTION\b/i.test(text)) continue

    for (const ref of extractEntityRefs(text)) {
      if (!visited.has(ref)) stack.push({ id: ref, depth: depth + 1 })
    }
  }
  return points
}

/**
 * Build a one-shot index of `surfaceId → [faceId, ...]` from every
 * ADVANCED_FACE entity. Saves us from scanning the entity map once per surface
 * later — on large parts the loop-over-surfaces × loop-over-entities cost adds
 * up to noticeable parse latency, and the index is amortizing free.
 */
function buildFaceIndex(entities: Map<string, string>): Map<string, string[]> {
  const index = new Map<string, string[]>()
  // ADVANCED_FACE('name', (#b1, #b2, ...), #SURFACE_ID, .T.|.F.)
  // The surface id sits between the bound-list close-paren and the orientation flag.
  const pattern = /ADVANCED_FACE\b[^;]*\)\s*,\s*#(\d+)\s*,\s*\.[TF]\./i
  for (const [id, text] of entities) {
    const m = text.match(pattern)
    if (!m) continue
    const surfaceId = m[1]
    const list = index.get(surfaceId)
    if (list) list.push(id)
    else index.set(surfaceId, [id])
  }
  return index
}

/**
 * Span (in radians) of a set of angles around a circle. Sorts the angles,
 * finds the largest gap on the ring, and returns `2π − largest_gap`. This
 * correctly handles arcs that wrap the 0/2π boundary (e.g., points at 350°
 * and 10° = 20° span, not 340°).
 */
function arcSpanFromAngles(angles: number[]): number | null {
  const unique = Array.from(new Set(angles.map(a => Math.round(a * 1000) / 1000)))
  if (unique.length < 2) return null
  unique.sort((a, b) => a - b)

  let maxGap = 0
  for (let i = 1; i < unique.length; i++) {
    maxGap = Math.max(maxGap, unique[i] - unique[i - 1])
  }
  // Wrap gap — from last angle around back to first.
  maxGap = Math.max(maxGap, 2 * Math.PI - (unique[unique.length - 1] - unique[0]))

  return 2 * Math.PI - maxGap
}

/** Pick an arbitrary unit vector orthogonal to `axis`. */
function orthogonalTo(axis: Vector3): Vector3 {
  const ax = Math.abs(axis.x)
  const ay = Math.abs(axis.y)
  const az = Math.abs(axis.z)
  const helper =
    ax < ay && ax < az
      ? new Vector3(1, 0, 0)
      : ay < az
        ? new Vector3(0, 1, 0)
        : new Vector3(0, 0, 1)
  return new Vector3().crossVectors(axis, helper).normalize()
}

/**
 * Sweep angle of a torus (radians), from the cartesian points used by faces
 * referencing it. Each point is projected onto the plane perpendicular to the
 * torus axis through its center; the resulting in-plane angle is collected,
 * and the span of those angles is the sweep.
 */
function extractTorusSweepAngle(
  entities: Map<string, string>,
  faceIds: string[],
  center: Vector3,
  axis: Vector3
): number | null {
  if (!faceIds.length) return null

  const inPlaneRef = orthogonalTo(axis)
  const inPlaneOther = new Vector3().crossVectors(axis, inPlaneRef).normalize()

  const angles: number[] = []
  for (const faceId of faceIds) {
    const points = collectCartesianPointsBelow(entities, faceId)
    for (const p of points) {
      const local = p.clone().sub(center)
      local.sub(axis.clone().multiplyScalar(local.dot(axis))) // project to plane
      if (local.lengthSq() < 1e-6) continue
      const u = local.dot(inPlaneRef)
      const v = local.dot(inPlaneOther)
      angles.push(Math.atan2(v, u))
    }
  }
  return arcSpanFromAngles(angles)
}

/**
 * Axial extent of a cylinder along its axis (in source units), from cartesian
 * points used by faces referencing it. Returns the min/max axial offsets from
 * the cylinder's reference center; `max - min` is the cylinder's depth/length.
 */
function extractCylinderAxialExtent(
  entities: Map<string, string>,
  faceIds: string[],
  center: Vector3,
  axis: Vector3
): { min: number; max: number } | null {
  if (!faceIds.length) return null

  let min = Infinity
  let max = -Infinity
  for (const faceId of faceIds) {
    const points = collectCartesianPointsBelow(entities, faceId)
    for (const p of points) {
      const axial = p.clone().sub(center).dot(axis)
      if (axial < min) min = axial
      if (axial > max) max = axial
    }
  }
  if (!isFinite(min) || !isFinite(max) || max - min < 1e-6) return null
  return { min, max }
}

function resolveStepAxisPlacement(
  entities: Map<string, string>,
  id: string
): { center: Vector3; axis: Vector3 } | null {
  const axisPlacement = entities.get(id)
  const refs = axisPlacement?.match(/AXIS2_PLACEMENT_3D\s*\(\s*'[^']*'\s*,\s*#(\d+)(?:\s*,\s*#(\d+))?(?:\s*,\s*#(\d+))?/i)

  if (!refs) {
    return null
  }

  const center = resolveStepVector(entities, refs[1])
  if (!center) {
    return null
  }

  const axis = refs[2] ? resolveStepVector(entities, refs[2]) : new Vector3(0, 0, 1)
  if (!axis || axis.lengthSq() < 1e-12) {
    return { center, axis: new Vector3(0, 0, 1) }
  }

  return { center, axis: axis.normalize() }
}

function groupStepCylinderSurfaces(
  surfaces: StepCylinderSurface[],
  centerTolerance: number,
  radiusTolerance: number
): StepCylinderGroup[] {
  const groups: StepCylinderGroup[] = []

  for (const surface of surfaces) {
    const group = groups.find(candidate => {
      const axesAligned = Math.abs(candidate.axis.dot(surface.axis)) > 0.97
      // Project the center difference onto the axis to allow surfaces stacked
      // along a shared axis (typical of inside/outside bend faces) to merge.
      const offset = candidate.center.clone().sub(surface.center)
      const offAxis = offset.clone().sub(candidate.axis.clone().multiplyScalar(offset.dot(candidate.axis)))
      const centersMatch = offAxis.length() <= centerTolerance
      const radiiMatch = Math.abs(candidate.radius - surface.radius) <= radiusTolerance
      return axesAligned && centersMatch && radiiMatch
    })

    if (group) {
      group.surfaces.push(surface)
    } else {
      groups.push({
        center: surface.center.clone(),
        axis: surface.axis.clone(),
        radius: surface.radius,
        surfaces: [surface]
      })
    }
  }

  return groups
}

function groupStepTorusSurfaces(surfaces: StepTorusSurface[]): StepTorusGroup[] {
  if (surfaces.length === 0) {
    return []
  }

  const sortedRadii = surfaces.map(surface => surface.majorRadius).sort((a, b) => a - b)
  const medianMajorRadius = sortedRadii[Math.floor(sortedRadii.length / 2)] || 1
  const centerTolerance = Math.max(1e-4, medianMajorRadius * 0.01)
  const radiusTolerance = Math.max(1e-4, medianMajorRadius * 0.02)

  const groups: StepTorusGroup[] = []

  for (const surface of surfaces) {
    const group = groups.find(candidate => {
      const axesAligned = Math.abs(candidate.axis.dot(surface.axis)) > 0.98
      const centersMatch = candidate.center.distanceTo(surface.center) <= centerTolerance
      const radiiMatch = Math.abs(candidate.majorRadius - surface.majorRadius) <= radiusTolerance
      return axesAligned && centersMatch && radiiMatch
    })

    if (group) {
      group.surfaces.push(surface)
    } else {
      groups.push({
        center: surface.center.clone(),
        axis: surface.axis.clone(),
        majorRadius: surface.majorRadius,
        surfaces: [surface]
      })
    }
  }

  return groups
}

async function analyzeStepTubeFeatures(
  file: File,
  boundingSize?: Vector3
): Promise<StepTubeFeatureAnalysis | null> {
  try {
    const text = await file.text()
    const entities = parseStepEntities(text)
    const faceIndex = buildFaceIndex(entities)
    const torusSurfaces: StepTorusSurface[] = []
    const cylinderSurfaces: StepCylinderSurface[] = []

    for (const [entityId, entity] of entities.entries()) {
      const torusMatch = entity.match(/TOROIDAL_SURFACE\s*\(\s*'[^']*'\s*,\s*#(\d+)\s*,\s*([-+0-9.EeDd]+)\s*,\s*([-+0-9.EeDd]+)/i)
      if (torusMatch) {
        const placement = resolveStepAxisPlacement(entities, torusMatch[1])
        const majorRadius = parseStepNumber(torusMatch[2])
        const minorRadius = parseStepNumber(torusMatch[3])
        if (placement && majorRadius !== null && minorRadius !== null && majorRadius > 0 && minorRadius > 0) {
          const sweepAngleRad = extractTorusSweepAngle(
            entities,
            faceIndex.get(entityId) ?? [],
            placement.center,
            placement.axis,
          ) ?? undefined
          torusSurfaces.push({
            entityId,
            center: placement.center,
            axis: placement.axis,
            majorRadius,
            minorRadius,
            sweepAngleRad,
          })
        }
        continue
      }

      const cylinderMatch = entity.match(/CYLINDRICAL_SURFACE\s*\(\s*'[^']*'\s*,\s*#(\d+)\s*,\s*([-+0-9.EeDd]+)/i)
      if (cylinderMatch) {
        const placement = resolveStepAxisPlacement(entities, cylinderMatch[1])
        const radius = parseStepNumber(cylinderMatch[2])
        if (placement && radius !== null && radius > 0) {
          const extent = extractCylinderAxialExtent(
            entities,
            faceIndex.get(entityId) ?? [],
            placement.center,
            placement.axis,
          )
          const axialLength = extent ? extent.max - extent.min : undefined
          cylinderSurfaces.push({
            entityId,
            center: placement.center,
            axis: placement.axis,
            radius,
            axialLength,
          })
        }
      }
    }

    const solidBodyCount = [...entities.values()].filter(entity => (
      /\bMANIFOLD_SOLID_BREP\b/i.test(entity) || /\bBREP_WITH_VOIDS\b/i.test(entity)
    )).length

    // Toroidal surfaces represent draw-bent tube radii.
    const tubeLikeTori = torusSurfaces.filter(surface => surface.majorRadius >= surface.minorRadius * 1.25)
    const torusGroups = groupStepTorusSurfaces(tubeLikeTori)
    const supportedTorusGroups = torusGroups.filter(group => group.surfaces.length >= 2)
    const torusBendCount = supportedTorusGroups.length > 0
      ? supportedTorusGroups.length
      : (torusGroups.length > 0 ? torusGroups.length : 0)
    const torusBendConfidence = torusBendCount === 0
      ? 0
      : supportedTorusGroups.length === torusGroups.length
        ? 0.92
        : 0.72

    // Sheet metal bends manifest as cylindrical surfaces (one inside, one outside)
    // sharing an axis with a small radius relative to the part. Holes also create
    // cylindrical surfaces, so we filter by radius vs bounding-box and by axis
    // orientation: bend cylinders run parallel to the part's primary face, while
    // hole cylinders run perpendicular to a sheet face (~through-thickness).
    const partMaxDim = boundingSize ? Math.max(boundingSize.x, boundingSize.y, boundingSize.z) : 0
    const partMinDim = boundingSize
      ? Math.min(
          Math.max(boundingSize.x, 1e-3),
          Math.max(boundingSize.y, 1e-3),
          Math.max(boundingSize.z, 1e-3)
        )
      : 0
    const slenderRatio = partMinDim > 0 ? partMaxDim / partMinDim : 0
    // Identify the thickness axis for sheet-like parts (the smallest bounding-box dim)
    const dimEntries: Array<{ axis: Vector3; size: number }> = boundingSize
      ? [
          { axis: new Vector3(1, 0, 0), size: Math.abs(boundingSize.x) },
          { axis: new Vector3(0, 1, 0), size: Math.abs(boundingSize.y) },
          { axis: new Vector3(0, 0, 1), size: Math.abs(boundingSize.z) },
        ].sort((a, b) => a.size - b.size)
      : []
    const thicknessAxis = dimEntries[0]?.axis ?? null
    const partThickness = dimEntries[0]?.size ?? 0
    // Sheet bend cylinders: small radius (relative to part) and axis NOT through thickness.
    const sheetBendCandidates = cylinderSurfaces.filter(surface => {
      if (!boundingSize) return false
      // Bend radii are typically <= 1× the sheet thickness for thin gauges,
      // and never larger than ~25% of the part's largest dimension.
      const radiusInRange = surface.radius > 0 && surface.radius <= partMaxDim * 0.25
      if (!radiusInRange) return false
      if (thicknessAxis) {
        const thicknessAlignment = Math.abs(surface.axis.dot(thicknessAxis))
        // If axis is mostly parallel to thickness, this is a hole — skip.
        if (thicknessAlignment > 0.7) return false
      }
      return true
    })
    const bendCenterTol = Math.max(partMinDim * 0.5, partMaxDim * 0.05, 1)
    const bendRadiusTol = Math.max(partThickness * 0.5, 0.5)
    const sheetBendGroups = groupStepCylinderSurfaces(
      sheetBendCandidates,
      bendCenterTol,
      bendRadiusTol
    )
    // Real bends usually have BOTH inside and outside surfaces — require >=2.
    const sheetBendCount = sheetBendGroups.filter(group => group.surfaces.length >= 2).length

    // Laser features: small holes and slots. These are cylindrical surfaces whose
    // axis runs through-thickness on a sheet, or perpendicular to the tube axis.
    const laserFeatureCandidates = cylinderSurfaces.filter(surface => {
      if (!boundingSize) return false
      // Through-thickness hole on a sheet
      if (thicknessAxis && Math.abs(surface.axis.dot(thicknessAxis)) > 0.7) {
        return surface.radius < partMaxDim * 0.25
      }
      return false
    })
    const laserFeatureCount = groupStepCylinderSurfaces(
      laserFeatureCandidates,
      Math.max(partMinDim * 0.05, 0.5),
      0.5
    ).length

    // Decide part shape from geometry. The signal is the *aspect* of the
    // bounding box: tubes have one big axis and two small-and-similar axes; flat
    // sheets have two big axes and one small thickness axis.
    let partShape: 'tube' | 'sheet-bracket' | 'flat-sheet' | 'unknown' = 'unknown'
    if (boundingSize && dimEntries.length === 3) {
      const minDim = dimEntries[0].size
      const midDim = dimEntries[1].size
      const maxDim = dimEntries[2].size
      const lengthRatio = midDim > 0 ? maxDim / midDim : 0
      const sheetnessRatio = minDim > 0 ? midDim / minDim : 0
      const isSheetLike = lengthRatio < 2.5 && sheetnessRatio > 4
      const isTubeLike = lengthRatio >= 2.5 && sheetnessRatio < 4

      if (isTubeLike) {
        partShape = 'tube'
      } else if (isSheetLike && sheetBendCount > 0) {
        partShape = 'sheet-bracket'
      } else if (isSheetLike) {
        partShape = 'flat-sheet'
      } else if (torusSurfaces.length > 0) {
        partShape = 'tube'
      } else if (sheetBendCount > 0) {
        partShape = 'sheet-bracket'
      }
    }

    // Pick the bend count that fits the detected shape, with manual-review when uncertain.
    let bendCount: number | null = null
    let bendConfidence = 0
    let bendMethod = 'STEP topology: no bend surfaces detected'
    if (partShape === 'tube' && torusBendCount > 0) {
      bendCount = torusBendCount
      bendConfidence = torusBendConfidence
      bendMethod = 'STEP topology: grouped toroidal tube bend surfaces'
    } else if (partShape === 'sheet-bracket') {
      bendCount = sheetBendCount
      bendConfidence = sheetBendCount > 0 ? 0.85 : 0.55
      bendMethod = 'STEP topology: paired sheet-metal bend cylinders'
    } else if (partShape === 'flat-sheet') {
      bendCount = 0
      bendConfidence = 0.9
      bendMethod = 'STEP topology: flat sheet — no bends'
    } else if (torusBendCount > 0) {
      bendCount = torusBendCount
      bendConfidence = torusBendConfidence
      bendMethod = 'STEP topology: grouped toroidal tube bend surfaces'
    } else if (sheetBendCount > 0) {
      bendCount = sheetBendCount
      bendConfidence = 0.7
      bendMethod = 'STEP topology: paired sheet-metal bend cylinders'
    }

    const cutCount = solidBodyCount > 1 ? solidBodyCount * 2 : 2

    // Per-feature geometry. Bends come from supported torus groups for tubes, sheet
    // bend cylinder groups for brackets. Holes come from the laser-feature cylinder
    // groups we just identified.
    //
    // We pick the sweep angle / axial length from the FIRST surface in each
    // group. For tube bends, paired inner/outer toruses give very close sweep
    // values (they share boundary edges), so the first is representative.
    // For laser-feature holes, paired inner/outer cylinders likewise share top
    // and bottom rims.
    interface BendSource { center: Vector3; axis: Vector3; radius: number; sweepAngleRad?: number }
    const sourceBendGroups: BendSource[] =
      partShape === 'tube'
        ? supportedTorusGroups.map(g => ({
            center: g.center,
            axis: g.axis,
            radius: g.majorRadius,
            sweepAngleRad: g.surfaces[0]?.sweepAngleRad,
          }))
        : sheetBendGroups
            .filter(g => g.surfaces.length >= 2)
            .map(g => ({ center: g.center, axis: g.axis, radius: g.radius }))

    const bendGeometries: RawBendGeometry[] = sourceBendGroups.map(g => ({
      center: g.center.clone(),
      axis: g.axis.clone(),
      majorRadius: g.radius,
      sweepAngleRad: g.sweepAngleRad,
    }))

    const holeGroups = groupStepCylinderSurfaces(
      laserFeatureCandidates,
      Math.max(partMinDim * 0.05, 0.5),
      0.5,
    )
    const holeGeometries: RawHoleGeometry[] = holeGroups.map(g => ({
      center: g.center.clone(),
      axis: g.axis.clone(),
      diameter: g.radius * 2,
      axialLength: g.surfaces[0]?.axialLength,
    }))

    const featureAnalysis: StepTubeFeatureAnalysis = {
      bendCount,
      bendConfidence,
      bendMethod,
      cutCount,
      cutConfidence: solidBodyCount > 1 ? 0.75 : 0.85,
      cutMethod: solidBodyCount > 1 ? 'STEP topology: two end cuts per solid body' : 'single tube endpoints',
      toroidalSurfaceCount: torusSurfaces.length,
      cylindricalSurfaceCount: cylinderSurfaces.length,
      smallCylindricalGroupCount: sheetBendGroups.length,
      laserFeatureCount,
      solidBodyCount,
      partShape,
      bendGeometries,
      holeGeometries,
    }

    cadDebugLog('STEP feature analysis:', {
      ...featureAnalysis,
      tubeLikeToroidalSurfaces: tubeLikeTori.length,
      slenderRatio,
      partThickness,
      torusBendCount,
      sheetBendCount,
    })

    return featureAnalysis
  } catch (error) {
    cadDebugWarn('Failed to analyze STEP tube features:', error)
    return null
  }
}

/**
 * Stable, deterministic feature ID derived from kind + rounded position + primary dim.
 * Same geometry → same ID across re-parses, so saved feature configurations restore correctly.
 */
function makeFeatureId(
  kind: 'bend' | 'hole' | 'end-cut',
  position: [number, number, number],
  primaryDim: number,
): string {
  const s = `${kind}|${position[0].toFixed(2)}|${position[1].toFixed(2)}|${position[2].toFixed(2)}|${primaryDim.toFixed(3)}`
  // djb2 — fast, deterministic, good-enough collision resistance for ~10 features.
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${kind}-${(h >>> 0).toString(36)}`
}

function vec3ToTuple(v: Vector3): [number, number, number] {
  return [v.x, v.y, v.z]
}

/**
 * Snap a near-cardinal angle (within 1°) to a clean integer.
 *
 * Why: shop drawings call out bends as 30°/45°/60°/90°/120°, but STEP
 * topology can produce e.g. 89.97° from floating-point math. Snap so the UI
 * reads as the integer the drafter intended. Anything not within 1° of a
 * cardinal stays at its computed value (rounded to 1 decimal).
 */
function snapCardinalAngle(deg: number): number {
  const cardinals = [30, 45, 60, 90, 120, 135, 150, 180]
  for (const c of cardinals) {
    if (Math.abs(deg - c) <= 1) return c
  }
  return Math.round(deg * 10) / 10
}

/**
 * Convert a position vector from source units to millimeters.
 *
 * Why: bend/hole centers come from `analyzeStepTubeFeatures`, which parses
 * STEP entity text directly. Those coordinates are in the file's declared
 * UNIT (often inch on US shop files), while `analysis.boundingBox` is in
 * mm (occt-import-js converts via linearUnit='millimeter'). Without this
 * conversion, hotspots on inch-source files land near the model center at
 * 1/25.4× scale.
 */
function vec3ToMm(v: Vector3, sourceUnits: string): [number, number, number] {
  return [
    convertToMillimeters(v.x, sourceUnits),
    convertToMillimeters(v.y, sourceUnits),
    convertToMillimeters(v.z, sourceUnits),
  ]
}

interface BuildFeatureListArgs {
  stepFeatures: StepTubeFeatureAnalysis | null
  boundingBox: Box3
  size: Vector3
  sourceUnits: string
  partThicknessMm: number
  estimatedBends: number
  estimatedCuts: number
}

/**
 * Compose the user-facing `Feature[]` from analyzer outputs:
 *  - Bends: from STEP torus/sheet-bend groups (positions + radii are real;
 *    sweep angle is not extracted from STEP entities yet — default 90° flagged estimated).
 *  - Holes: from STEP laser-feature cylinder groups (positions + diameters real;
 *    depth approximated to part thickness for through-features, flagged estimated).
 *  - End-cuts: synthesized from the bounding-box's long axis endpoints for tube parts.
 */
function buildFeatureList(args: BuildFeatureListArgs): Feature[] {
  const { stepFeatures, boundingBox, size, sourceUnits, partThicknessMm, estimatedCuts } = args
  const features: Feature[] = []

  // --- Bends -------------------------------------------------------------
  if (stepFeatures?.bendGeometries?.length) {
    for (const bg of stepFeatures.bendGeometries) {
      const position = vec3ToMm(bg.center, sourceUnits)
      const radiusMm = convertToMillimeters(bg.majorRadius, sourceUnits)
      const planeNormal: [number, number, number] = [bg.axis.x, bg.axis.y, bg.axis.z]

      // Prefer the real sweep angle from STEP face topology when we got one.
      // Snap near-cardinal angles (within 1°) to a clean integer so 89.97° / 90.04°
      // both read as "90°" — that's how shop drawings call them out.
      const realAngleDeg =
        typeof bg.sweepAngleRad === 'number' && bg.sweepAngleRad > 0
          ? snapCardinalAngle((bg.sweepAngleRad * 180) / Math.PI)
          : null
      const angleDeg = realAngleDeg ?? 90
      const estimated = realAngleDeg === null

      const bend: BendFeature = {
        id: makeFeatureId('bend', position, radiusMm),
        kind: 'bend',
        position,
        angleDeg,
        centerlineRadiusMm: radiusMm,
        planeNormal,
        estimated,
      }
      features.push(bend)
    }
  }

  // --- Holes -------------------------------------------------------------
  if (stepFeatures?.holeGeometries?.length) {
    for (const hg of stepFeatures.holeGeometries) {
      const position = vec3ToMm(hg.center, sourceUnits)
      const diameterMm = convertToMillimeters(hg.diameter, sourceUnits)

      // Prefer the real axial length from cylinder face topology. Fall back to
      // approximating depth as part thickness when topology didn't pan out.
      const realDepthMm =
        typeof hg.axialLength === 'number' && hg.axialLength > 0
          ? convertToMillimeters(hg.axialLength, sourceUnits)
          : null
      const depthMm =
        realDepthMm ?? (partThicknessMm > 0 ? partThicknessMm : diameterMm)
      const through =
        realDepthMm === null
          ? true
          // Within 5% of part thickness counts as through-thickness.
          : partThicknessMm > 0
            ? Math.abs(realDepthMm - partThicknessMm) / partThicknessMm < 0.05
            : true
      const estimated = realDepthMm === null

      const hole: HoleFeature = {
        id: makeFeatureId('hole', position, diameterMm),
        kind: 'hole',
        position,
        diameterMm,
        depthMm,
        through,
        estimated,
      }
      features.push(hole)
    }
  }

  // --- End-cuts (synthesized) -------------------------------------------
  const isTube = stepFeatures?.partShape === 'tube' || (!stepFeatures && estimatedCuts > 0)
  if (isTube && !boundingBox.isEmpty()) {
    // Long axis = bounding-box dimension with the largest extent.
    const longestAxis: 'x' | 'y' | 'z' =
      size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z'
    const minVec = new Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z)
    const maxVec = new Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z)
    const centerOther = new Vector3()
      .addVectors(minVec, maxVec)
      .multiplyScalar(0.5)

    const startPoint = centerOther.clone()
    const endPoint = centerOther.clone()
    startPoint[longestAxis] = boundingBox.min[longestAxis]
    endPoint[longestAxis] = boundingBox.max[longestAxis]

    const startPos = vec3ToTuple(startPoint)
    const endPos = vec3ToTuple(endPoint)
    const start: EndCutFeature = {
      id: makeFeatureId('end-cut', startPos, 0),
      kind: 'end-cut',
      position: startPos,
      endIndex: 0,
      defaultAngleDeg: 0,
    }
    const end: EndCutFeature = {
      id: makeFeatureId('end-cut', endPos, 1),
      kind: 'end-cut',
      position: endPos,
      endIndex: 1,
      defaultAngleDeg: 0,
    }
    features.push(start, end)
  }

  return features
}

/**
 * Convert length from one unit to millimeters
 */
function convertToMillimeters(length: number, fromUnit: string): number {
  const normalizedUnit = normalizeUnitName(fromUnit)
  const conversionFactor = UNIT_CONVERSION_TO_MM[normalizedUnit] || 1
  
  cadDebugLog(`Converting ${length} ${fromUnit} to millimeters (factor: ${conversionFactor})`)
  
  return length * conversionFactor
}

/**
 * Validate if detected units make sense for the geometry
 */
function validateUnitsAgainstGeometry(detectedUnits: string, boundingSize: Vector3): {
  isValid: boolean
  confidence: number
  suggestedUnit?: string
} {
  const maxDimension = Math.max(boundingSize.x, boundingSize.y, boundingSize.z)
  const normalizedUnit = normalizeUnitName(detectedUnits)
  
  // Define reasonable ranges for different units (in native file units)
  const reasonableRanges: Record<string, { min: number; max: number; typical: number }> = {
    'millimeter': { min: 0.1, max: 10000, typical: 100 },    // 0.1mm to 10m, typically ~10cm
    'meter': { min: 0.001, max: 100, typical: 0.1 },        // 1mm to 100m, typically ~10cm
    'inch': { min: 0.01, max: 1000, typical: 4 },           // 0.01" to 1000", typically ~4"
    'foot': { min: 0.001, max: 100, typical: 0.33 },        // 0.001' to 100', typically ~4"
    'centimeter': { min: 0.01, max: 1000, typical: 10 }     // 0.01cm to 10m, typically ~10cm
  }
  
  const range = reasonableRanges[normalizedUnit]
  if (!range) {
    return { isValid: false, confidence: 0 }
  }
  
  if (maxDimension < range.min || maxDimension > range.max) {
    // Geometry size is outside reasonable range for this unit
    // Suggest alternative units
    let suggestedUnit = normalizedUnit
    
    if (maxDimension < range.min) {
      // Too small, suggest smaller unit
      if (normalizedUnit === 'meter') suggestedUnit = 'millimeter'
      else if (normalizedUnit === 'foot') suggestedUnit = 'inch'
      else if (normalizedUnit === 'centimeter') suggestedUnit = 'millimeter'
    } else {
      // Too large, suggest larger unit  
      if (normalizedUnit === 'millimeter') suggestedUnit = 'meter'
      else if (normalizedUnit === 'inch') suggestedUnit = 'foot'
      else if (normalizedUnit === 'centimeter') suggestedUnit = 'meter'
    }
    
    return { 
      isValid: false, 
      confidence: 0.1,
      suggestedUnit 
    }
  }
  
  // Calculate confidence based on how close to typical size
  const typicalDistance = Math.abs(Math.log10(maxDimension / range.typical))
  const confidence = Math.max(0.3, Math.min(0.95, 1 - typicalDistance / 2))
  
  return { isValid: true, confidence }
}

/**
 * Estimate units for unit-less 2D formats (DXF/DWG/AI) from geometry size.
 *
 * Shop parts drawn in inches are typically 0.5–48 units across, while metric
 * drawings of the same parts read 25–1200. A 3-unit flat pattern is almost
 * certainly a 3" part, not a 3mm speck — the old heuristic called everything
 * under 1000 "millimeter" and produced 25.4× under-quotes on US shop files.
 * The user can still correct the assumption via the unit-confirm overlay.
 */
function estimateUnitsFromGeometry(boundingSize: Vector3): string {
  const maxDimension = Math.max(boundingSize.x, boundingSize.y, boundingSize.z)
  if (maxDimension > 0 && maxDimension < 60) {
    return 'inch'
  }
  return 'millimeter'
}

/**
 * 3D Skeletonization Algorithm for Centerline Extraction
 * Based on distance transform and iterative thinning
 */
function extractCenterlineBy3DSkeletonization(meshes: Array<{ geometry: BufferGeometry }>): {
  centerline: Vector3[]
  length: number
  confidence: number
} {
  if (meshes.length === 0) {
    return { centerline: [], length: 0, confidence: 0 }
  }

  try {
    // Sample points from mesh surfaces
    const surfacePoints = samplePointsFromMeshes(meshes, 3000)
    if (surfacePoints.length < 50) {
      return { centerline: [], length: 0, confidence: 0 }
    }

    // Create voxel grid for distance transform
    const { voxelGrid, bounds, resolution } = createVoxelGrid(surfacePoints)
    
    // Compute distance transform
    const distanceField = computeDistanceTransform(voxelGrid)
    
    // Extract skeleton using iterative thinning
    const skeletonVoxels = extractSkeletonVoxels(distanceField)
    
    // Convert skeleton voxels back to 3D points
    const skeletonPoints = voxelsToPoints(skeletonVoxels, bounds, resolution)
    
    if (skeletonPoints.length < 2) {
      return { centerline: [], length: 0, confidence: 0 }
    }

    // Order skeleton points to form a coherent centerline
    const orderedCenterline = orderSkeletonPoints(skeletonPoints)
    
    // Calculate total length using numerical integration methods
    const numericalResult = calculateCurveLengthNumerical(orderedCenterline)
    
    // Calculate confidence based on skeleton quality and numerical integration confidence
    const skeletonConfidence = calculateSkeletonConfidence(orderedCenterline, surfacePoints)
    const combinedConfidence = (skeletonConfidence * 0.6 + numericalResult.confidence * 0.4)

    cadDebugLog(`3D Skeletonization with ${numericalResult.method}: ${numericalResult.length.toFixed(3)} units (confidence: ${combinedConfidence.toFixed(3)})`)

    return { 
      centerline: orderedCenterline, 
      length: numericalResult.length, 
      confidence: combinedConfidence 
    }

  } catch (error) {
    cadDebugWarn('3D skeletonization failed:', error)
    return { centerline: [], length: 0, confidence: 0 }
  }
}

/**
 * Create voxel grid from point cloud
 */
function createVoxelGrid(points: Vector3[]): {
  voxelGrid: boolean[][][]
  bounds: { min: Vector3; max: Vector3 }
  resolution: number
} {
  // Calculate bounding box
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  
  for (const point of points) {
    min.x = Math.min(min.x, point.x)
    min.y = Math.min(min.y, point.y)
    min.z = Math.min(min.z, point.z)
    max.x = Math.max(max.x, point.x)
    max.y = Math.max(max.y, point.y)
    max.z = Math.max(max.z, point.z)
  }

  const size = new Vector3().subVectors(max, min)
  const maxDim = Math.max(size.x, size.y, size.z)
  
  // Choose resolution based on geometry size (target ~64-128 voxels along largest dimension)
  const targetVoxels = 80
  const resolution = maxDim / targetVoxels
  
  const dims = {
    x: Math.ceil(size.x / resolution),
    y: Math.ceil(size.y / resolution), 
    z: Math.ceil(size.z / resolution)
  }

  // Initialize voxel grid
  const voxelGrid: boolean[][][] = []
  for (let x = 0; x < dims.x; x++) {
    voxelGrid[x] = []
    for (let y = 0; y < dims.y; y++) {
      voxelGrid[x][y] = new Array(dims.z).fill(false)
    }
  }

  // Mark voxels containing points
  for (const point of points) {
    const vx = Math.floor((point.x - min.x) / resolution)
    const vy = Math.floor((point.y - min.y) / resolution)
    const vz = Math.floor((point.z - min.z) / resolution)
    
    if (vx >= 0 && vx < dims.x && vy >= 0 && vy < dims.y && vz >= 0 && vz < dims.z) {
      voxelGrid[vx][vy][vz] = true
    }
  }

  return { voxelGrid, bounds: { min, max }, resolution }
}

/**
 * Compute distance transform on voxel grid
 */
function computeDistanceTransform(voxelGrid: boolean[][][]): number[][][] {
  const dims = {
    x: voxelGrid.length,
    y: voxelGrid[0].length,
    z: voxelGrid[0][0].length
  }

  // Initialize distance field
  const distanceField: number[][][] = []
  for (let x = 0; x < dims.x; x++) {
    distanceField[x] = []
    for (let y = 0; y < dims.y; y++) {
      distanceField[x][y] = []
      for (let z = 0; z < dims.z; z++) {
        distanceField[x][y][z] = voxelGrid[x][y][z] ? 0 : Infinity
      }
    }
  }

  // Simple distance transform using iterative approach
  let changed = true
  const maxIterations = Math.max(dims.x, dims.y, dims.z)
  
  for (let iter = 0; iter < maxIterations && changed; iter++) {
    changed = false
    
    for (let x = 0; x < dims.x; x++) {
      for (let y = 0; y < dims.y; y++) {
        for (let z = 0; z < dims.z; z++) {
          if (voxelGrid[x][y][z]) continue // Skip surface voxels
          
          let minDist = distanceField[x][y][z]
          
          // Check 6-connected neighbors
          const neighbors = [
            [x-1, y, z], [x+1, y, z],
            [x, y-1, z], [x, y+1, z],
            [x, y, z-1], [x, y, z+1]
          ]
          
          for (const [nx, ny, nz] of neighbors) {
            if (nx >= 0 && nx < dims.x && ny >= 0 && ny < dims.y && nz >= 0 && nz < dims.z) {
              const newDist = distanceField[nx][ny][nz] + 1
              if (newDist < minDist) {
                minDist = newDist
                changed = true
              }
            }
          }
          
          distanceField[x][y][z] = minDist
        }
      }
    }
  }

  return distanceField
}

/**
 * Extract skeleton voxels using simple medial axis extraction
 */
function extractSkeletonVoxels(distanceField: number[][][]): Array<{ x: number; y: number; z: number; distance: number }> {
  const dims = {
    x: distanceField.length,
    y: distanceField[0].length,
    z: distanceField[0][0].length
  }

  const skeletonVoxels: Array<{ x: number; y: number; z: number; distance: number }> = []

  // Find local maxima in distance field (medial axis points)
  for (let x = 1; x < dims.x - 1; x++) {
    for (let y = 1; y < dims.y - 1; y++) {
      for (let z = 1; z < dims.z - 1; z++) {
        const currentDist = distanceField[x][y][z]
        
        if (currentDist < 2) continue // Skip points too close to surface
        
        // Check if this is a local maximum
        let isLocalMax = true
        for (let dx = -1; dx <= 1 && isLocalMax; dx++) {
          for (let dy = -1; dy <= 1 && isLocalMax; dy++) {
            for (let dz = -1; dz <= 1 && isLocalMax; dz++) {
              if (dx === 0 && dy === 0 && dz === 0) continue
              
              const neighborDist = distanceField[x + dx][y + dy][z + dz]
              if (neighborDist > currentDist) {
                isLocalMax = false
              }
            }
          }
        }
        
        if (isLocalMax) {
          skeletonVoxels.push({ x, y, z, distance: currentDist })
        }
      }
    }
  }

  return skeletonVoxels
}

/**
 * Convert voxel coordinates back to 3D points
 */
function voxelsToPoints(
  skeletonVoxels: Array<{ x: number; y: number; z: number; distance: number }>,
  bounds: { min: Vector3; max: Vector3 },
  resolution: number
): Vector3[] {
  return skeletonVoxels.map(voxel => {
    return new Vector3(
      bounds.min.x + (voxel.x + 0.5) * resolution,
      bounds.min.y + (voxel.y + 0.5) * resolution,
      bounds.min.z + (voxel.z + 0.5) * resolution
    )
  })
}

/**
 * Order skeleton points to form coherent centerline
 */
function orderSkeletonPoints(points: Vector3[]): Vector3[] {
  if (points.length < 2) return points

  // Find endpoints (points with only one close neighbor)
  const endpoints: Vector3[] = []
  const maxConnectionDist = calculateAveragePointSpacing(points) * 2

  for (const point of points) {
    const neighbors = points.filter(p => p !== point && p.distanceTo(point) <= maxConnectionDist)
    if (neighbors.length <= 1) {
      endpoints.push(point)
    }
  }

  if (endpoints.length < 2) {
    // Fallback: use furthest apart points
    let maxDist = 0
    let endpoint1 = points[0]
    let endpoint2 = points[1]
    
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = points[i].distanceTo(points[j])
        if (dist > maxDist) {
          maxDist = dist
          endpoint1 = points[i]
          endpoint2 = points[j]
        }
      }
    }
    endpoints.push(endpoint1, endpoint2)
  }

  // Build path from one endpoint to another using greedy nearest neighbor
  const orderedPoints: Vector3[] = []
  const remaining = [...points]
  let current = endpoints[0]
  
  orderedPoints.push(current)
  remaining.splice(remaining.indexOf(current), 1)

  while (remaining.length > 0) {
    let nearest = remaining[0]
    let minDist = current.distanceTo(nearest)
    
    for (const point of remaining) {
      const dist = current.distanceTo(point)
      if (dist < minDist) {
        minDist = dist
        nearest = point
      }
    }
    
    orderedPoints.push(nearest)
    remaining.splice(remaining.indexOf(nearest), 1)
    current = nearest
  }

  return orderedPoints
}

/**
 * Calculate confidence score for skeleton quality
 */
function calculateSkeletonConfidence(centerline: Vector3[], originalPoints: Vector3[]): number {
  if (centerline.length < 2) return 0

  // Base confidence from centerline smoothness
  let smoothnessScore = 1
  if (centerline.length > 2) {
    let totalAngleDeviation = 0
    for (let i = 1; i < centerline.length - 1; i++) {
      const v1 = centerline[i].clone().sub(centerline[i - 1]).normalize()
      const v2 = centerline[i + 1].clone().sub(centerline[i]).normalize()
      const angle = v1.angleTo(v2)
      totalAngleDeviation += angle
    }
    smoothnessScore = Math.max(0.1, 1 - totalAngleDeviation / (centerline.length - 2) / Math.PI)
  }

  // Confidence from coverage (how much of original geometry is represented)
  const coverageScore = Math.min(1, centerline.length / (originalPoints.length * 0.01))

  return Math.min(0.95, smoothnessScore * 0.7 + coverageScore * 0.3)
}

/**
 * Numerical integration methods for accurate curve length calculation
 */
class CurveIntegrator {
  /**
   * Calculate arc length using adaptive Simpson's rule
   */
  static adaptiveSimpsonArcLength(
    points: Vector3[], 
    tolerance: number = 1e-6, 
    maxDepth: number = 10
  ): number {
    if (points.length < 2) return 0
    
    let totalLength = 0
    
    // Process each segment between consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const segmentLength = this.adaptiveSimpsonSegment(
        points[i], 
        points[i + 1], 
        tolerance, 
        maxDepth
      )
      totalLength += segmentLength
    }
    
    return totalLength
  }
  
  /**
   * Adaptive Simpson's rule for a single segment
   */
  private static adaptiveSimpsonSegment(
    p1: Vector3, 
    p2: Vector3, 
    tolerance: number, 
    depth: number
  ): number {
    const mid = new Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    
    // For straight line segments, return Euclidean distance
    const straightDistance = p1.distanceTo(p2)
    
    if (depth <= 0) {
      return straightDistance
    }
    
    // Calculate Simpson's rule approximation
    const h = 0.5
    const f0 = 1 // derivative magnitude at start (normalized)
    const f1 = 1 // derivative magnitude at midpoint
    const f2 = 1 // derivative magnitude at end
    
    const simpson = (h / 3) * (f0 + 4 * f1 + f2) * straightDistance
    
    // Check if we need further subdivision
    if (Math.abs(simpson - straightDistance) < tolerance) {
      return simpson
    }
    
    // Recursively subdivide
    const left = this.adaptiveSimpsonSegment(p1, mid, tolerance, depth - 1)
    const right = this.adaptiveSimpsonSegment(mid, p2, tolerance, depth - 1)
    
    return left + right
  }
  
  /**
   * Gaussian quadrature for curve length calculation
   */
  static gaussianQuadratureArcLength(points: Vector3[], numPoints: number = 5): number {
    if (points.length < 2) return 0
    
    // Gauss-Legendre quadrature points and weights for 5-point rule
    const gaussWeights = [0.2369268851, 0.4786286705, 0.5688888889, 0.4786286705, 0.2369268851]
    const quadratureWeights = gaussWeights.slice(0, numPoints)
    
    let totalLength = 0
    
    // Apply quadrature to each segment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const segmentVector = new Vector3().subVectors(p2, p1)
      const segmentLength = segmentVector.length()
      
      if (segmentLength === 0) continue
      
      let segmentIntegral = 0
      
      // Apply Gaussian quadrature
      for (const weight of quadratureWeights) {
        // For linear segments, derivative magnitude is constant
        const derivativeMagnitude = segmentLength
        
        segmentIntegral += weight * derivativeMagnitude
      }
      
      totalLength += segmentIntegral * 0.5 // Scale factor for transformation
    }
    
    return totalLength
  }
  
  /**
   * B-spline approximation and integration
   */
  static bSplineArcLength(points: Vector3[], degree: number = 3): number {
    if (points.length < degree + 1) {
      // Fallback to linear interpolation for insufficient points
      return this.linearInterpolationLength(points)
    }
    
    // Create B-spline knot vector
    const n = points.length
    const knotVector = this.createUniformKnotVector(n, degree)
    
    // Sample points along B-spline curve
    const samples = 100
    const curvePoints: Vector3[] = []
    
    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const point = this.evaluateBSpline(points, degree, knotVector, t)
      if (point) {
        curvePoints.push(point)
      }
    }
    
    // Calculate length of sampled curve
    return this.linearInterpolationLength(curvePoints)
  }
  
  /**
   * Create uniform knot vector for B-spline
   */
  private static createUniformKnotVector(n: number, degree: number): number[] {
    const knotVector: number[] = []
    const m = n + degree + 1
    
    for (let i = 0; i < m; i++) {
      if (i <= degree) {
        knotVector.push(0)
      } else if (i < m - degree) {
        knotVector.push((i - degree) / (n - degree))
      } else {
        knotVector.push(1)
      }
    }
    
    return knotVector
  }
  
  /**
   * Evaluate B-spline at parameter t
   */
  private static evaluateBSpline(
    controlPoints: Vector3[], 
    degree: number, 
    knotVector: number[], 
    t: number
  ): Vector3 | null {
    const n = controlPoints.length
    
    if (t < 0 || t > 1) return null
    
    // Find knot span
    let span = degree
    while (span < n && knotVector[span + 1] <= t) {
      span++
    }
    
    // Compute basis functions
    const basis = this.computeBasisFunctions(span, t, degree, knotVector)
    
    // Compute curve point
    const point = new Vector3(0, 0, 0)
    for (let i = 0; i <= degree; i++) {
      const cp = controlPoints[span - degree + i]
      if (cp) {
        point.add(cp.clone().multiplyScalar(basis[i]))
      }
    }
    
    return point
  }
  
  /**
   * Compute B-spline basis functions
   */
  private static computeBasisFunctions(
    span: number, 
    t: number, 
    degree: number, 
    knotVector: number[]
  ): number[] {
    const basis = new Array(degree + 1).fill(0)
    const left = new Array(degree + 1).fill(0)
    const right = new Array(degree + 1).fill(0)
    
    basis[0] = 1.0
    
    for (let j = 1; j <= degree; j++) {
      left[j] = t - knotVector[span + 1 - j]
      right[j] = knotVector[span + j] - t
      
      let saved = 0.0
      for (let r = 0; r < j; r++) {
        const temp = basis[r] / (right[r + 1] + left[j - r])
        basis[r] = saved + right[r + 1] * temp
        saved = left[j - r] * temp
      }
      basis[j] = saved
    }
    
    return basis
  }
  
  /**
   * Fallback linear interpolation length calculation
   */
  static linearInterpolationLength(points: Vector3[]): number {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      length += points[i].distanceTo(points[i - 1])
    }
    return length
  }
}

/**
 * Enhanced curve length calculation using numerical integration
 */
function calculateCurveLengthNumerical(centerlinePoints: Vector3[]): {
  length: number
  method: string
  confidence: number
} {
  if (centerlinePoints.length < 2) {
    return { length: 0, method: 'none', confidence: 0 }
  }
  
  const results: Array<{ method: string; length: number; confidence: number }> = []
  
  // Method 1: Adaptive Simpson's rule
  try {
    const simpsonLength = CurveIntegrator.adaptiveSimpsonArcLength(centerlinePoints)
    results.push({
      method: 'Adaptive Simpson',
      length: simpsonLength,
      confidence: 0.85
    })
  } catch (error) {
    cadDebugWarn('Adaptive Simpson integration failed:', error)
  }
  
  // Method 2: Gaussian quadrature
  try {
    const gaussLength = CurveIntegrator.gaussianQuadratureArcLength(centerlinePoints)
    results.push({
      method: 'Gaussian Quadrature',
      length: gaussLength,
      confidence: 0.80
    })
  } catch (error) {
    cadDebugWarn('Gaussian quadrature integration failed:', error)
  }
  
  // Method 3: B-spline approximation
  try {
    const bsplineLength = CurveIntegrator.bSplineArcLength(centerlinePoints)
    results.push({
      method: 'B-spline Integration',
      length: bsplineLength,
      confidence: 0.75
    })
  } catch (error) {
    cadDebugWarn('B-spline integration failed:', error)
  }
  
  // Method 4: Linear interpolation (fallback)
  const linearLength = CurveIntegrator.linearInterpolationLength(centerlinePoints)
  results.push({
    method: 'Linear Interpolation',
    length: linearLength,
    confidence: 0.60
  })
  
  // Select best result
  results.sort((a, b) => b.confidence - a.confidence)
  const best = results[0]
  
  // Cross-validate if multiple methods available
  if (results.length > 1) {
    const avgLength = results.reduce((sum, r) => sum + r.length, 0) / results.length
    const variance = results.reduce((sum, r) => sum + Math.pow(r.length - avgLength, 2), 0) / results.length
    const coefficientOfVariation = Math.sqrt(variance) / avgLength
    
    // Adjust confidence based on consistency
    let finalConfidence = best.confidence
    if (coefficientOfVariation < 0.15) {
      finalConfidence = Math.min(0.95, finalConfidence + 0.05)
    } else if (coefficientOfVariation > 0.3) {
      finalConfidence = Math.max(0.3, finalConfidence - 0.15)
    }
    
    return {
      length: best.length,
      method: best.method,
      confidence: finalConfidence
    }
  }
  
  return best
}

/**
 * Calculate average spacing between points
 */
function calculateAveragePointSpacing(points: Vector3[]): number {
  if (points.length < 2) return 1

  let totalDist = 0
  let count = 0
  
  for (let i = 0; i < Math.min(points.length, 100); i++) {
    let minDist = Infinity
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      const dist = points[i].distanceTo(points[j])
      if (dist < minDist) {
        minDist = dist
      }
    }
    if (minDist < Infinity) {
      totalDist += minDist
      count++
    }
  }

  return count > 0 ? totalDist / count : 1
}

function getRelativeLengthDelta(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1)
}

/**
 * Multi-method tube length calculation with cross-validation
 */
async function calculateTubeLengthMultiMethod(
  meshes: Array<{ geometry: BufferGeometry }>, 
  boundingSize: Vector3
): Promise<{ bestLength: number; method: string; confidence: number; allResults: Array<{ method: string; length: number; confidence: number }> }> {
  if (meshes.length === 0) {
    return { bestLength: 0, method: 'none', confidence: 0, allResults: [] }
  }

  const results: Array<{ method: string; length: number; confidence: number }> = []

  // Method 1: 3D Skeletonization
  try {
    const skeletonResult = extractCenterlineBy3DSkeletonization(meshes)
    if (skeletonResult.length > 0) {
      results.push({
        method: '3D Skeletonization',
        length: skeletonResult.length,
        confidence: skeletonResult.confidence
      })
    }
  } catch (error) {
    cadDebugWarn('3D Skeletonization failed:', error)
  }

  // Method 2: PCA-based slicing (existing method)
  try {
    const pcaLength = estimateCenterlineLengthBySlicing(meshes)
    if (pcaLength > 0) {
      results.push({
        method: 'PCA Slicing',
        length: pcaLength,
        confidence: 0.7
      })
    }
  } catch (error) {
    cadDebugWarn('PCA slicing failed:', error)
  }

  // Method 3: Path calculation (existing method)
  try {
    const pathLength = calculatePathLength(meshes)
    if (pathLength > 0) {
      results.push({
        method: 'Path Calculation',
        length: pathLength,
        confidence: 0.6
      })
    }
  } catch (error) {
    cadDebugWarn('Path calculation failed:', error)
  }

  // Method 4: Bounding box analysis (fallback)
  const { x, y, z } = boundingSize
  const sortedDimensions = [x, y, z].sort((a, b) => b - a)
  const lengthDimension = sortedDimensions[0]
  const averageCrossDimension = (sortedDimensions[1] + sortedDimensions[2]) / 2
  
  let boundingBoxLength = lengthDimension
  let boundingBoxConfidence = 0.3
  
  if (lengthDimension > averageCrossDimension * 3) {
    boundingBoxLength = lengthDimension
    boundingBoxConfidence = 0.5
  } else {
    const complexity = Math.max(1, Math.sqrt(lengthDimension / averageCrossDimension))
    boundingBoxLength = lengthDimension * complexity
    boundingBoxConfidence = 0.2
  }
  
  results.push({
    method: 'Bounding Box',
    length: boundingBoxLength,
    confidence: boundingBoxConfidence
  })

  // Select best result based on confidence
  if (results.length === 0) {
    return { bestLength: 0, method: 'none', confidence: 0, allResults: [] }
  }

  // Sort by confidence, but prefer a method supported by at least one
  // independent method. Mesh vertex-order paths can be noisy outliers.
  results.sort((a, b) => b.confidence - a.confidence)
  const supportTolerance = 0.25
  const getSupporters = (result: { length: number }) => (
    results.filter(other => other !== result && getRelativeLengthDelta(result.length, other.length) <= supportTolerance)
  )
  const bestResult = results.find(result => getSupporters(result).length > 0) || results[0]

  // Cross-validate results if multiple methods succeeded
  let finalConfidence = bestResult.confidence
  const validationResults = [bestResult, ...getSupporters(bestResult)]
  if (validationResults.length > 1) {
    const avgLength = validationResults.reduce((sum, r) => sum + r.length, 0) / validationResults.length
    const variance = validationResults.reduce((sum, r) => sum + Math.pow(r.length - avgLength, 2), 0) / validationResults.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / avgLength
    
    // If results are consistent (low variation), boost confidence
    if (coefficientOfVariation < 0.2) {
      finalConfidence = Math.min(0.95, finalConfidence + 0.1)
    } else if (coefficientOfVariation > 0.5) {
      finalConfidence = Math.max(0.1, finalConfidence - 0.2)
    }
    
    cadDebugLog(`Length calculation cross-validation - CV: ${coefficientOfVariation.toFixed(3)}, Supported: ${validationResults.map(r => `${r.method}: ${r.length.toFixed(2)}`).join(', ')}, All: ${results.map(r => `${r.method}: ${r.length.toFixed(2)}`).join(', ')}`)
  } else if (results.length > 1) {
    finalConfidence = Math.max(0.1, finalConfidence - 0.1)
    cadDebugLog(`Length calculation has no supporting method for ${bestResult.method}. All: ${results.map(r => `${r.method}: ${r.length.toFixed(2)}`).join(', ')}`)
  }

  return {
    bestLength: bestResult.length,
    method: bestResult.method,
    confidence: finalConfidence,
    allResults: results
  }
}

/**
 * Calculate path length by sampling points along the geometry
 */
function calculatePathLength(meshes: Array<{ geometry: BufferGeometry }>): number {
  if (meshes.length !== 1) return 0 // Only works for single mesh for now
  
  const geometry = meshes[0].geometry
  const positions = geometry.attributes.position
  
  if (!positions || positions.count < 10) return 0
  
  // Sample points along the geometry to create a path
  const sampleCount = Math.min(50, Math.floor(positions.count / 10))
  const points: Vector3[] = []
  
  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor((i / (sampleCount - 1)) * (positions.count - 1))
    const point = new Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    )
    points.push(point)
  }
  
  // Calculate cumulative distance along the path
  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    const distance = points[i].distanceTo(points[i - 1])
    totalDistance += distance
  }
  
  // Only return if we got a reasonable path. STEP triangulation vertex order is
  // not a true centerline, so very long arbitrary walks must not participate in
  // confidence scoring.
  const geometry_bbox = geometry.boundingBox
  if (geometry_bbox) {
    const diagonal = geometry_bbox.min.distanceTo(geometry_bbox.max)
    if (totalDistance > diagonal * 0.8 && totalDistance < diagonal * 2.5) {
      return totalDistance
    }
  }
  
  return 0 // Return 0 if path analysis failed
}

/**
 * Sample points uniformly from meshes up to a target count
 */
function samplePointsFromMeshes(meshes: Array<{ geometry: BufferGeometry }>, targetSampleCount: number = 1500): Vector3[] {
  const sampledPoints: Vector3[] = []
  if (meshes.length === 0) {
    return sampledPoints
  }
  
  const samplesPerMesh = Math.max(50, Math.floor(targetSampleCount / meshes.length))
  
  for (const mesh of meshes) {
    const positions = mesh.geometry.attributes.position as BufferAttribute | undefined
    if (!positions) continue
    const count = positions.count
    if (count === 0) continue
    
    const stride = Math.max(1, Math.floor(count / samplesPerMesh))
    for (let i = 0; i < count; i += stride) {
      sampledPoints.push(new Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)))
    }
  }
  
  return sampledPoints
}

/**
 * Compute principal axis using power iteration on covariance matrix
 */
function computePrincipalAxis(points: Vector3[]): Vector3 | null {
  if (points.length < 3) return null
  
  // Compute mean
  const mean = new Vector3(0, 0, 0)
  for (const p of points) {
    mean.add(p)
  }
  mean.multiplyScalar(1 / points.length)
  
  // Compute covariance matrix elements (symmetric 3x3)
  let c00 = 0, c01 = 0, c02 = 0, c11 = 0, c12 = 0, c22 = 0
  for (const p of points) {
    const x = p.x - mean.x
    const y = p.y - mean.y
    const z = p.z - mean.z
    c00 += x * x
    c01 += x * y
    c02 += x * z
    c11 += y * y
    c12 += y * z
    c22 += z * z
  }
  const invN = 1 / (points.length - 1)
  c00 *= invN; c01 *= invN; c02 *= invN; c11 *= invN; c12 *= invN; c22 *= invN
  
  // Power iteration to get dominant eigenvector
  const v = new Vector3(1, 0, 0)
  // If axis is degenerate along X, choose a different start
  if (Math.abs(c00) < 1e-9 && Math.abs(c01) < 1e-9 && Math.abs(c02) < 1e-9) {
    v.set(0, 1, 0)
  }
  
  for (let iter = 0; iter < 20; iter++) {
    const nx = c00 * v.x + c01 * v.y + c02 * v.z
    const ny = c01 * v.x + c11 * v.y + c12 * v.z
    const nz = c02 * v.x + c12 * v.y + c22 * v.z
    v.set(nx, ny, nz)
    const len = v.length()
    if (len < 1e-12) break
    v.multiplyScalar(1 / len)
  }
  
  // Guard against numerical issues
  if (!isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z) || v.length() < 1e-6) {
    return null
  }
  
  return v.normalize()
}

/**
 * Estimate centerline length by slicing point cloud along principal axis.
 * This approximates the tube centerline by connecting centroids of thin slabs.
 */
function estimateCenterlineLengthBySlicing(
  meshes: Array<{ geometry: BufferGeometry }>,
  numSlices: number = 120
): number {
  try {
    const points = samplePointsFromMeshes(meshes, 2000)
    if (points.length < 10) return 0
    
    const axis = computePrincipalAxis(points)
    if (!axis) return 0
    
    // Compute projections onto axis
    // Use the average point as origin for numerical stability
    const origin = new Vector3(0, 0, 0)
    for (const p of points) origin.add(p)
    origin.multiplyScalar(1 / points.length)
    
    const projections: number[] = new Array(points.length)
    let minProj = Infinity
    let maxProj = -Infinity
    for (let i = 0; i < points.length; i++) {
      const proj = points[i].clone().sub(origin).dot(axis)
      projections[i] = proj
      if (proj < minProj) minProj = proj
      if (proj > maxProj) maxProj = proj
    }
    
    if (!isFinite(minProj) || !isFinite(maxProj) || maxProj <= minProj) return 0
    
    const sliceWidth = (maxProj - minProj) / numSlices
    if (sliceWidth <= 0) return 0
    
    // Accumulate centroids per slice
    const sumX = new Array<number>(numSlices).fill(0)
    const sumY = new Array<number>(numSlices).fill(0)
    const sumZ = new Array<number>(numSlices).fill(0)
    const counts = new Array<number>(numSlices).fill(0)
    
    for (let i = 0; i < points.length; i++) {
      const idx = Math.min(
        numSlices - 1,
        Math.max(0, Math.floor((projections[i] - minProj) / sliceWidth))
      )
      sumX[idx] += points[i].x
      sumY[idx] += points[i].y
      sumZ[idx] += points[i].z
      counts[idx] += 1
    }
    
    // Build ordered centroids
    const centroids: Vector3[] = []
    for (let i = 0; i < numSlices; i++) {
      if (counts[i] > 0) {
        centroids.push(new Vector3(sumX[i] / counts[i], sumY[i] / counts[i], sumZ[i] / counts[i]))
      }
    }
    
    if (centroids.length < 2) return 0
    
    // Optional smoothing (moving average) to reduce noise
    const smoothed: Vector3[] = []
    const window = 3
    for (let i = 0; i < centroids.length; i++) {
      let sx = 0, sy = 0, sz = 0, n = 0
      for (let w = -window; w <= window; w++) {
        const j = i + w
        if (j >= 0 && j < centroids.length) {
          sx += centroids[j].x
          sy += centroids[j].y
          sz += centroids[j].z
          n++
        }
      }
      smoothed.push(new Vector3(sx / n, sy / n, sz / n))
    }
    
    // Sum distances along the smoothed polyline
    let length = 0
    for (let i = 1; i < smoothed.length; i++) {
      length += smoothed[i].distanceTo(smoothed[i - 1])
    }
    
    // Sanity checks: length should be at least as large as the dominant dimension
    // Compute bounding box size from input meshes
    const min = new Vector3(Infinity, Infinity, Infinity)
    const max = new Vector3(-Infinity, -Infinity, -Infinity)
    for (const p of points) {
      min.x = Math.min(min.x, p.x); min.y = Math.min(min.y, p.y); min.z = Math.min(min.z, p.z)
      max.x = Math.max(max.x, p.x); max.y = Math.max(max.y, p.y); max.z = Math.max(max.z, p.z)
    }
    const size = new Vector3().subVectors(max, min)
    const dominantDimension = Math.max(size.x, size.y, size.z)
    
    if (!isFinite(length) || length <= 0) return 0
    
    // If computed length is suspiciously small compared to dominant dimension, fallback
    if (length < dominantDimension * 0.8) {
      return 0
    }
    
    return length
  } catch {
    return 0
  }
}

function buildSlicedCenterline(
  meshes: Array<{ geometry: BufferGeometry }>,
  numSlices: number = 80
): Vector3[] {
  const points = samplePointsFromMeshes(meshes, 2500)
  if (points.length < 10) return []

  const axis = computePrincipalAxis(points)
  if (!axis) return []

  const origin = new Vector3(0, 0, 0)
  for (const point of points) origin.add(point)
  origin.multiplyScalar(1 / points.length)

  const projections: number[] = new Array(points.length)
  let minProj = Infinity
  let maxProj = -Infinity

  for (let i = 0; i < points.length; i++) {
    const projection = points[i].clone().sub(origin).dot(axis)
    projections[i] = projection
    minProj = Math.min(minProj, projection)
    maxProj = Math.max(maxProj, projection)
  }

  if (!isFinite(minProj) || !isFinite(maxProj) || maxProj <= minProj) {
    return []
  }

  const sumX = new Array<number>(numSlices).fill(0)
  const sumY = new Array<number>(numSlices).fill(0)
  const sumZ = new Array<number>(numSlices).fill(0)
  const counts = new Array<number>(numSlices).fill(0)

  for (let i = 0; i < points.length; i++) {
    const index = Math.min(
      numSlices - 1,
      Math.max(0, Math.floor(((projections[i] - minProj) / (maxProj - minProj)) * numSlices))
    )
    sumX[index] += points[i].x
    sumY[index] += points[i].y
    sumZ[index] += points[i].z
    counts[index] += 1
  }

  const centroids: Vector3[] = []
  for (let i = 0; i < numSlices; i++) {
    if (counts[i] > 0) {
      centroids.push(new Vector3(sumX[i] / counts[i], sumY[i] / counts[i], sumZ[i] / counts[i]))
    }
  }

  if (centroids.length < 2) {
    return []
  }

  const smoothed: Vector3[] = []
  const window = 2
  for (let i = 0; i < centroids.length; i++) {
    const point = new Vector3(0, 0, 0)
    let count = 0

    for (let offset = -window; offset <= window; offset++) {
      const index = i + offset
      if (index >= 0 && index < centroids.length) {
        point.add(centroids[index])
        count++
      }
    }

    smoothed.push(point.multiplyScalar(1 / count))
  }

  return smoothed
}

function analyzeCenterlineDirectionChanges(meshes: Array<{ geometry: BufferGeometry }>): {
  success: boolean
  bends: number
  confidence: number
} {
  const centerline = buildSlicedCenterline(meshes)
  if (centerline.length < 8) {
    return { success: false, bends: 0, confidence: 0 }
  }

  const segmentLengths: number[] = []
  for (let i = 1; i < centerline.length; i++) {
    const length = centerline[i].distanceTo(centerline[i - 1])
    if (length > 1e-6) {
      segmentLengths.push(length)
    }
  }

  if (segmentLengths.length < 4) {
    return { success: false, bends: 0, confidence: 0 }
  }

  segmentLengths.sort((a, b) => a - b)
  const medianSegmentLength = segmentLengths[Math.floor(segmentLengths.length / 2)] || 1
  const angleThreshold = 0.35 // ~20 degrees, high enough to ignore mesh tessellation.
  const bendCandidates: Array<{ index: number; angle: number }> = []

  for (let i = 2; i < centerline.length - 2; i++) {
    const before = centerline[i].clone().sub(centerline[i - 2])
    const after = centerline[i + 2].clone().sub(centerline[i])

    if (before.length() < medianSegmentLength * 0.35 || after.length() < medianSegmentLength * 0.35) {
      continue
    }

    const angle = before.normalize().angleTo(after.normalize())
    if (angle > angleThreshold) {
      bendCandidates.push({ index: i, angle })
    }
  }

  const clusters: Array<Array<{ index: number; angle: number }>> = []
  for (const candidate of bendCandidates) {
    const previousCluster = clusters[clusters.length - 1]
    const previousCandidate = previousCluster?.[previousCluster.length - 1]

    if (previousCluster && previousCandidate && candidate.index - previousCandidate.index <= 2) {
      previousCluster.push(candidate)
    } else {
      clusters.push([candidate])
    }
  }

  const bendCount = clusters.filter(cluster => Math.max(...cluster.map(candidate => candidate.angle)) > angleThreshold).length
  const confidence = Math.min(0.78, Math.max(0.55, 0.5 + centerline.length / 80))

  cadDebugLog('Mesh centerline bend analysis:', {
    centerlinePoints: centerline.length,
    bendCandidates: bendCandidates.length,
    bendClusters: clusters.length,
    bendCount
  })

  return { success: true, bends: bendCount, confidence }
}

/**
 * Advanced bend analysis using geometric algorithms
 */
function analyzeBends(
  meshes: Array<{ geometry: BufferGeometry }>,
  boundingSize?: Vector3
): {
  bendCount: number
  totalVertices: number
  totalTriangles: number
  confidence: number
  method: string
} {
  let totalVertices = 0
  let totalTriangles = 0
  let bendCount = 0
  let confidence = 0.5 // Default confidence
  let method = 'mesh fallback'

  if (meshes.length === 0) {
    return { bendCount: 0, totalVertices: 0, totalTriangles: 0, confidence: 0, method: 'none' }
  }

  // Count vertices and triangles
  for (const mesh of meshes) {
    const geometry = mesh.geometry
    const positions = geometry.attributes.position
    const indices = geometry.index

    if (positions) {
      totalVertices += positions.count
    }

    if (indices) {
      totalTriangles += indices.count / 3
    }
  }

  // Use multiple analysis methods for better accuracy
  const methodEstimates: Array<{ bendCount: number; confidence: number; method: string }> = []

  // Method 1: Curvature analysis along the centerline
  const curvatureAnalysis = analyzeCurvature(meshes)
  if (curvatureAnalysis.success) {
    methodEstimates.push({
      bendCount: curvatureAnalysis.bends,
      confidence: curvatureAnalysis.confidence,
      method: 'curvature'
    })
  }

  // Method 2: Direction change analysis (improved version)
  const directionAnalysis = analyzeDirectionChanges(meshes)
  if (directionAnalysis.success) {
    methodEstimates.push({
      bendCount: directionAnalysis.bends,
      confidence: directionAnalysis.confidence,
      method: 'direction'
    })
  }

  // Method 3: Complexity-based heuristic (fallback)
  const complexityBends = estimateBendsFromComplexity(totalVertices, totalTriangles)
  methodEstimates.push({
    bendCount: complexityBends,
    confidence: 0.3, // Lower confidence for heuristic method
    method: 'complexity'
  })

  const curvatureEstimate = methodEstimates.find(method => method.method === 'curvature')
  const directionEstimate = methodEstimates.find(method => method.method === 'direction')

  // Calculate geometry slenderness to identify straight tubes
  let slenderRatio: number | null = null
  if (boundingSize) {
    const dims = [Math.abs(boundingSize.x), Math.abs(boundingSize.y), Math.abs(boundingSize.z)]
    dims.sort((a, b) => b - a)
    const longest = dims[0]
    const crossSpan = Math.max(dims[1], dims[2], 1e-3)
    if (longest > 0) {
      slenderRatio = longest / crossSpan
    }
  }

  const centerlineAnalysis = analyzeCenterlineDirectionChanges(meshes)

  if (centerlineAnalysis.success) {
    bendCount = centerlineAnalysis.bends
    confidence = centerlineAnalysis.confidence
    method = 'mesh centerline direction changes'
  } else if (methodEstimates.length > 0) {
    let sortedMethods = [...methodEstimates].sort((a, b) => b.confidence - a.confidence)

    // When the part is extremely slender, ignore low-confidence high-bend heuristics
    if (slenderRatio && slenderRatio > 8) {
      const filtered = sortedMethods.filter(method => !(method.confidence < 0.5 && method.bendCount > 2))
      if (filtered.length > 0) {
        sortedMethods = filtered
      }
    }

    const topMethods = sortedMethods.slice(0, 2) // Use top 2 methods
    const weightedSum = topMethods.reduce((sum, method) => sum + method.bendCount * method.confidence, 0)
    const totalWeight = topMethods.reduce((sum, method) => sum + method.confidence, 0)
    
    const highest = topMethods[0]
    const estimated = totalWeight > 0 ? weightedSum / totalWeight : 0

    // Default to weighted estimate
    bendCount = Math.round(estimated)
    confidence = highest.confidence // Use highest confidence
    method = highest.method

    const hasLowBendSignal = !!(
      (curvatureEstimate && curvatureEstimate.bendCount <= 1) ||
      (directionEstimate && directionEstimate.bendCount <= 1)
    )

    // If the geometry is nearly straight, trust the highest-confidence method directly
    if (slenderRatio && slenderRatio > 10) {
      if (highest.bendCount <= 1) {
        bendCount = highest.bendCount
        confidence = highest.confidence
      } else if (slenderRatio > 18 && highest.bendCount < bendCount) {
        bendCount = highest.bendCount
        confidence = highest.confidence
      }
    }

    if (slenderRatio && slenderRatio > 12 && hasLowBendSignal) {
      bendCount = Math.min(bendCount, 1)
      if (slenderRatio > 18) {
        bendCount = 0
      }
      confidence = Math.max(curvatureEstimate?.confidence ?? 0, directionEstimate?.confidence ?? 0, 0.5)
    }

    // Extremely slender parts should never report high bend counts
    if (slenderRatio && slenderRatio > 22) {
      bendCount = Math.min(bendCount, 1)
      if (slenderRatio > 30) {
        bendCount = 0
        confidence = Math.min(confidence, 0.6)
      }
    }
  }

  // Ensure reasonable bounds
  bendCount = Math.max(0, Math.min(bendCount, 20))

  return { bendCount, totalVertices, totalTriangles, confidence, method }
}

/**
 * Analyze curvature changes along the geometry
 */
function analyzeCurvature(meshes: Array<{ geometry: BufferGeometry }>): {
  success: boolean
  bends: number
  confidence: number
} {
  if (meshes.length !== 1) {
    return { success: false, bends: 0, confidence: 0 }
  }

  const geometry = meshes[0].geometry
  const positions = geometry.attributes.position

  if (!positions || positions.count < 20) {
    return { success: false, bends: 0, confidence: 0 }
  }

  // Sample points along the geometry
  const sampleCount = Math.min(100, Math.floor(positions.count / 5))
  const points: Vector3[] = []

  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor((i / (sampleCount - 1)) * (positions.count - 1))
    const point = new Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    )
    points.push(point)
  }

  // Calculate curvature at each point
  let significantCurvatureChanges = 0
  const curvatureThreshold = 0.2 // Reduce false positives from mesh tessellation

  for (let i = 2; i < points.length - 2; i++) {
    // Calculate curvature using 5-point stencil
    const p1 = points[i - 2]
    const p2 = points[i - 1]
    const p3 = points[i]
    const p4 = points[i + 1]
    const p5 = points[i + 2]

    // Calculate discrete curvature
    const v1 = p2.clone().sub(p1).normalize()
    const v2 = p3.clone().sub(p2).normalize()
    const v3 = p4.clone().sub(p3).normalize()
    const v4 = p5.clone().sub(p4).normalize()

    const angle1 = v1.angleTo(v2)
    const angle2 = v2.angleTo(v3)
    const angle3 = v3.angleTo(v4)

    // Look for significant changes in curvature
    const curvatureChange = Math.abs(angle2 - angle1) + Math.abs(angle3 - angle2)
    
    if (curvatureChange > curvatureThreshold) {
      significantCurvatureChanges++
    }
  }

  // Filter out noise - group nearby curvature changes
  const bendCount = Math.max(0, Math.floor(significantCurvatureChanges / 3))
  const confidence = Math.min(0.9, 0.5 + (sampleCount / 200)) // Higher confidence with more samples

  return { success: true, bends: bendCount, confidence }
}

/**
 * Analyze direction changes (improved version)
 */
function analyzeDirectionChanges(meshes: Array<{ geometry: BufferGeometry }>): {
  success: boolean
  bends: number
  confidence: number
} {
  if (meshes.length !== 1) {
    return { success: false, bends: 0, confidence: 0 }
  }

  const geometry = meshes[0].geometry
  const positions = geometry.attributes.position

  if (!positions || positions.count < 10) {
    return { success: false, bends: 0, confidence: 0 }
  }

  // Sample points with better distribution
  const sampleCount = Math.min(50, Math.floor(positions.count / 8))
  const points: Vector3[] = []

  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor((i / (sampleCount - 1)) * (positions.count - 1))
    const point = new Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    )
    points.push(point)
  }

  // Analyze direction changes with smoothing
  let significantDirectionChanges = 0
  const angleThreshold = 0.5 // ~29 degrees in radians to ignore minor mesh noise

  for (let i = 2; i < points.length - 2; i++) {
    // Use smoothed directions to reduce noise
    const dir1 = points[i].clone().sub(points[i - 2]).normalize()
    const dir2 = points[i + 2].clone().sub(points[i]).normalize()
    const angle = dir1.angleTo(dir2)

    if (angle > angleThreshold) {
      significantDirectionChanges++
    }
  }

  // Group nearby direction changes
  const bendCount = Math.max(0, Math.floor(significantDirectionChanges / 2))
  const confidence = 0.7 // Good confidence for direction analysis

  return { success: true, bends: bendCount, confidence }
}

/**
 * Estimate bends from geometry complexity (fallback method)
 */
function estimateBendsFromComplexity(totalVertices: number, totalTriangles: number): number {
  // Improved heuristic based on vertex density and triangle count
  if (totalVertices < 100) return 0 // Too simple to have bends

  // Base complexity score
  const complexityScore = Math.log(totalVertices) + Math.log(totalTriangles + 1)

  // Estimate bends from complexity. The previous bands let common brackets
  // (~5–8k triangles) report 8–10 bends purely from triangle density. Cap the
  // heuristic hard so it can never beat real STEP topology — when STEP signal
  // is missing we'd rather under-report and trigger manual review than send a
  // 10× quote.
  let estimatedBends = 0
  if (complexityScore > 11) {
    estimatedBends = Math.floor((complexityScore - 11) / 2)
  }

  return Math.min(estimatedBends, 3)
}

/**
 * Analyze geometry to extract tube bending information with enhanced unit handling
 */
async function analyzeGeometry(
  meshes: Array<{ geometry: BufferGeometry }>, 
  detectedUnits: string,
  originalFile?: File,
  originalUnits?: string,
  context?: {
    sourceFormat?: CADFileType
    previewKind?: CADPreviewKind
  }
): Promise<ParsedGeometry['analysis']> {
  if (meshes.length === 0) {
    return {
      sourceFormat: context?.sourceFormat,
      previewKind: context?.previewKind ?? 'none',
      totalLength: 0,
      estimatedBends: 0,
      estimatedCuts: 2, // Default assumption: 2 cuts (start and end)
      units: detectedUnits || 'unknown',
      originalUnits: originalUnits || detectedUnits || 'unknown',
      bendCalculationMethod: 'none',
      bendConfidence: 0,
      cutCalculationMethod: 'single tube endpoints',
      cutConfidence: 0,
      instantQuoteEligible: false,
      quoteConfidence: 0,
      quoteBlockingReasons: ['No renderable geometry was found in the CAD file.'],
      requiresManualReview: true,
      warnings: ['No renderable geometry was found in the CAD file.'],
      boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
        size: { x: 0, y: 0, z: 0 }
      }
    }
  }

  // Calculate overall bounding box
  const overallBox = new Box3()
  
  for (const mesh of meshes) {
    if (mesh.geometry.boundingBox) {
      overallBox.union(mesh.geometry.boundingBox)
    }
  }

  const size = overallBox.getSize(new Vector3())
  
  // The parser should receive authoritative units from the importer.
  // Do not reinterpret STEP/IGES mesh coordinates from bounding-box heuristics.
  const unitValidation = validateUnitsAgainstGeometry(detectedUnits, size)
  const finalUnits = detectedUnits
  const warnings: string[] = []

  cadDebugLog(`Unit validation - Units: ${finalUnits}, Confidence: ${unitValidation.confidence.toFixed(2)}, Max dimension: ${Math.max(size.x, size.y, size.z).toFixed(3)}`)

  const stepFeatures = originalFile && /\.(step|stp)$/i.test(originalFile.name)
    ? await analyzeStepTubeFeatures(originalFile, size)
    : null

  // Prefer STEP topology for bends when available. Mesh triangle order is not a
  // manufacturing feature list, so it stays as a fallback.
  const bendAnalysis = analyzeBends(meshes, size)
  let estimatedBends = bendAnalysis.bendCount
  let bendCalculationMethod = bendAnalysis.method
  let bendConfidence = bendAnalysis.confidence

  if (stepFeatures && typeof stepFeatures.bendCount === 'number' && stepFeatures.bendConfidence >= 0.65) {
    estimatedBends = stepFeatures.bendCount
    bendCalculationMethod = stepFeatures.bendMethod
    bendConfidence = stepFeatures.bendConfidence
  } else if (stepFeatures && stepFeatures.partShape === 'flat-sheet') {
    // Flat sheet should never carry a bending charge regardless of mesh noise.
    estimatedBends = 0
    bendCalculationMethod = stepFeatures.bendMethod
    bendConfidence = stepFeatures.bendConfidence
  } else if (stepFeatures && stepFeatures.partShape === 'sheet-bracket' && bendAnalysis.bendCount > 3) {
    // Reject mesh heuristics that exceed paired sheet-bend cylinder evidence.
    estimatedBends = Math.min(bendAnalysis.bendCount, stepFeatures.bendCount ?? 0)
    bendCalculationMethod = stepFeatures.bendMethod
    bendConfidence = Math.max(stepFeatures.bendConfidence, 0.6)
  }

  const totalVertices = bendAnalysis.totalVertices
  const totalTriangles = bendAnalysis.totalTriangles

  // Saw cuts are tube endpoints by default. Bends and drilled holes should not
  // inflate this value. Sheet-laser parts have no saw cuts at all (the perimeter
  // IS the cut and is priced via material).
  const isSheetShape = stepFeatures?.partShape === 'flat-sheet' || stepFeatures?.partShape === 'sheet-bracket'
  const estimatedCuts = isSheetShape ? 0 : stepFeatures?.cutCount ?? 2
  const cutCalculationMethod = isSheetShape
    ? 'sheet metal — perimeter included in material'
    : stepFeatures?.cutMethod ?? 'single tube endpoints'
  const cutConfidence = stepFeatures?.cutConfidence ?? 0.8

  // Calculate tube length using multiple methods
  const lengthResults = await calculateTubeLengthMultiMethod(meshes, size)

  // Convert final length to millimeters for consistent storage. Sheet-shape parts
  // use their longest bounding-box dimension as the "length" for material weight,
  // since the parser's centerline-based length doesn't apply to flat parts.
  const sheetLengthMM = (() => {
    if (!isSheetShape || !size) return 0
    const longest = Math.max(size.x, size.y, size.z)
    return convertToMillimeters(longest, finalUnits)
  })()
  const tubeLengthMM = convertToMillimeters(lengthResults.bestLength, finalUnits)
  const lengthInMM = isSheetShape ? sheetLengthMM : tubeLengthMM
  const lengthConfidence = isSheetShape ? 0.85 : lengthResults.confidence
  const lengthCalculationMethod = isSheetShape
    ? 'sheet metal — longest bounding-box edge'
    : lengthResults.method

  // Sheet shapes don't need the tube centerline length, so they shouldn't be
  // gated on tube-length confidence. Other shapes still get the manual-review
  // safety net when length detection is unreliable.
  const requiresManualReview = lengthInMM <= 0 || (!isSheetShape && lengthResults.confidence < 0.55)

  if (requiresManualReview) {
    warnings.push('Automated length detection is low confidence; engineering review is required before quoting.')
  }

  const quoteConfidence = requiresManualReview
    ? 0
    : Math.min(
        0.95,
        Math.max(0, lengthConfidence) * 0.45 +
          Math.max(0, bendConfidence) * 0.35 +
          Math.max(0, cutConfidence) * 0.2
      )

  // Recommend the right service based on geometry. Users can override but the
  // default should produce an instant, sensible quote without manual fiddling.
  let recommendedService: 'tube-bending' | 'tube-laser' | 'sheet-laser' | 'straight-cut' | '3d-printing'
  if (stepFeatures?.partShape === 'flat-sheet') {
    recommendedService = 'sheet-laser'
  } else if (stepFeatures?.partShape === 'sheet-bracket') {
    recommendedService = 'sheet-laser'
  } else if (estimatedBends > 0) {
    recommendedService = 'tube-bending'
  } else if (stepFeatures?.laserFeatureCount && stepFeatures.laserFeatureCount > 0) {
    recommendedService = 'tube-laser'
  } else {
    recommendedService = 'straight-cut'
  }

  const partThicknessMm = stepFeatures
    ? convertToMillimeters(Math.min(size.x, size.y, size.z), finalUnits)
    : convertToMillimeters(Math.min(size.x, size.y, size.z), finalUnits)

  const features = buildFeatureList({
    stepFeatures,
    boundingBox: overallBox,
    size,
    sourceUnits: finalUnits,
    partThicknessMm,
    estimatedBends,
    estimatedCuts,
  })

  const analysis: CADAnalysis = {
    sourceFormat: context?.sourceFormat,
    previewKind: context?.previewKind ?? 'mesh3d',
    totalLength: lengthInMM, // Store in millimeters for consistency
    estimatedBends,
    estimatedCuts,
    laserFeatureCount: stepFeatures?.laserFeatureCount ?? 0,
    partShape: stepFeatures?.partShape ?? 'unknown',
    recommendedService,
    units: 'millimeter', // Always store as millimeter
    originalUnits: originalUnits || finalUnits, // Keep track of original file units when known
    unitConfidence: unitValidation.confidence,
    lengthCalculationMethod,
    lengthConfidence,
    bendCalculationMethod,
    bendConfidence,
    cutCalculationMethod,
    cutConfidence,
    instantQuoteEligible: !requiresManualReview,
    quoteConfidence,
    quoteBlockingReasons: requiresManualReview ? warnings : [],
    requiresManualReview,
    warnings,
    boundingBox: {
      min: { x: overallBox.min.x, y: overallBox.min.y, z: overallBox.min.z },
      max: { x: overallBox.max.x, y: overallBox.max.y, z: overallBox.max.z },
      size: { x: size.x, y: size.y, z: size.z }
    },
    features,
  }

  cadDebugLog('Enhanced geometry analysis:', {
    totalVertices,
    totalTriangles,
    boundingBoxSize: size,
    estimatedBends,
    bendCalculationMethod,
    bendConfidence,
    estimatedCuts,
    cutCalculationMethod,
    stepFeatures,
    totalLengthMM: analysis.totalLength,
    originalUnits: finalUnits,
    unitConfidence: unitValidation.confidence,
    calculationMethod: lengthResults.method,
    lengthConfidence: lengthResults.confidence
  })

  return analysis
}

function normalizeDisplayMeshes(
  meshes: ParsedGeometry['meshes'],
  options: CADParserOptions
): ParsedGeometry['meshes'] {
  if (meshes.length === 0) {
    return meshes
  }

  const overallBox = new Box3()

  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox()
    if (mesh.geometry.boundingBox) {
      overallBox.union(mesh.geometry.boundingBox)
    }
  }

  if (overallBox.isEmpty()) {
    return meshes
  }

  const size = overallBox.getSize(new Vector3())
  const center = overallBox.getCenter(new Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)
  const autoScale = maxSize > 0 ? 10 / maxSize : 1
  const requestedScale = options.scale && options.scale !== 1 ? options.scale : 1
  const displayScale = autoScale * requestedScale

  return meshes.map(mesh => {
    const geometry = mesh.geometry.clone()

    if (options.centerGeometry !== false) {
      geometry.translate(-center.x, -center.y, -center.z)
    }

    if (displayScale !== 1) {
      geometry.scale(displayScale, displayScale, displayScale)
    }

    geometry.computeBoundingBox()
    geometry.computeVertexNormals()

    return {
      ...mesh,
      geometry
    }
  })
}

/**
 * Parse STEP or IGES files using occt-import-js
 */
async function parseStepOrIges(
  file: File, 
  fileType: 'step' | 'iges',
  options: CADParserOptions = {}
): Promise<ParsedGeometry> {
  try {
    // Dynamic import and initialize the library if not already done
    if (!occtInstance) {
      const occtimportjs = await import('occt-import-js')
      
      // Configure the WASM path
      const occtImportFactory = occtimportjs.default as (options?: {
        locateFile?: (path: string) => string
      }) => Promise<OcctImporter>
      
      // Initialize with WASM path configuration
      occtInstance = await occtImportFactory({
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return `/occt-import-js.wasm`
          }
          return path
        }
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    cadDebugLog(`Parsing ${fileType.toUpperCase()} file with size:`, uint8Array.length, 'bytes')

    const triangulationParams = {
      linearUnit: 'millimeter' as const,
      linearDeflectionType: 'bounding_box_ratio' as const,
      linearDeflection: 0.001,
      angularDeflection: 0.5
    }

    // Call the appropriate parsing method. The output unit is authoritative.
    const result = fileType === 'step' 
      ? occtInstance.ReadStepFile(uint8Array, triangulationParams)
      : occtInstance.ReadIgesFile(uint8Array, triangulationParams)

    cadDebugLog('Parse result:', result)

    if (!result || !result.success) {
      throw new Error(`Failed to parse ${fileType.toUpperCase()} file: ${result?.errorText || 'Unknown error'}`)
    }

    const detectedUnits = 'millimeter'
    const originalUnits = fileType === 'step' ? await parseUnitsFromStepFile(file) : undefined
    cadDebugLog(`Using ${detectedUnits} output units for ${fileType.toUpperCase()} file`, { originalUnits })

    // Keep original meshes for accurate analysis, and separate display meshes for viewer scaling/centering
    const analysisMeshes: ParsedGeometry['meshes'] = []
    const displayMeshes: ParsedGeometry['meshes'] = []

    // Process the parsed mesh data (using the correct structure from examples)
    if (result.meshes && Array.isArray(result.meshes)) {
      cadDebugLog(`Processing ${result.meshes.length} meshes from parsed file`)
      
      for (let i = 0; i < result.meshes.length; i++) {
        const meshData = result.meshes[i]
        const geometryOriginal = new BufferGeometry()

        cadDebugLog(`Processing mesh ${i + 1}:`, {
          hasAttributes: !!meshData.attributes,
          hasPosition: !!(meshData.attributes?.position),
          hasNormal: !!(meshData.attributes?.normal),
          hasIndex: !!meshData.index,
          name: meshData.name
        })

        // Extract vertices (this is the correct structure from the examples)
        if (meshData.attributes?.position?.array) {
          const positions = new Float32Array(meshData.attributes.position.array)
          geometryOriginal.setAttribute('position', new BufferAttribute(positions, 3))
          cadDebugLog(`Added ${positions.length / 3} vertices to mesh ${i + 1}`)
        } else {
          cadDebugWarn(`Mesh ${i + 1} has no position data`)
          continue // Skip this mesh if no vertices
        }

        // Extract normals if available
        if (meshData.attributes?.normal?.array) {
          const normals = new Float32Array(meshData.attributes.normal.array)
          geometryOriginal.setAttribute('normal', new BufferAttribute(normals, 3))
          cadDebugLog(`Added normals to mesh ${i + 1}`)
        }

        // Extract indices if available
        if (meshData.index?.array) {
          const indices = new Uint32Array(meshData.index.array)
          geometryOriginal.setIndex(new BufferAttribute(indices, 1))
          cadDebugLog(`Added ${indices.length} indices to mesh ${i + 1}`)
        }

        // Compute missing normals and bounding box on original geometry
        if (!geometryOriginal.attributes.normal) {
          geometryOriginal.computeVertexNormals()
          cadDebugLog(`Computed vertex normals for mesh ${i + 1}`)
        }
        
        geometryOriginal.computeBoundingBox()
        
        const bbox = geometryOriginal.boundingBox!
        const size = bbox.getSize(new Vector3())
        const center = bbox.getCenter(new Vector3())
        
        cadDebugLog(`Mesh ${i + 1} bounding box:`, {
          min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
          size: { x: size.x, y: size.y, z: size.z },
          center: { x: center.x, y: center.y, z: center.z }
        })

        // Store original meshes for analysis; display meshes get one global transform later.
        analysisMeshes.push({ geometry: geometryOriginal })
        displayMeshes.push({ geometry: geometryOriginal })
        cadDebugLog(`Successfully processed mesh ${i + 1}`)
      }
    }

    // If no meshes found in standard format, try alternative data structure
    if (analysisMeshes.length === 0 && result.root) {
      cadDebugLog('Trying alternative data structure parsing...')
      
      // Create a simple geometry from basic vertex data if available
      const geometryOriginal = new BufferGeometry()
      
      // Try to find vertex data in different possible locations
      let vertices: number[] = []
      let indices: number[] = []
      
      if (result.root.vertices) {
        vertices = result.root.vertices
      }
      
      if (result.root.indices) {
        indices = result.root.indices
      }

      if (vertices.length > 0) {
        geometryOriginal.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
        
        if (indices.length > 0) {
          geometryOriginal.setIndex(new BufferAttribute(new Uint32Array(indices), 1))
        }
        
        geometryOriginal.computeVertexNormals()
        geometryOriginal.computeBoundingBox()

        analysisMeshes.push({ geometry: geometryOriginal })
        displayMeshes.push({ geometry: geometryOriginal })
      }
    }

    if (analysisMeshes.length === 0) {
      throw new Error('No valid geometry found in file. The file may not contain renderable mesh data.')
    }

    const normalizedDisplayMeshes = normalizeDisplayMeshes(displayMeshes, options)

    // Analyze the geometry for length, bends, and cuts
    const capability = getCadFormatCapability(file.name.split('.').pop()) ?? getCadFormatCapability(fileType)
    const analysis = await analyzeGeometry(
      analysisMeshes,
      detectedUnits,
      file,
      originalUnits || undefined,
      {
        sourceFormat: capability?.extension ?? fileType,
        previewKind: capability?.previewKind ?? 'mesh3d',
      }
    )

    cadDebugLog(`Successfully extracted ${analysisMeshes.length} mesh(es) from ${fileType.toUpperCase()} file`)
    cadDebugLog('Geometry Analysis:', analysis)

    return { meshes: normalizedDisplayMeshes, analysis }

  } catch (error) {
    cadDebugWarn(`Error parsing ${fileType.toUpperCase()} file:`, error)
    throw new Error(`Failed to parse ${fileType.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Try to build an extruded sheet-metal preview from a DXF string. Returns null
 * when no closed contours can be extracted (in which case the caller falls back
 * to the line-based 2D preview).
 */
async function tryBuildExtrudedSheet(
  dxfText: string,
  options: CADParserOptions,
): Promise<ParsedGeometry | null> {
  let polylines: Array<{ vertices: Array<[number, number, number?]> }>
  try {
    const dxfModule = await import('dxf')
    const helper = new dxfModule.Helper(dxfText)
    const result = helper.toPolylines()
    polylines = result.polylines as Array<{ vertices: Array<[number, number, number?]> }>
  } catch (err) {
    cadDebugWarn('Extruded preview: dxf package failed to parse, falling back to line preview', err)
    return null
  }

  if (!polylines || polylines.length === 0) return null

  const bbox = boundingBoxOfPolylines(polylines)
  if (!bbox || bbox.width === 0 || bbox.height === 0) return null

  // Heuristic: estimate the drawing's units from its bbox, then convert the
  // geometry to millimeters BEFORE meshing. Everything downstream (analysis
  // bounding box, measurement overlays, dimension arrows, quote length) treats
  // coordinates as mm, so converting at the door keeps them all consistent.
  const detectedUnits = estimateUnitsFromGeometry(
    new Vector3(bbox.width, bbox.height, 0),
  )
  const toMm = detectedUnits === 'inch' ? 25.4 : 1
  const mmPolylines =
    toMm === 1
      ? polylines
      : polylines.map(pl => ({
          vertices: pl.vertices.map(
            v => [v[0] * toMm, v[1] * toMm, (v[2] ?? 0) * toMm] as [number, number, number],
          ),
        }))

  const { meshes, shapeCount, holeCount, weldedContourCount } = buildExtrudedSheetMeshes(
    mmPolylines,
    DEFAULT_SHEET_PREVIEW_THICKNESS_MM,
  )
  if (shapeCount === 0) return null

  const analysisMeshes = meshes
  const displayMeshes = meshes

  const analysis = await analyzeGeometry(
    analysisMeshes,
    'millimeter',
    undefined,
    detectedUnits,
    {
      sourceFormat: 'dxf',
      previewKind: 'mesh3d',
    },
  )
  analysis.warnings = [
    ...(analysis.warnings ?? []),
    'Extruded preview generated from the flat DXF profile. Actual thickness depends on the gauge you pick during configuration.',
    ...(weldedContourCount > 0
      ? [
          `${weldedContourCount} contour${weldedContourCount === 1 ? ' was' : 's were'} not fully closed in the drawing — we closed ${weldedContourCount === 1 ? 'it' : 'them'} with a straight edge. Verify the preview matches your part.`,
        ]
      : []),
  ]
  analysis.partShape = 'flat-sheet'
  analysis.recommendedService = 'sheet-laser'
  // analyzeGeometry only applies its sheet rules when STEP topology says
  // sheet — for extruded DXF profiles it runs the tube heuristics and reports
  // phantom bends, saw cuts, and synthesized end-cut features on a flat plate.
  // Override with sheet semantics: length = longest flat dimension, no bends,
  // no saw cuts (the perimeter IS the cut), no tube features.
  const sizeMm = analysis.boundingBox.size
  analysis.totalLength = Math.max(sizeMm.x, sizeMm.y, sizeMm.z)
  analysis.lengthCalculationMethod = 'sheet metal — longest bounding-box edge'
  analysis.lengthConfidence = Math.max(analysis.lengthConfidence ?? 0, 0.85)
  analysis.estimatedBends = 0
  analysis.bendCalculationMethod = 'n/a — flat sheet'
  analysis.bendConfidence = 0.9
  analysis.estimatedCuts = 0
  analysis.cutCalculationMethod = 'sheet metal — perimeter included in material'
  analysis.cutConfidence = 0.9
  analysis.features = []
  analysis.requiresManualReview = analysis.totalLength <= 0
  analysis.instantQuoteEligible = !analysis.requiresManualReview
  // Laser pierce count: one per closed contour (outer profiles + interior holes).
  analysis.laserFeatureCount = shapeCount + holeCount
  analysis.quoteConfidence = Math.min(
    analysis.quoteConfidence ?? 0,
    weldedContourCount > 0 ? 0.6 : 0.75,
  )

  const normalizedDisplayMeshes = normalizeDisplayMeshes(displayMeshes, options)
  cadDebugLog(
    `Extruded DXF preview: ${shapeCount} shape(s), ${holeCount} hole(s), ${weldedContourCount} welded, units=${detectedUnits}`,
  )
  return { meshes: normalizedDisplayMeshes, analysis }
}

/**
 * Parse DXF files using three-dxf-loader
 */
async function parseDxf(file: File, options: CADParserOptions = {}): Promise<ParsedGeometry> {
  try {
    // Dynamic import to avoid potential SSR issues
    const { DXFLoader } = await import('three-dxf-loader')

    const loader = new DXFLoader()
    const text = await file.text()

    // Try the SendCutSend-style extruded-sheet preview first using the `dxf`
    // package — it handles SPLINE, ARC, INSERT/blocks, etc. better than the
    // hand-rolled line code below. If we get at least one extrudable closed
    // contour, render that as a 3D mesh3d preview.
    const extruded = await tryBuildExtrudedSheet(text, options)
    if (extruded) {
      return extruded
    }

    const dxfData = loader.parse(text)
    
    if (!dxfData) {
      throw new Error('Failed to parse DXF file')
    }

    const analysisMeshes: ParsedGeometry['meshes'] = []
    const displayMeshes: ParsedGeometry['meshes'] = []

    // Process DXF entities
    if (dxfData.entities) {
      // Create a single geometry from all DXF entities
      const geometry = new BufferGeometry()
      const positions: number[] = []
      const indices: number[] = []

      let vertexIndex = 0

      // Process lines, polylines, and other entities
      for (const entity of dxfData.entities) {
        if (entity.type === 'LINE' && entity.start && entity.end) {
          // Add line vertices
          positions.push(entity.start.x, entity.start.y, entity.start.z || 0)
          positions.push(entity.end.x, entity.end.y, entity.end.z || 0)
          
          // Add line indices
          indices.push(vertexIndex, vertexIndex + 1)
          vertexIndex += 2
        } else if (entity.type === 'ARC' && entity.center && typeof entity.radius === 'number') {
          const startAngle = entity.startAngle || 0
          const endAngle = entity.endAngle || Math.PI * 2
          const segments = 48
          let previousIndex: number | null = null

          for (let i = 0; i <= segments; i++) {
            const t = i / segments
            const angle = startAngle + (endAngle - startAngle) * t
            positions.push(
              entity.center.x + Math.cos(angle) * entity.radius,
              entity.center.y + Math.sin(angle) * entity.radius,
              entity.center.z || 0
            )

            if (previousIndex !== null) {
              indices.push(previousIndex, vertexIndex)
            }

            previousIndex = vertexIndex
            vertexIndex++
          }
        } else if (entity.type === 'CIRCLE' && entity.center && typeof entity.radius === 'number') {
          const segments = 96
          const firstIndex = vertexIndex
          let previousIndex: number | null = null

          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            positions.push(
              entity.center.x + Math.cos(angle) * entity.radius,
              entity.center.y + Math.sin(angle) * entity.radius,
              entity.center.z || 0
            )

            if (previousIndex !== null) {
              indices.push(previousIndex, vertexIndex)
            }

            previousIndex = vertexIndex
            vertexIndex++
          }

          indices.push(vertexIndex - 1, firstIndex)
        } else if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
          // Add polyline vertices
          const vertices = entity.vertices || []
          for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i]
            positions.push(vertex.x, vertex.y, vertex.z || 0)
            
            if (i > 0) {
              indices.push(vertexIndex - 1, vertexIndex)
            }
            vertexIndex++
          }
          
          // Close polyline if needed
          if (entity.closed && vertices.length > 2) {
            indices.push(vertexIndex - 1, vertexIndex - vertices.length)
          }
        }
        // Add more entity types as needed (CIRCLE, ARC, etc.)
      }

      if (positions.length > 0) {
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()
        geometry.computeBoundingBox()

        analysisMeshes.push({ geometry, renderMode: 'lines' })
        displayMeshes.push({ geometry, renderMode: 'lines' })
      }
    }

    if (analysisMeshes.length === 0) {
      throw new Error('No valid geometry found in DXF file')
    }

    // For DXF files, units are harder to detect, so we'll estimate from geometry
    let detectedUnits = 'millimeter' // Default for DXF

    if (analysisMeshes.length > 0) {
      const geometry = analysisMeshes[0].geometry
      if (geometry.boundingBox) {
        const size = geometry.boundingBox.getSize(new Vector3())
        detectedUnits = estimateUnitsFromGeometry(size)
      }
    }

    // Convert to millimeters at the door so the analysis bbox and overlays
    // agree (they all assume mm coordinates).
    if (detectedUnits === 'inch') {
      for (const mesh of analysisMeshes) {
        mesh.geometry.scale(25.4, 25.4, 25.4)
        mesh.geometry.computeBoundingBox()
      }
    }

    // Analyze the geometry
    const analysis = await analyzeGeometry(
      analysisMeshes,
      'millimeter',
      undefined,
      detectedUnits,
      {
        sourceFormat: 'dxf',
        previewKind: 'vector2d',
      }
    )
    analysis.warnings = [
      ...(analysis.warnings ?? []),
      'DXF preview is limited to supported 2D linework. Blocks, splines, dimensions, and annotations may need engineering review.',
    ]
    analysis.quoteConfidence = Math.min(analysis.quoteConfidence ?? 0, 0.65)
    const normalizedDisplayMeshes = normalizeDisplayMeshes(displayMeshes, options)

    cadDebugLog('DXF Geometry Analysis:', analysis)
    return { meshes: normalizedDisplayMeshes, analysis }

  } catch (error) {
    cadDebugWarn('Error parsing DXF file:', error)
    throw new Error(`Failed to parse DXF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Main CAD file parser function
 */
export async function parseCADFile(
  file: File,
  options: CADParserOptions = {}
): Promise<ParsedGeometry> {
  const fileName = file.name.toLowerCase()
  const extension = fileName.split('.').pop()

  const defaultOptions: CADParserOptions = {
    scale: 1,
    centerGeometry: true,
    ...options
  }

  // Hash and parse in parallel — the hash is small relative to parsing time on
  // typical STEP files but the two are completely independent.
  const [fileHash, parsed] = await Promise.all([
    computeFileHash(file),
    (async (): Promise<ParsedGeometry> => {
      switch (extension) {
        case 'step':
        case 'stp':
          return parseStepOrIges(file, 'step', defaultOptions)
        case 'iges':
        case 'igs':
          return parseStepOrIges(file, 'iges', defaultOptions)
        case 'dxf':
          return parseDxf(file, defaultOptions)
        case 'ai':
          return parseIllustrator(file)
        case 'dwg': {
          // parseDwg returns meshes in raw mm coordinates; normalize them to the
          // same ~10-unit display cube as every other path so dimension arrows
          // and feature hotspots (which assume normalized display space) line up.
          const parsed = await parseDwg(file)
          return { ...parsed, meshes: normalizeDisplayMeshes(parsed.meshes, defaultOptions) }
        }
        case 'eps':
          return buildManualReviewGeometry(extension)
        default:
          throw new Error(`Unsupported file format: ${extension}`)
      }
    })(),
  ])

  if (fileHash) {
    parsed.analysis = { ...parsed.analysis, fileHash }
  }
  return parsed
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return [...ACCEPTED_CAD_EXTENSIONS]
}

/**
 * Check if file extension is supported
 */
export function isSupportedFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop()
  return getSupportedExtensions().includes(extension || '')
}
