import { Material, TubeSpecification, ManufacturingSpec, PricingBreakdown } from '@/lib/types/configuration'

export const MATERIALS: Material[] = [
  {
    id: 'steel-1018',
    name: 'Steel (1018)',
    description: 'Carbon steel tubing - most common',
    basePrice: 2.50,
    available: true
  },
  {
    id: 'aluminum-6061',
    name: 'Aluminum (6061-T6)',
    description: 'Lightweight, corrosion resistant',
    basePrice: 4.25,
    available: true
  },
  {
    id: 'stainless-304',
    name: 'Stainless Steel (304)',
    description: 'Excellent corrosion resistance',
    basePrice: 6.80,
    available: true
  },
  {
    id: 'stainless-316',
    name: 'Stainless Steel (316)',
    description: 'Marine grade stainless',
    basePrice: 8.50,
    available: true
  },
  {
    id: 'copper',
    name: 'Copper',
    description: 'Pure copper tubing',
    basePrice: 12.00,
    available: true
  }
]

export const TUBE_DIAMETERS = [
  '0.25"', '0.375"', '0.5"', '0.625"', '0.75"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"', '4"'
]

export const WALL_THICKNESS_OPTIONS = [
  '0.035"', '0.049"', '0.065"', '0.083"', '0.095"', '0.120"', '0.134"', '0.165"'
]

export function calculateMaterialCost(
  material: Material,
  tubeSpec: TubeSpecification,
  quantity: number
): number {
  const diameter = parseFloat(tubeSpec.diameter.replace('"', ''))
  const wallThickness = parseFloat(tubeSpec.wallThickness.replace('"', ''))
  
  // Weight factor based on diameter and wall thickness
  const weightFactor = Math.PI * diameter * wallThickness * 0.2836 // approx weight per foot in lbs
  
  return material.basePrice * tubeSpec.length * quantity * (1 + weightFactor * 0.1)
}

export function calculateBendingCost(
  tubeSpec: TubeSpecification,
  quantity: number,
  bendCount: number = 3 // estimated from CAD analysis
): number {
  const diameter = parseFloat(tubeSpec.diameter.replace('"', ''))
  
  // Base bending cost per bend
  const baseBendCost = 6.00
  
  // Complexity multiplier based on diameter
  const complexityMultiplier = diameter < 1 ? 1.0 : diameter * 0.5
  
  // Setup cost amortized across quantity
  const setupCost = 45.00 / Math.max(quantity, 1)
  
  return (baseBendCost * bendCount * complexityMultiplier + setupCost) * quantity
}

// Enhanced bending cost calculation that considers actual bend parameters
export function calculateEnhancedBendingCost(
  tubeSpec: TubeSpecification,
  quantity: number,
  bends: any[] = []
): number {
  const diameter = parseFloat(tubeSpec.diameter.replace('"', ''))
  
  if (bends.length === 0) {
    // Fall back to basic calculation if no bend data
    return calculateBendingCost(tubeSpec, quantity, 0)
  }
  
  // Base bending cost per bend
  const baseBendCost = 6.00
  
  // Calculate cost for each bend based on its specific parameters
  const bendCosts = bends.map(bend => {
    const angle = Math.abs(bend.angle || 45)
    const radius = bend.radius || diameter * 2
    
    // Angle complexity: sharper bends (smaller angles) are more expensive
    const angleMultiplier = angle < 30 ? 1.8 : 
                           angle < 60 ? 1.4 : 
                           angle < 90 ? 1.2 : 1.0
    
    // Radius complexity: tighter bends are more expensive
    const minRadius = diameter * 2
    const radiusMultiplier = radius < minRadius ? 2.0 :
                            radius < minRadius * 1.5 ? 1.5 : 1.0
    
    // Diameter complexity multiplier
    const diameterMultiplier = diameter < 1 ? 1.0 : diameter * 0.5
    
    // Manufacturing constraint penalty for invalid bends
    const validityMultiplier = bend.isValid === false ? 1.5 : 1.0
    
    return baseBendCost * angleMultiplier * radiusMultiplier * diameterMultiplier * validityMultiplier
  })
  
  const totalBendCost = bendCosts.reduce((sum, cost) => sum + cost, 0)
  
  // Setup cost increases with bend complexity
  const setupCost = (45.00 + bends.length * 15.00) / Math.max(quantity, 1)
  
  return (totalBendCost + setupCost) * quantity
}

export function calculateFinishingCost(
  finishingType: string,
  tubeSpec: TubeSpecification,
  quantity: number
): number {
  const surfaceArea = Math.PI * parseFloat(tubeSpec.diameter.replace('"', '')) * tubeSpec.length
  
  const finishingRates = {
    'none': 0,
    'deburr': 2.50,
    'polish': 8.00,
    'paint': 12.00,
    'powder-coat': 15.00
  }
  
  const rate = finishingRates[finishingType as keyof typeof finishingRates] || 0
  return rate * surfaceArea * quantity * 0.1 // 0.1 multiplier for surface area calculation
}

export function calculateSetupCost(quantity: number, rushOrder: boolean): number {
  const baseSetup = 25.00
  const rushMultiplier = rushOrder ? 2.0 : 1.0
  
  // Setup cost decreases with quantity
  const quantityDiscount = Math.min(quantity / 100, 0.5)
  
  return baseSetup * rushMultiplier * (1 - quantityDiscount)
}

export function calculateRushFee(subtotal: number, rushOrder: boolean): number {
  return rushOrder ? subtotal * 0.25 : 0
}

export function calculateTax(subtotal: number): number {
  // Placeholder tax rate - would be calculated based on location
  return subtotal * 0.0875 // 8.75% example rate
}

export function getLeadTime(rushOrder: boolean, quantity: number): string {
  if (rushOrder) {
    return '1-2 days'
  }
  
  if (quantity <= 10) {
    return '3-5 days'
  } else if (quantity <= 100) {
    return '5-7 days'
  } else {
    return '1-2 weeks'
  }
}

export function calculatePricing(
  materialId: string,
  tubeSpec: TubeSpecification,
  specs: ManufacturingSpec
): PricingBreakdown {
  const material = MATERIALS.find(m => m.id === materialId)
  if (!material) {
    throw new Error('Material not found')
  }
  
  const materialCost = calculateMaterialCost(material, tubeSpec, specs.quantity)
  const bendingCost = calculateBendingCost(tubeSpec, specs.quantity)
  const finishingCost = calculateFinishingCost(specs.finishing.type, tubeSpec, specs.quantity)
  const setupCost = calculateSetupCost(specs.quantity, specs.rushOrder)
  
  const subtotal = materialCost + bendingCost + finishingCost + setupCost
  const rushFee = calculateRushFee(subtotal, specs.rushOrder)
  const tax = calculateTax(subtotal + rushFee)
  const total = subtotal + rushFee + tax
  
  return {
    materialCost,
    bendingCost,
    finishingCost,
    setupCost,
    rushFee,
    subtotal,
    tax,
    total,
    leadTime: getLeadTime(specs.rushOrder, specs.quantity)
  }
}