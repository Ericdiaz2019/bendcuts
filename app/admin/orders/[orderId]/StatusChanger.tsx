'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

import { updateOrderStatusAction } from '@/app/admin/actions'
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from '@/app/admin/lib/format'

const PIPELINE: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'in_production',
  'quality_check',
  'ready_to_ship',
  'shipped',
  'delivered',
]

const TERMINAL: OrderStatus[] = ['cancelled', 'refunded']

export function StatusChanger({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const currentIndex = PIPELINE.indexOf(current)

  function setStatus(next: OrderStatus) {
    if (next === current || isPending) return
    setError(null)
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, next)
      if (!result.ok) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE.map((s, i) => {
          const isCurrent = s === current
          const isPast = currentIndex >= 0 && i < currentIndex
          const isFuture = currentIndex >= 0 && i > currentIndex
          const baseClasses = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50'
          const tone = isCurrent
            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
            : isPast
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
              : isFuture
                ? 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
          return (
            <button
              key={s}
              type="button"
              disabled={isPending || isCurrent}
              onClick={() => setStatus(s)}
              className={`${baseClasses} ${tone}`}
            >
              {isPast && <Check className="h-3 w-3" />}
              {ORDER_STATUS_LABEL[s]}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Terminal</span>
        {TERMINAL.map(s => (
          <button
            key={s}
            type="button"
            disabled={isPending || s === current}
            onClick={() => {
              if (confirm(`Mark this order as ${ORDER_STATUS_LABEL[s].toLowerCase()}? This is reversible by changing status again.`)) {
                setStatus(s)
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition disabled:opacity-50 ${
              s === current ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white text-rose-700 ring-rose-200 hover:bg-rose-50'
            }`}
          >
            {ORDER_STATUS_LABEL[s]}
          </button>
        ))}
        {isPending && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Updating…
          </span>
        )}
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* Allow setting any status (escape hatch for off-pipeline cases) */}
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-700">Set any status</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ORDER_STATUSES.map(s => (
            <button
              key={s}
              type="button"
              disabled={isPending || s === current}
              onClick={() => setStatus(s)}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200 disabled:opacity-40"
            >
              {ORDER_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}
