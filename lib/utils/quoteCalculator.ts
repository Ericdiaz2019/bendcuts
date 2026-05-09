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
}

export interface QuoteBreakdown {
  materialCost: number
  bendingCost: number
  cuttingCost: number
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
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
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
}

function extractGaugeKey(gauge: string): string {
  const awgMatch = gauge.match(/(\d+)\s*AWG/i)
  if (awgMatch) {
    return `${awgMatch[1]} AWG`
  }
  const fractionMatch = gauge.match(/(\d+\/\d+)\s*"/)
  if (fractionMatch) {
    return `${fractionMatch[1]}"`
  }
  return '14 AWG'
}

function getQuantityDiscount(quantity: number, config: PricingConfig): number {
  const tiers = config.quantityDiscounts
  if (quantity >= 101) return tiers['101'] ?? 0
  if (quantity >= 51) return tiers['51'] ?? 0
  if (quantity >= 11) return tiers['11'] ?? 0
  return tiers['1'] ?? 0
}

function calculateMaterialWeight(length: number, gauge: string, config: PricingConfig): number {
  const gaugeKey = extractGaugeKey(gauge)
  const weightPerInch = config.materialWeights[gaugeKey] ?? 0.19
  return length * weightPerInch
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

export function calculateQuote(
  inputs: QuoteInputs,
  config: PricingConfig = DEFAULT_PRICING_CONFIG,
): QuoteBreakdown {
  const { material, quantity, gauge, length, bends, cuts } = inputs
  const service: ManufacturingService = inputs.service ?? 'tube-bending'
  const laserFeatures = Math.max(0, Math.floor(inputs.laserFeatures ?? 0))

  const materialWeight = calculateMaterialWeight(length, gauge, config)

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

  const laborTimePerPart =
    config.baseTimePerPart +
    effectiveBends * config.timePerBend +
    effectiveCuts * config.timePerCut
  const totalLaborHours = laborTimePerPart * quantity
  const totalLaborCost = totalLaborHours * config.laborRate

  const setupCost = config.setupCost

  const subtotalBeforeDiscount =
    totalMaterialCost + totalBendingCost + totalCuttingCost + totalLaborCost + setupCost

  const discount = getQuantityDiscount(quantity, config)
  const subtotal = subtotalBeforeDiscount * (1 - discount)

  const tax = subtotal * config.taxRate
  const total = subtotal + tax
  const pricePerPart = total / quantity

  return {
    materialCost: totalMaterialCost,
    bendingCost: totalBendingCost,
    cuttingCost: totalCuttingCost,
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
      laserFeatures: service === 'tube-laser' || service === 'sheet-laser' ? laserFeatures : 0,
      printing: service === '3d-printing',
    },
    details: {
      materialWeight,
      bendingRate: config.bendingCostPerBend,
      cuttingRate: config.cuttingCostPerCut,
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

/**
 * Get pricing summary for different quantities
 */
export function getPricingSummary(inputs: Omit<QuoteInputs, 'quantity'>): Array<{
  quantity: number
  total: number
  pricePerPart: number
  savings?: number
}> {
  const quantities = [1, 10, 25, 50, 100]
  const baseQuote = calculateQuote({ ...inputs, quantity: 1 })

  return quantities.map(qty => {
    const quote = calculateQuote({ ...inputs, quantity: qty })
    const savings = qty > 1 ? (baseQuote.pricePerPart * qty) - quote.total : 0

    return {
      quantity: qty,
      total: quote.total,
      pricePerPart: quote.pricePerPart,
      savings: savings > 0 ? savings : undefined
    }
  })
}
