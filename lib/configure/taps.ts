export type TapStandard = 'metric' | 'sae'
export type TapKind = 'roll' | 'cut'

export interface TapSpec {
  id: string
  label: string
  standard: TapStandard
  kind: TapKind
  /** Recommended pilot-hole diameter (mm). Used to auto-pick the closest fit. */
  recommendedHoleDiameterMm: number
  /** Minimum sensible hole diameter (mm). Outside this range we warn. */
  minHoleDiameterMm: number
  /** Maximum sensible hole diameter (mm). */
  maxHoleDiameterMm: number
}

// Recommended drill sizes from Machinery's Handbook (75% thread engagement).
// Roll-form taps push material instead of cutting, so they need slightly larger pilots.
export const TAPS: TapSpec[] = [
  // Metric (roll-form for small fasteners, cut for >M6)
  { id: 'M2-0.4',  label: 'M2 x 0.4 Roll Tap',   standard: 'metric', kind: 'roll', recommendedHoleDiameterMm: 1.85, minHoleDiameterMm: 1.75, maxHoleDiameterMm: 1.95 },
  { id: 'M2.5-0.45', label: 'M2.5 x 0.45 Roll Tap', standard: 'metric', kind: 'roll', recommendedHoleDiameterMm: 2.30, minHoleDiameterMm: 2.20, maxHoleDiameterMm: 2.40 },
  { id: 'M3-0.5',  label: 'M3 x 0.5 Roll Tap',   standard: 'metric', kind: 'roll', recommendedHoleDiameterMm: 2.80, minHoleDiameterMm: 2.70, maxHoleDiameterMm: 2.90 },
  { id: 'M4-0.7',  label: 'M4 x 0.7 Roll Tap',   standard: 'metric', kind: 'roll', recommendedHoleDiameterMm: 3.70, minHoleDiameterMm: 3.55, maxHoleDiameterMm: 3.85 },
  { id: 'M5-0.8',  label: 'M5 x 0.8 Roll Tap',   standard: 'metric', kind: 'roll', recommendedHoleDiameterMm: 4.70, minHoleDiameterMm: 4.55, maxHoleDiameterMm: 4.85 },
  { id: 'M6-1.0',  label: 'M6 x 1.0 Roll Tap',   standard: 'metric', kind: 'roll', recommendedHoleDiameterMm: 5.60, minHoleDiameterMm: 5.40, maxHoleDiameterMm: 5.80 },
  { id: 'M8-1.25', label: 'M8 x 1.25 Cut Tap',   standard: 'metric', kind: 'cut',  recommendedHoleDiameterMm: 6.80, minHoleDiameterMm: 6.65, maxHoleDiameterMm: 6.95 },
  { id: 'M10-1.5', label: 'M10 x 1.5 Cut Tap',   standard: 'metric', kind: 'cut',  recommendedHoleDiameterMm: 8.50, minHoleDiameterMm: 8.35, maxHoleDiameterMm: 8.65 },
  { id: 'M12-1.75', label: 'M12 x 1.75 Cut Tap', standard: 'metric', kind: 'cut',  recommendedHoleDiameterMm: 10.30, minHoleDiameterMm: 10.10, maxHoleDiameterMm: 10.50 },

  // SAE / Imperial
  { id: '4-40',   label: '4-40 Roll Tap',   standard: 'sae', kind: 'roll', recommendedHoleDiameterMm: 2.46, minHoleDiameterMm: 2.36, maxHoleDiameterMm: 2.56 },
  { id: '6-32',   label: '6-32 Roll Tap',   standard: 'sae', kind: 'roll', recommendedHoleDiameterMm: 2.84, minHoleDiameterMm: 2.74, maxHoleDiameterMm: 2.94 },
  { id: '8-32',   label: '8-32 Roll Tap',   standard: 'sae', kind: 'roll', recommendedHoleDiameterMm: 3.45, minHoleDiameterMm: 3.35, maxHoleDiameterMm: 3.55 },
  { id: '10-24',  label: '10-24 Roll Tap',  standard: 'sae', kind: 'roll', recommendedHoleDiameterMm: 4.03, minHoleDiameterMm: 3.92, maxHoleDiameterMm: 4.14 },
  { id: '10-32',  label: '10-32 Roll Tap',  standard: 'sae', kind: 'roll', recommendedHoleDiameterMm: 4.22, minHoleDiameterMm: 4.12, maxHoleDiameterMm: 4.32 },
  { id: '1/4-20', label: '1/4 - 20 Roll Tap', standard: 'sae', kind: 'roll', recommendedHoleDiameterMm: 5.11, minHoleDiameterMm: 4.95, maxHoleDiameterMm: 5.25 },
  { id: '1/4-28', label: '1/4 - 28 Roll Tap', standard: 'sae', kind: 'roll', recommendedHoleDiameterMm: 5.50, minHoleDiameterMm: 5.40, maxHoleDiameterMm: 5.60 },
  { id: '5/16-18', label: '5/16 - 18 Cut Tap', standard: 'sae', kind: 'cut',  recommendedHoleDiameterMm: 6.53, minHoleDiameterMm: 6.40, maxHoleDiameterMm: 6.65 },
  { id: '5/16-24', label: '5/16 - 24 Cut Tap', standard: 'sae', kind: 'cut',  recommendedHoleDiameterMm: 6.91, minHoleDiameterMm: 6.80, maxHoleDiameterMm: 7.00 },
  { id: '3/8-16', label: '3/8 - 16 Cut Tap',   standard: 'sae', kind: 'cut',  recommendedHoleDiameterMm: 7.94, minHoleDiameterMm: 7.80, maxHoleDiameterMm: 8.05 },
  { id: '3/8-24', label: '3/8 - 24 Cut Tap',   standard: 'sae', kind: 'cut',  recommendedHoleDiameterMm: 8.46, minHoleDiameterMm: 8.30, maxHoleDiameterMm: 8.60 },
  { id: '1/2-13', label: '1/2 - 13 Cut Tap',   standard: 'sae', kind: 'cut',  recommendedHoleDiameterMm: 10.72, minHoleDiameterMm: 10.55, maxHoleDiameterMm: 10.90 },
  { id: '1/2-20', label: '1/2 - 20 Cut Tap',   standard: 'sae', kind: 'cut',  recommendedHoleDiameterMm: 11.50, minHoleDiameterMm: 11.30, maxHoleDiameterMm: 11.70 },
]

const TAP_INDEX = new Map(TAPS.map(t => [t.id, t]))

export function findTap(id: string): TapSpec | undefined {
  return TAP_INDEX.get(id)
}

/** Return the tap whose recommended pilot-hole is closest to `holeDiameterMm`. */
export function recommendTap(holeDiameterMm: number): TapSpec {
  let best = TAPS[0]
  let bestDelta = Infinity
  for (const t of TAPS) {
    const delta = Math.abs(t.recommendedHoleDiameterMm - holeDiameterMm)
    if (delta < bestDelta) {
      best = t
      bestDelta = delta
    }
  }
  return best
}

/** True if the tap is reasonably applicable to a hole of this diameter (within tolerance). */
export function isTapApplicable(tap: TapSpec, holeDiameterMm: number): boolean {
  return holeDiameterMm >= tap.minHoleDiameterMm && holeDiameterMm <= tap.maxHoleDiameterMm
}

/** Per-hole tapping cost. Cut taps are slower/dearer than roll taps. */
export function tapCostPerHole(tap: TapSpec): number {
  return tap.kind === 'cut' ? 2.5 + 1.5 : 2.5 + 0.75
}

export function tapsByStandard(): Record<TapStandard, TapSpec[]> {
  return {
    metric: TAPS.filter(t => t.standard === 'metric'),
    sae: TAPS.filter(t => t.standard === 'sae'),
  }
}
