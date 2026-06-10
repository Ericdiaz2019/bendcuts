interface Material {
  id: string
  name: string
  pricePerLb: number
}

export type ManufacturingService =
  | 'tube-bending'
  | 'tube-laser'
  | 'sheet-laser'
  | 'straight-cut'
  | '3d-printing'

export const SERVICE_LABELS: Record<ManufacturingService, string> = {
  'tube-bending': 'Tube bending',
  'tube-laser': 'Tube laser cutting',
  'sheet-laser': 'Sheet laser cutting',
  'straight-cut': 'Straight tube cut',
  '3d-printing': '3D printing',
}

interface QuoteInputs {
  material: Material
  quantity: number
  gauge: string
  length: number // in inches
  bends: number
  cuts: number
  service?: ManufacturingService
  laserFeatures?: number
  /** Per-feature service add-ons (tapping, miters, tolerance). Each contributes costDeltaPerPart. */
  featureConfigs?: Array<{ costDeltaPerPart: number }>
}

export interface QuoteBreakdown {
  materialCost: number
  bendingCost: number
  cuttingCost: number
  laserCost: number
  setupCost: number
  laborCost: number
  subtotal: number
  tax: number
  total: number
  pricePerPart: number
  service: ManufacturingService
  appliedOps: {
    bending: boolean
    cutting: boolean
    laserFeatures: number
    printing: boolean
  }
  details: {
    materialWeight: number // in pounds
    bendingRate: number
    cuttingRate: number
    laserRate: number
    setupRate: number
    laborHours: number
    laborRate: number
  }
}

export interface PricingConfig {
  materialWeights: Record<string, number>
  bendingCostPerBend: number
  cuttingCostPerCut: number
  setupCost: number
  laborRate: number
  baseTimePerPart: number
  timePerBend: number
  timePerCut: number
  taxRate: number
  quantityDiscounts: Record<string, number>
  printRatePerLb?: number
  /** Per-pierce charge for laser-cut holes/slots (tube-laser & sheet-laser). */
  laserCostPerFeature?: number
  /**
   * Effective unrolled cross-section width (inches) used to turn gauge
   * thickness into weight-per-inch for metal parts. Until real cross-section
   * dimensions flow from CAD analysis into the quote, this is an explicit,
   * tunable assumption — 9" is calibrated so carbon-steel prices match the
   * legacy per-gauge weight table (≈3" OD tube unrolled).
   */
  effectiveWidthIn?: number
  /**
   * Effective solid cross-section (in²) for 3D-printed parts. 4.2 in² is
   * calibrated so PLA prices match the legacy table this formula replaces.
   */
  printSectionIn2?: number
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  // Legacy steel-calibrated lb/in table. Used only as a fallback when the
  // gauge label doesn't carry a parsable thickness — the physical formula in
  // weightPerInchLb is the primary path.
  materialWeights: {
    '24 AWG': 0.06,
    '22 AWG': 0.08,
    '20 AWG': 0.1,
    '18 AWG': 0.12,
    '16 AWG': 0.15,
    '14 AWG': 0.19,
    '12 AWG': 0.25,
    '11 AWG': 0.28,
    '10 AWG': 0.32,
    '9 AWG': 0.36,
    '8 AWG': 0.41,
    '7 AWG': 0.46,
    '3/16"': 0.55,
    '1/4"': 0.74,
    '5/16"': 0.92,
    '3/8"': 1.1,
    '1/2"': 1.46,
  },
  bendingCostPerBend: 15.0,
  cuttingCostPerCut: 8.0,
  setupCost: 75.0,
  laborRate: 65.0,
  baseTimePerPart: 0.25,
  timePerBend: 0.15,
  timePerCut: 0.08,
  taxRate: 0.08875,
  quantityDiscounts: {
    '1': 0,
    '11': 0.05,
    '51': 0.1,
    '101': 0.15,
  },
  printRatePerLb: 35.0,
  laserCostPerFeature: 2.0,
  effectiveWidthIn: 9.0,
  printSectionIn2: 4.2,
}

/** Thrown when a quote cannot be computed from the given inputs. */
export class QuoteError extends Error {}

/** Densities in lb/in³ for the material catalog. */
const MATERIAL_DENSITY_LB_IN3: Record<string, number> = {
  'carbon-steel': 0.284,
  'stainless-steel': 0.289,
  aluminum: 0.098,
  copper: 0.323,
}

const GCC_TO_LB_IN3 = 0.0361273

function materialDensityLbIn3(materialId: string): number | null {
  const exact = MATERIAL_DENSITY_LB_IN3[materialId]
  if (exact !== undefined) return exact
  // Loose matching for legacy/alias ids. Stainless must be checked before
  // plain steel — 'stainless-steel' contains both substrings.
  const id = materialId.toLowerCase()
  if (id.includes('stainless')) return MATERIAL_DENSITY_LB_IN3['stainless-steel']
  if (id.includes('steel')) return MATERIAL_DENSITY_LB_IN3['carbon-steel']
  if (id.includes('aluminum')) return MATERIAL_DENSITY_LB_IN3.aluminum
  if (id.includes('copper')) return MATERIAL_DENSITY_LB_IN3.copper
  return null
}

/** Parse the actual thickness from a gauge label like `14 AWG (0.075")`. */
function parseGaugeThicknessIn(gauge: string): number | null {
  const match = gauge.match(/\(([\d.]+)"\)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Parse the polymer density from a grade label like `PLA (1.24 g/cc)`. */
function parsePolymerDensityLbIn3(gauge: string): number | null {
  const match = gauge.match(/\(([\d.]+)\s*g\/cc\)/i)
  if (!match) return null
  const gcc = Number(match[1])
  return Number.isFinite(gcc) && gcc > 0 ? gcc * GCC_TO_LB_IN3 : null
}

function extractGaugeKey(gauge: string): string | null {
  const awgMatch = gauge.match(/(\d+)\s*AWG/i)
  if (awgMatch) {
    return `${awgMatch[1]} AWG`
  }
  const fractionMatch = gauge.match(/(\d+\/\d+)\s*"/)
  if (fractionMatch) {
    return `${fractionMatch[1]}"`
  }
  return null
}

function getQuantityDiscount(quantity: number, config: PricingConfig): number {
  const tiers = config.quantityDiscounts
  if (quantity >= 101) return tiers['101'] ?? 0
  if (quantity >= 51) return tiers['51'] ?? 0
  if (quantity >= 11) return tiers['11'] ?? 0
  return tiers['1'] ?? 0
}

/**
 * Weight per inch of part length, in pounds.
 *
 * Primary path is physical: thickness (from the gauge label) × effective
 * cross-section width × material density — so aluminum no longer prices at
 * steel weight, and 3D-print grades use their real polymer density. The
 * legacy steel lb/in table remains as a fallback for gauge labels without a
 * parsable thickness. Unknown gauges throw instead of silently pricing as
 * 14 AWG steel.
 */
function weightPerInchLb(
  materialId: string,
  gauge: string,
  service: ManufacturingService,
  config: PricingConfig,
): number {
  if (service === '3d-printing') {
    const density = parsePolymerDensityLbIn3(gauge)
    if (density !== null) {
      return density * (config.printSectionIn2 ?? 4.2)
    }
    throw new QuoteError(`Unknown print grade "${gauge}" — no density on file.`)
  }

  const thickness = parseGaugeThicknessIn(gauge)
  const density = materialDensityLbIn3(materialId)
  if (thickness !== null && density !== null) {
    return thickness * (config.effectiveWidthIn ?? 9.0) * density
  }

  const gaugeKey = extractGaugeKey(gauge)
  const tableWeight = gaugeKey !== null ? config.materialWeights[gaugeKey] : undefined
  if (tableWeight !== undefined) {
    return tableWeight
  }

  throw new QuoteError(`No weight data for gauge "${gauge}" — cannot quote this configuration.`)
}

function isBendingService(service: ManufacturingService): boolean {
  return service === 'tube-bending'
}

function isCuttingService(service: ManufacturingService): boolean {
  // Tube bending/laser/straight-cut have saw cuts at endpoints.
  // Sheet laser is priced via material/perimeter (no per-cut charge).
  // 3D printing has no cuts.
  return service === 'tube-bending' || service === 'tube-laser' || service === 'straight-cut'
}

function isLaserService(service: ManufacturingService): boolean {
  return service === 'tube-laser' || service === 'sheet-laser'
}

export function calculateQuote(
  inputs: QuoteInputs,
  config: PricingConfig = DEFAULT_PRICING_CONFIG,
): QuoteBreakdown {
  const { material, quantity, gauge, length, bends, cuts } = inputs
  const service: ManufacturingService = inputs.service ?? 'tube-bending'
  const laserFeatures = Math.max(0, Math.floor(inputs.laserFeatures ?? 0))

  const materialWeight = length * weightPerInchLb(material.id, gauge, service, config)

  const materialCostPerPart =
    service === '3d-printing'
      ? materialWeight * (config.printRatePerLb ?? 35) // includes machine time
      : materialWeight * material.pricePerLb
  const totalMaterialCost = materialCostPerPart * quantity

  const effectiveBends = isBendingService(service) ? bends : 0
  const bendingCostPerPart = effectiveBends * config.bendingCostPerBend
  const totalBendingCost = bendingCostPerPart * quantity

  const effectiveCuts = isCuttingService(service) ? cuts : 0
  const cuttingCostPerPart = effectiveCuts * config.cuttingCostPerCut
  const totalCuttingCost = cuttingCostPerPart * quantity

  const laserRate = config.laserCostPerFeature ?? 2.0
  const effectiveLaserFeatures = isLaserService(service) ? laserFeatures : 0
  const laserCostPerPart = effectiveLaserFeatures * laserRate
  const totalLaserCost = laserCostPerPart * quantity

  const laborTimePerPart =
    config.baseTimePerPart +
    effectiveBends * config.timePerBend +
    effectiveCuts * config.timePerCut
  const totalLaborHours = laborTimePerPart * quantity
  const totalLaborCost = totalLaborHours * config.laborRate

  const setupCost = config.setupCost

  const featureCostPerPart = (inputs.featureConfigs ?? []).reduce(
    (sum, fc) => sum + (fc.costDeltaPerPart || 0),
    0,
  )
  const totalFeatureCost = featureCostPerPart * quantity

  const subtotalBeforeDiscount =
    totalMaterialCost +
    totalBendingCost +
    totalCuttingCost +
    totalLaserCost +
    totalLaborCost +
    setupCost +
    totalFeatureCost

  const discount = getQuantityDiscount(quantity, config)
  const subtotal = subtotalBeforeDiscount * (1 - discount)

  const tax = subtotal * config.taxRate
  const total = subtotal + tax
  const pricePerPart = total / quantity

  return {
    materialCost: totalMaterialCost,
    bendingCost: totalBendingCost,
    cuttingCost: totalCuttingCost,
    laserCost: totalLaserCost,
    setupCost,
    laborCost: totalLaborCost,
    subtotal,
    tax,
    total,
    pricePerPart,
    service,
    appliedOps: {
      bending: isBendingService(service) && bends > 0,
      cutting: isCuttingService(service) && cuts > 0,
      laserFeatures: effectiveLaserFeatures,
      printing: service === '3d-printing',
    },
    details: {
      materialWeight,
      bendingRate: config.bendingCostPerBend,
      cuttingRate: config.cuttingCostPerCut,
      laserRate,
      setupRate: setupCost,
      laborHours: totalLaborHours,
      laborRate: config.laborRate,
    },
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}
