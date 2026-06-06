import type { ParsedGeometry } from '@/lib/cad/types'
import { buildManualReviewGeometry } from './manualReview'

async function isPdfCompatibleIllustrator(file: File): Promise<boolean> {
  const header = await file.slice(0, 1024).text()
  return header.trimStart().startsWith('%PDF-') || header.includes('%PDF-')
}

export async function parseIllustrator(file: File): Promise<ParsedGeometry> {
  const pdfCompatible = await isPdfCompatibleIllustrator(file)

  if (!pdfCompatible) {
    const manual = buildManualReviewGeometry('ai')
    manual.analysis.quoteBlockingReasons = [
      'This Illustrator file is not PDF-compatible. Re-save it from Illustrator with "Create PDF Compatible File" enabled, or upload a STEP/DXF export.',
    ]
    manual.analysis.warnings = [
      'Legacy or non-PDF Illustrator files need engineering review before preview or quoting.',
    ]
    return manual
  }

  return {
    meshes: [],
    analysis: {
      sourceFormat: 'ai',
      previewKind: 'document2d',
      totalLength: 0,
      estimatedBends: 0,
      estimatedCuts: 0,
      laserFeatureCount: 0,
      partShape: 'unknown',
      recommendedService: 'sheet-laser',
      units: 'millimeter',
      originalUnits: 'unknown',
      unitConfidence: 0,
      lengthCalculationMethod: 'pdf-compatible Illustrator preview',
      lengthConfidence: 0,
      bendCalculationMethod: 'manual review',
      bendConfidence: 0,
      cutCalculationMethod: 'manual review',
      cutConfidence: 0,
      instantQuoteEligible: false,
      quoteConfidence: 0,
      quoteBlockingReasons: [
        'PDF-compatible Illustrator preview is available. Automated quote analysis still needs vector extraction and manufacturing validation.',
      ],
      requiresManualReview: true,
      warnings: [
        'PDF-compatible Illustrator preview loaded. Engineering review is required before quoting.',
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
