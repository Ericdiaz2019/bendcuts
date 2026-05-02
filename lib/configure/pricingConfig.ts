import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from '@/lib/utils/quoteCalculator'

function coerceNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) return DEFAULT_PRICING_CONFIG

  return {
    bendingCostPerBend: Number(data.bending_cost_per_bend),
    cuttingCostPerCut: Number(data.cutting_cost_per_cut),
    setupCost: Number(data.setup_cost),
    laborRate: Number(data.labor_rate),
    baseTimePerPart: Number(data.base_time_per_part),
    timePerBend: Number(data.time_per_bend),
    timePerCut: Number(data.time_per_cut),
    taxRate: Number(data.tax_rate),
    materialWeights: { ...DEFAULT_PRICING_CONFIG.materialWeights, ...coerceNumberRecord(data.material_weights) },
    quantityDiscounts: { ...DEFAULT_PRICING_CONFIG.quantityDiscounts, ...coerceNumberRecord(data.quantity_discounts) },
  }
}
