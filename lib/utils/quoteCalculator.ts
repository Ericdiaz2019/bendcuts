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

// Pricing constants (these would typically come from a database)
const PRICING_CONSTANTS = {
  // Material weight calculation (lbs per inch for different gauges)
  materialWeights: {
    '16 AWG': 0.15,
    '14 AWG': 0.19,
    '12 AWG': 0.25,
    '10 AWG': 0.32,
    '8 AWG': 0.41
  },
  
  // Labor and operation costs
  bendingCostPerBend: 15.00, // Base cost per bend
  cuttingCostPerCut: 8.00,   // Cost per cut
  setupCost: 75.00,          // One-time setup cost
  laborRate: 65.00,          // Per hour
  
  // Time estimates (in hours)
  baseTimePerPart: 0.25,     // Base handling time
  timePerBend: 0.15,         // Additional time per bend
  timePerCut: 0.08,          // Additional time per cut
  
  // Tax rate
  taxRate: 0.08875, // 8.875% (typical for NY)
  
  // Quantity discounts
  quantityDiscounts: {
    1: 0,      // No discount for 1-10 parts
    11: 0.05,  // 5% discount for 11-50 parts
    51: 0.10,  // 10% discount for 51-100 parts
    101: 0.15  // 15% discount for 100+ parts
  }
}

/**
 * Extract gauge thickness from gauge string
 */
function extractGaugeKey(gauge: string): string {
  const match = gauge.match(/(\d+)\s*AWG/)
  return match ? `${match[1]} AWG` : '14 AWG' // Default fallback
}

/**
 * Calculate quantity discount
 */
function getQuantityDiscount(quantity: number): number {
  if (quantity >= 101) return PRICING_CONSTANTS.quantityDiscounts[101]
  if (quantity >= 51) return PRICING_CONSTANTS.quantityDiscounts[51]
  if (quantity >= 11) return PRICING_CONSTANTS.quantityDiscounts[11]
  return PRICING_CONSTANTS.quantityDiscounts[1]
}

/**
 * Calculate material weight
 */
function calculateMaterialWeight(length: number, gauge: string): number {
  const gaugeKey = extractGaugeKey(gauge)
  const weightPerInch = PRICING_CONSTANTS.materialWeights[gaugeKey as keyof typeof PRICING_CONSTANTS.materialWeights] || 0.19
  return length * weightPerInch
}

/**
 * Calculate quote for tube bending project
 */
export function calculateQuote(inputs: QuoteInputs): QuoteBreakdown {
  console.log('💰 Calculating quote for:', inputs)
  
  const { material, quantity, gauge, length, bends, cuts } = inputs
  
  // Calculate material weight and cost
  const materialWeight = calculateMaterialWeight(length, gauge)
  const materialCostPerPart = materialWeight * material.pricePerLb
  const totalMaterialCost = materialCostPerPart * quantity
  
  // Calculate bending costs
  const bendingCostPerPart = bends * PRICING_CONSTANTS.bendingCostPerBend
  const totalBendingCost = bendingCostPerPart * quantity
  
  // Calculate cutting costs
  const cuttingCostPerPart = cuts * PRICING_CONSTANTS.cuttingCostPerCut
  const totalCuttingCost = cuttingCostPerPart * quantity
  
  // Calculate labor time and cost
  const laborTimePerPart = PRICING_CONSTANTS.baseTimePerPart + 
                          (bends * PRICING_CONSTANTS.timePerBend) + 
                          (cuts * PRICING_CONSTANTS.timePerCut)
  const totalLaborHours = laborTimePerPart * quantity
  const totalLaborCost = totalLaborHours * PRICING_CONSTANTS.laborRate
  
  // Setup cost (one-time regardless of quantity)
  const setupCost = PRICING_CONSTANTS.setupCost
  
  // Calculate subtotal before discounts
  const subtotalBeforeDiscount = totalMaterialCost + totalBendingCost + totalCuttingCost + totalLaborCost + setupCost
  
  // Apply quantity discount
  const discount = getQuantityDiscount(quantity)
  const discountAmount = subtotalBeforeDiscount * discount
  const subtotal = subtotalBeforeDiscount - discountAmount
  
  // Calculate tax and total
  const tax = subtotal * PRICING_CONSTANTS.taxRate
  const total = subtotal + tax
  const pricePerPart = total / quantity
  
  const quote: QuoteBreakdown = {
    materialCost: totalMaterialCost,
    bendingCost: totalBendingCost,
    cuttingCost: totalCuttingCost,
    setupCost: setupCost,
    laborCost: totalLaborCost,
    subtotal: subtotal,
    tax: tax,
    total: total,
    pricePerPart: pricePerPart,
    details: {
      materialWeight: materialWeight,
      bendingRate: PRICING_CONSTANTS.bendingCostPerBend,
      cuttingRate: PRICING_CONSTANTS.cuttingCostPerCut,
      setupRate: setupCost,
      laborHours: totalLaborHours,
      laborRate: PRICING_CONSTANTS.laborRate
    }
  }
  
  console.log('📊 Quote breakdown:', {
    inputs,
    materialWeight: materialWeight.toFixed(3) + ' lbs',
    laborHours: totalLaborHours.toFixed(2) + ' hrs',
    quantityDiscount: discount > 0 ? `${(discount * 100).toFixed(0)}%` : 'None',
    total: `$${total.toFixed(2)}`,
    pricePerPart: `$${pricePerPart.toFixed(2)}`
  })
  
  return quote
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