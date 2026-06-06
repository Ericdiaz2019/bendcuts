import type { ParsedGeometry } from '@/lib/cad/types'

export type ManualReviewFormat = 'eps' | 'ai' | 'dwg'

const labelByExt: Record<ManualReviewFormat, string> = {
  eps: 'Encapsulated PostScript (.eps)',
  ai: 'Adobe Illustrator (.ai)',
  dwg: 'AutoCAD Drawing (.dwg)',
}

/** Placeholder analysis for accepted formats that need a conversion service. */
export function buildManualReviewGeometry(extension: ManualReviewFormat): ParsedGeometry {
  return {
    meshes: [],
    analysis: {
      totalLength: 0,
      sourceFormat: extension,
      previewKind: 'none',
      estimatedBends: 0,
      estimatedCuts: 0,
      laserFeatureCount: 0,
      partShape: 'unknown',
      recommendedService: 'sheet-laser',
      units: 'millimeter',
      originalUnits: 'unknown',
      unitConfidence: 0,
      lengthCalculationMethod: 'manual review',
      lengthConfidence: 0,
      bendCalculationMethod: 'manual review',
      bendConfidence: 0,
      cutCalculationMethod: 'manual review',
      cutConfidence: 0,
      instantQuoteEligible: false,
      quoteConfidence: 0,
      quoteBlockingReasons: [
        `Automated preview and quote analysis are not available for ${labelByExt[extension]} yet.`,
      ],
      requiresManualReview: true,
      warnings: [
        `Preview unavailable for ${labelByExt[extension]}. Your file has been received and will be reviewed by our engineering team before quoting.`,
      ],
      boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
        size: { x: 0, y: 0, z: 0 },
      },
      features: [],
    },
  }
}
