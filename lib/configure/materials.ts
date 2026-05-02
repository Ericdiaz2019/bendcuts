export interface CatalogMaterial {
  id: string
  name: string
  description: string
  pricePerLb: number
  color: string
  gauges: string[]
}

export const PANEL_MATERIALS: CatalogMaterial[] = [
  {
    id: 'aluminum',
    name: 'Aluminum',
    description: 'Lightweight, corrosion-resistant — marine and aerospace.',
    pricePerLb: 2.5,
    color: '#C0C0C0',
    gauges: [
      '16 AWG (0.051")',
      '14 AWG (0.064")',
      '12 AWG (0.081")',
      '10 AWG (0.102")',
      '8 AWG (0.128")',
    ],
  },
  {
    id: 'stainless-steel',
    name: 'Stainless Steel',
    description: 'High-strength, corrosion-resistant — food and chemical-grade.',
    pricePerLb: 4.75,
    color: '#E8E8E8',
    gauges: [
      '16 AWG (0.063")',
      '14 AWG (0.078")',
      '12 AWG (0.109")',
      '10 AWG (0.134")',
      '8 AWG (0.172")',
    ],
  },
  {
    id: 'carbon-steel',
    name: 'Carbon Steel',
    description: 'Strong, durable, cost-effective — structural and general use.',
    pricePerLb: 1.85,
    color: '#696969',
    gauges: [
      '16 AWG (0.065")',
      '14 AWG (0.083")',
      '12 AWG (0.109")',
      '10 AWG (0.134")',
      '8 AWG (0.165")',
    ],
  },
]

export function findMaterial(id: string): CatalogMaterial | null {
  return PANEL_MATERIALS.find(m => m.id === id) ?? null
}

export function isValidGauge(materialId: string, gauge: string): boolean {
  const material = findMaterial(materialId)
  if (!material) return false
  return material.gauges.includes(gauge)
}
