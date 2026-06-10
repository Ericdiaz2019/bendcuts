import type { CADAnalysis, Feature } from '@/lib/types/configuration'

const MM_PER_INCH = 25.4

export type SourceUnits = 'inch' | 'millimeter'

function scaleXyz<T extends { x: number; y: number; z: number }>(v: T, factor: number): T {
  return { ...v, x: v.x * factor, y: v.y * factor, z: v.z * factor }
}

function scaleFeature(feature: Feature, factor: number): Feature {
  const position: [number, number, number] = [
    feature.position[0] * factor,
    feature.position[1] * factor,
    feature.position[2] * factor,
  ]
  switch (feature.kind) {
    case 'bend':
      return { ...feature, position, centerlineRadiusMm: feature.centerlineRadiusMm * factor }
    case 'hole':
      return {
        ...feature,
        position,
        diameterMm: feature.diameterMm * factor,
        depthMm: feature.depthMm * factor,
      }
    case 'end-cut':
      return { ...feature, position }
  }
}

/**
 * Re-interpret an analysis under different source units.
 *
 * Unit-less 2D formats (DXF/DWG) get their units GUESSED at parse time; all
 * analysis lengths are stored in mm under that assumption. When the user
 * corrects the assumption (the drawing was really inches, not mm), every real
 * length scales by 25.4 — display meshes don't need touching because they're
 * normalized to a fixed-size display cube.
 *
 * Returns the same object when no change is needed.
 */
export function rescaleAnalysisUnits(analysis: CADAnalysis, to: SourceUnits): CADAnalysis {
  const from: SourceUnits = analysis.originalUnits === 'inch' ? 'inch' : 'millimeter'
  if (from === to) return analysis

  const factor = to === 'inch' ? MM_PER_INCH : 1 / MM_PER_INCH

  return {
    ...analysis,
    totalLength: analysis.totalLength * factor,
    originalUnits: to,
    unitConfidence: 1, // user-confirmed
    boundingBox: {
      min: scaleXyz(analysis.boundingBox.min, factor),
      max: scaleXyz(analysis.boundingBox.max, factor),
      size: scaleXyz(analysis.boundingBox.size, factor),
    },
    features: (analysis.features ?? []).map(f => scaleFeature(f, factor)),
  }
}
