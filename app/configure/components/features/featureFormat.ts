import type { Feature } from '@/lib/types/configuration'
import type { DisplayUnit } from '@/lib/configure/displayUnit'
import { formatDiameter, formatLength } from '@/lib/configure/displayUnit'

const MM_PER_INCH = 25.4

/** Legacy mm-only helper kept for callers that haven't adopted the unit hook yet. */
function formatMm(mm: number): string {
  if (mm >= 100) return `${(mm / 10).toFixed(1)} cm`
  return `${mm.toFixed(1)} mm`
}

/** Legacy inch-only helper kept for callers that haven't adopted the unit hook yet. */
function formatInch(mm: number): string {
  return `${(mm / MM_PER_INCH).toFixed(3)}″`
}

/** Compact dimension string for a feature row in the active display unit. */
export function describeFeatureDims(feature: Feature, unit: DisplayUnit = 'mm'): string {
  switch (feature.kind) {
    case 'bend':
      return `${feature.angleDeg}° · R ${formatDiameter(feature.centerlineRadiusMm, unit)}`
    case 'hole':
      return `Ø ${formatDiameter(feature.diameterMm, unit)} · ${formatLength(feature.depthMm, unit)} deep`
    case 'end-cut':
      return feature.endIndex === 0 ? 'Start end · square cut' : 'Finish end · square cut'
  }
}

/** A few words describing the feature itself (icon-adjacent label). */
export function featureTitle(feature: Feature, index: number): string {
  switch (feature.kind) {
    case 'bend':
      return `Bend ${index + 1}`
    case 'hole':
      return `Hole ${index + 1}`
    case 'end-cut':
      return feature.endIndex === 0 ? 'Start cut' : 'Finish cut'
  }
}

export { formatMm, formatInch }
