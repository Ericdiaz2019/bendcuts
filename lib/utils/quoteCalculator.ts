interface Material {
  id: string
  name: string
  pricePerLb: number
}

interface QuoteInputs {
  material: Material
  quantity: number
  gauge: string
  length: number // in inches
  bends: number
  cuts: number
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
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  materialWeights: {
    '16 AWG': 0.15,
    '14 AWG': 0.19,
    '12 AWG': 0.25,
    '10 AWG': 0.32,
    '8 AWG': 0.41,
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
}

function extractGaugeKey(gauge: string): string {
  const match = gauge.match(/(\d+)\s*AWG/)
  return match ? `${match[1]} AWG` : '14 AWG'
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

export function calculateQuote(
  inputs: QuoteInputs,
  config: PricingConfig = DEFAULT_PRICING_CONFIG,
): QuoteBreakdown {
  const { material, quantity, gauge, length, bends, cuts } = inputs

  const materialWeight = calculateMaterialWeight(length, gauge, config)
  const materialCostPerPart = materialWeight * material.pricePerLb
  const totalMaterialCost = materialCostPerPart * quantity

  const bendingCostPerPart = bends * config.bendingCostPerBend
  const totalBendingCost = bendingCostPerPart * quantity

  const cuttingCostPerPart = cuts * config.cuttingCostPerCut
  const totalCuttingCost = cuttingCostPerPart * quantity

  const laborTimePerPart =
    config.baseTimePerPart + bends * config.timePerBend + cuts * config.timePerCut
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