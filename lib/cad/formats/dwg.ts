import type { ParsedGeometry } from '@/lib/cad/types'
import { buildManualReviewGeometry } from './manualReview'
import { buildExtrudedSheetMeshes, boundingBoxOfPolylines } from './extrudedSheet'

const DEFAULT_SHEET_PREVIEW_THICKNESS_MM = 2

interface ApiPolyline {
  vertices: Array<[number, number]>
  closed: boolean
}

interface ApiResponse {
  polylines: ApiPolyline[]
  skippedTypes?: string[]
}

interface ApiErrorResponse {
  error?: string
  detail?: string
  diagnostics?: {
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
    legacyEntityFallbackStatus?: string
    legacyEntityFallbackError?: string
    dxfFallbackStatus?: string
    dxfFallbackError?: string
    dxfFallbackPolylineCount?: number
    typeCounts?: Record<string, number>
    paperSpaceCount?: number
    totalEntities?: number
    skippedTypes?: string[]
  }
}

/**
 * Convert a DWG File to extruded sheet-metal geometry via the server-side
 * /api/cad/dwg-to-dxf route (libredwg-web WASM). The API returns the part's 2D
 * profile as JSON polylines. The route prefers libredwg's parsed database, then
 * tries the legacy entity table and DXF writer as fallbacks when the database
 * path returns no entities.
 */
export async function parseDwg(file: File): Promise<ParsedGeometry> {
  let payload: ApiResponse
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/cad/dwg-to-dxf', { method: 'POST', body: form })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiErrorResponse
      const diagnostics = body.diagnostics
      const diagnosticText = diagnostics
        ? [
            diagnostics.dwgVersion ? `version ${diagnostics.dwgVersion}` : null,
            diagnostics.dwgHeader && !diagnostics.dwgVersion ? `header ${diagnostics.dwgHeader}` : null,
            diagnostics.totalEntities !== undefined ? `${diagnostics.totalEntities} entities` : null,
            diagnostics.modelSpaceObjectCount !== undefined ? `${diagnostics.modelSpaceObjectCount} low-level model-space objects` : null,
            diagnostics.blockRecordCount !== undefined ? `${diagnostics.blockRecordCount} block records` : null,
            diagnostics.paperSpaceCount !== undefined ? `${diagnostics.paperSpaceCount} paper-space` : null,
            diagnostics.unknownEntityCount !== undefined ? `${diagnostics.unknownEntityCount} unknown entities` : null,
            diagnostics.legacyEntityFallbackStatus ? `legacy entity fallback ${diagnostics.legacyEntityFallbackStatus}` : null,
            diagnostics.legacyEntityTableCount !== undefined ? `${diagnostics.legacyEntityTableCount} legacy entities` : null,
            diagnostics.legacyEntityObjectResolutionCount !== undefined ? `${diagnostics.legacyEntityObjectResolutionCount} resolved legacy objects` : null,
            diagnostics.legacyEntityPolylineCount !== undefined ? `${diagnostics.legacyEntityPolylineCount} legacy polylines` : null,
            diagnostics.legacyEntityTypeCounts ? `legacy types ${JSON.stringify(diagnostics.legacyEntityTypeCounts)}` : null,
            diagnostics.legacyEntityFallbackError ? `legacy fallback error ${diagnostics.legacyEntityFallbackError}` : null,
            diagnostics.dxfFallbackStatus ? `DXF fallback ${diagnostics.dxfFallbackStatus}` : null,
            diagnostics.dxfFallbackPolylineCount !== undefined ? `${diagnostics.dxfFallbackPolylineCount} fallback polylines` : null,
            diagnostics.dxfFallbackError ? `fallback error ${diagnostics.dxfFallbackError}` : null,
            diagnostics.typeCounts ? `types ${JSON.stringify(diagnostics.typeCounts)}` : null,
            diagnostics.skippedTypes?.length ? `skipped ${diagnostics.skippedTypes.join(', ')}` : null,
          ].filter(Boolean).join('; ')
        : ''
      const detail = [body.error, body.detail, diagnosticText].filter(Boolean).join(' ')
      throw new Error(detail || `Converter returned HTTP ${res.status}`)
    }
    payload = (await res.json()) as ApiResponse
  } catch (err) {
    const manual = buildManualReviewGeometry('dwg')
    manual.analysis.quoteBlockingReasons = [
      err instanceof Error
        ? err.message
        : 'DWG conversion failed. Please re-save as DXF or STEP and re-upload.',
    ]
    manual.analysis.warnings = [
      "We accepted the DWG but couldn't generate a preview. Engineering will review before quoting.",
    ]
    return manual
  }

  const apiPolylines = payload.polylines ?? []
  if (apiPolylines.length === 0) {
    const manual = buildManualReviewGeometry('dwg')
    manual.analysis.quoteBlockingReasons = [
      'No 2D linework was found in this DWG. Sheet-metal parts must include LINE, ARC, CIRCLE, or POLYLINE entities.',
    ]
    return manual
  }

  // Adapt API polyline shape to the extruded-sheet builder.
  const polylines = apiPolylines.map((pl) => {
    if (pl.closed) {
      const last = pl.vertices[pl.vertices.length - 1]
      const first = pl.vertices[0]
      const closingMissing =
        !last || last[0] !== first[0] || last[1] !== first[1]
      const vertices: Array<[number, number]> = closingMissing
        ? [...pl.vertices, [first[0], first[1]]]
        : pl.vertices
      return { vertices }
    }
    return { vertices: pl.vertices }
  })

  const bbox = boundingBoxOfPolylines(polylines)
  if (!bbox || bbox.width === 0 || bbox.height === 0) {
    const manual = buildManualReviewGeometry('dwg')
    manual.analysis.quoteBlockingReasons = [
      'DWG was parsed but produced no usable bounding box. Re-export the part as DXF or STEP.',
    ]
    return manual
  }

  // Guess units from bbox size — same heuristic the DXF path uses.
  // (We avoid importing the giant cadFileParser; the heuristic is short.)
  const detectedUnits = guessUnits(bbox.width, bbox.height)
  const thickness =
    detectedUnits === 'inch'
      ? DEFAULT_SHEET_PREVIEW_THICKNESS_MM / 25.4
      : DEFAULT_SHEET_PREVIEW_THICKNESS_MM

  const { meshes, shapeCount } = buildExtrudedSheetMeshes(polylines, thickness)
  if (shapeCount === 0) {
    const manual = buildManualReviewGeometry('dwg')
    manual.analysis.warnings = [
      'DWG was parsed but no closed contours were found — extruded preview unavailable.',
    ]
    return manual
  }

  // Center the geometry so it sits balanced on the ground plane.
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  for (const m of meshes) {
    m.geometry.translate(-cx, -cy, 0)
    m.geometry.computeBoundingBox()
  }

  const widthUnits = bbox.width
  const heightUnits = bbox.height
  const widthMm = detectedUnits === 'inch' ? widthUnits * 25.4 : widthUnits
  const heightMm = detectedUnits === 'inch' ? heightUnits * 25.4 : heightUnits

  return {
    meshes,
    analysis: {
      sourceFormat: 'dwg',
      previewKind: 'mesh3d',
      totalLength: 0,
      estimatedBends: 0,
      estimatedCuts: shapeCount,
      laserFeatureCount: shapeCount,
      partShape: 'flat-sheet',
      recommendedService: 'sheet-laser',
      units: 'millimeter',
      originalUnits: detectedUnits,
      unitConfidence: 0.5,
      lengthCalculationMethod: 'flat profile from DWG',
      lengthConfidence: 0.5,
      bendCalculationMethod: 'n/a — flat sheet',
      bendConfidence: 1,
      cutCalculationMethod: 'closed contour count',
      cutConfidence: 0.6,
      instantQuoteEligible: true,
      quoteConfidence: 0.6,
      quoteBlockingReasons: [],
      requiresManualReview: false,
      warnings: payload.skippedTypes && payload.skippedTypes.length > 0
        ? [
            `DWG entities not yet supported and skipped: ${payload.skippedTypes.join(', ')}.`,
            'Extruded preview generated from the flat DWG profile. Actual thickness depends on the gauge you pick.',
          ]
        : ['Extruded preview generated from the flat DWG profile. Actual thickness depends on the gauge you pick.'],
      boundingBox: {
        min: { x: -widthMm / 2, y: -heightMm / 2, z: -thickness / 2 },
        max: { x: widthMm / 2, y: heightMm / 2, z: thickness / 2 },
        size: { x: widthMm, y: heightMm, z: thickness },
      },
      features: [],
    },
  }
}

/** Rough heuristic — same shape as the one in cadFileParser. */
function guessUnits(width: number, height: number): 'inch' | 'millimeter' {
  const max = Math.max(width, height)
  // Sheet metal parts are typically 1–48 in (25–1220 mm). If max < 60, it's
  // probably inches; otherwise mm. Crude but works for the >90% case.
  if (max < 60) return 'inch'
  return 'millimeter'
}
