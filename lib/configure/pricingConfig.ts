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

function coerceNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) return DEFAULT_PRICING_CONFIG

  // Newer keys (laser rate, weight-model assumptions) may not exist as columns
  // yet — read them defensively so the code-level defaults apply until the
  // pricing_config table grows the columns.
  const row = data as Record<string, unknown>

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
    printRatePerLb: coerceNumber(row.print_rate_per_lb, DEFAULT_PRICING_CONFIG.printRatePerLb ?? 35),
    laserCostPerFeature: coerceNumber(
      row.laser_cost_per_feature,
      DEFAULT_PRICING_CONFIG.laserCostPerFeature ?? 2,
    ),
    effectiveWidthIn: coerceNumber(row.effective_width_in, DEFAULT_PRICING_CONFIG.effectiveWidthIn ?? 9),
    printSectionIn2: coerceNumber(row.print_section_in2, DEFAULT_PRICING_CONFIG.printSectionIn2 ?? 4.2),
  }
}
