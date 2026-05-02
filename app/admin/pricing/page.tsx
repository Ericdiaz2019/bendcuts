import { Tag } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { PricingForm } from './PricingForm'
import { formatDateTime } from '../lib/format'

export const dynamic = 'force-dynamic'

export default async function AdminPricingPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  const config = data ?? null

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
          Operations
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Pricing</h1>
        <p className="mt-1 text-sm text-slate-600">
          These constants drive every quote. Changes apply immediately to all new quotes.
        </p>
        {config?.updated_at && (
          <p className="mt-1 text-xs text-slate-400">
            Last updated {formatDateTime(config.updated_at)}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <Tag className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Existing orders keep their original quote snapshot — changes here only affect new
            submissions. Customers with stale tabs will see a &ldquo;quote no longer matches&rdquo;
            error and must refresh.
          </div>
        </div>
      </div>

      <div className="mt-6">
        {config ? (
          <PricingForm
            initial={{
              bending_cost_per_bend: Number(config.bending_cost_per_bend),
              cutting_cost_per_cut: Number(config.cutting_cost_per_cut),
              setup_cost: Number(config.setup_cost),
              labor_rate: Number(config.labor_rate),
              base_time_per_part: Number(config.base_time_per_part),
              time_per_bend: Number(config.time_per_bend),
              time_per_cut: Number(config.time_per_cut),
              tax_rate: Number(config.tax_rate),
            }}
          />
        ) : (
          <p className="text-sm text-slate-500">Pricing config row not found.</p>
        )}
      </div>
    </main>
  )
}
