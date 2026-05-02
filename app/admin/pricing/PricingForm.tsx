'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

import { updatePricingConfigAction } from '@/app/admin/actions'

interface PricingValues {
  bending_cost_per_bend: number
  cutting_cost_per_cut: number
  setup_cost: number
  labor_rate: number
  base_time_per_part: number
  time_per_bend: number
  time_per_cut: number
  tax_rate: number
}

const FIELDS: Array<{
  key: keyof PricingValues
  label: string
  hint: string
  step: number
  unit: string
}> = [
  { key: 'bending_cost_per_bend', label: 'Bending cost per bend', hint: 'Charged per bend, per part.', step: 0.5, unit: '$' },
  { key: 'cutting_cost_per_cut', label: 'Cutting cost per cut', hint: 'Charged per cut, per part.', step: 0.5, unit: '$' },
  { key: 'setup_cost', label: 'One-time setup', hint: 'Flat amount per order.', step: 5, unit: '$' },
  { key: 'labor_rate', label: 'Labor rate', hint: 'Hourly rate applied to estimated time.', step: 1, unit: '$/hr' },
  { key: 'base_time_per_part', label: 'Base time per part', hint: 'Handling overhead.', step: 0.05, unit: 'hr' },
  { key: 'time_per_bend', label: 'Time per bend', hint: 'Time added per bend.', step: 0.05, unit: 'hr' },
  { key: 'time_per_cut', label: 'Time per cut', hint: 'Time added per cut.', step: 0.05, unit: 'hr' },
  { key: 'tax_rate', label: 'Tax rate', hint: 'Decimal — 0.08875 = 8.875%.', step: 0.001, unit: '' },
]

export function PricingForm({ initial }: { initial: PricingValues }) {
  const router = useRouter()
  const [values, setValues] = useState<PricingValues>(initial)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const dirty = (Object.keys(values) as (keyof PricingValues)[]).some(
    k => values[k] !== initial[k],
  )

  function update(key: keyof PricingValues, raw: string) {
    const n = Number(raw)
    setValues(v => ({ ...v, [key]: Number.isFinite(n) ? n : 0 }))
    setSuccess(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updatePricingConfigAction(values)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map(f => (
          <label key={f.key} className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {f.label}
            </span>
            <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              {f.unit === '$' && <span className="pl-3 text-sm text-slate-500">$</span>}
              <input
                type="number"
                step={f.step}
                min={0}
                value={values[f.key]}
                onChange={e => update(f.key, e.target.value)}
                className="h-10 w-full bg-transparent px-3 text-sm tabular-nums focus:outline-none"
              />
              {f.unit && f.unit !== '$' && (
                <span className="pr-3 text-sm text-slate-500">{f.unit}</span>
              )}
            </div>
            <span className="mt-1 block text-xs text-slate-500">{f.hint}</span>
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Pricing updated.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-cyan-600 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save changes
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setValues(initial)
              setError(null)
              setSuccess(false)
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Discard
          </button>
        )}
      </div>
    </form>
  )
}
