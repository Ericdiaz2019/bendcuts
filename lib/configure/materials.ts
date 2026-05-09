import type { ManufacturingService } from '@/lib/utils/quoteCalculator'

export interface CatalogMaterial {
  id: string
  name: string
  description: string
  pricePerLb: number
  color: string
  gauges: string[]
  // Services this material can be ordered through. Empty/undefined means all.
  services?: ManufacturingService[]
}

const STEEL_GAUGES = [
  '24 AWG (0.024")',
  '22 AWG (0.030")',
  '20 AWG (0.036")',
  '18 AWG (0.048")',
  '16 AWG (0.060")',
  '14 AWG (0.075")',
  '12 AWG (0.105")',
  '11 AWG (0.120")',
  '10 AWG (0.135")',
  '8 AWG (0.165")',
  '7 AWG (0.187")',
  '3/16" (0.188")',
  '1/4" (0.250")',
  '5/16" (0.313")',
  '3/8" (0.375")',
  '1/2" (0.500")',
]

const STAINLESS_GAUGES = [
  '24 AWG (0.025")',
  '22 AWG (0.031")',
  '20 AWG (0.038")',
  '18 AWG (0.050")',
  '16 AWG (0.063")',
  '14 AWG (0.078")',
  '12 AWG (0.109")',
  '11 AWG (0.120")',
  '10 AWG (0.134")',
  '8 AWG (0.172")',
  '3/16" (0.188")',
  '1/4" (0.250")',
  '3/8" (0.375")',
]

const ALUMINUM_GAUGES = [
  '24 AWG (0.020")',
  '22 AWG (0.025")',
  '20 AWG (0.032")',
  '18 AWG (0.040")',
  '16 AWG (0.051")',
  '14 AWG (0.064")',
  '12 AWG (0.081")',
  '10 AWG (0.102")',
  '8 AWG (0.128")',
  '3/16" (0.188")',
  '1/4" (0.250")',
  '3/8" (0.375")',
  '1/2" (0.500")',
]

const COPPER_GAUGES = [
  '22 AWG (0.025")',
  '20 AWG (0.032")',
  '18 AWG (0.040")',
  '16 AWG (0.051")',
  '14 AWG (0.064")',
  '12 AWG (0.081")',
]

const PRINTING_GRADES = [
  'PLA (1.24 g/cc)',
  'PETG (1.27 g/cc)',
  'ABS (1.04 g/cc)',
  'Nylon PA12 (1.01 g/cc)',
  'TPU 95A (1.21 g/cc)',
]

const METAL_SERVICES: ManufacturingService[] = [
  'tube-bending',
  'tube-laser',
  'sheet-laser',
  'straight-cut',
]

export const PANEL_MATERIALS: CatalogMaterial[] = [
  {
    id: 'aluminum',
    name: 'Aluminum',
    description: 'Lightweight, corrosion-resistant — marine and aerospace.',
    pricePerLb: 2.5,
    color: '#C0C0C0',
    gauges: ALUMINUM_GAUGES,
    services: METAL_SERVICES,
  },
  {
    id: 'stainless-steel',
    name: 'Stainless Steel',
    description: 'High-strength, corrosion-resistant — food and chemical-grade.',
    pricePerLb: 4.75,
    color: '#E8E8E8',
    gauges: STAINLESS_GAUGES,
    services: METAL_SERVICES,
  },
  {
    id: 'carbon-steel',
    name: 'Carbon Steel',
    description: 'Strong, durable, cost-effective — structural and general use.',
    pricePerLb: 1.85,
    color: '#696969',
    gauges: STEEL_GAUGES,
    services: METAL_SERVICES,
  },
  {
    id: 'copper',
    name: 'Copper',
    description: 'Pure copper — plumbing, electrical, and decorative work.',
    pricePerLb: 5.2,
    color: '#B87333',
    gauges: COPPER_GAUGES,
    services: METAL_SERVICES,
  },
  {
    id: 'print-polymer',
    name: '3D Print Polymer',
    description: 'FDM and SLS prints in PLA, PETG, ABS, Nylon and TPU.',
    pricePerLb: 0,
    color: '#3B82F6',
    gauges: PRINTING_GRADES,
    services: ['3d-printing'],
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

export function materialsForService(service: ManufacturingService): CatalogMaterial[] {
  return PANEL_MATERIALS.filter(m => !m.services || m.services.includes(service))
}
