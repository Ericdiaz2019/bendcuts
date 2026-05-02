'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'

import { refundPaymentAction } from '@/app/admin/actions'
import { formatUSD } from '@/app/admin/lib/format'

export function RefundButton({
  paymentId,
  orderId,
  remaining,
  currency,
  canRefund,
}: {
  paymentId: string
  orderId: string
  remaining: number
  currency: string
  canRefund: boolean
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(remaining.toFixed(2))
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!canRefund) {
    return (
      <p className="text-xs text-slate-500">Refunds are unavailable for this payment status.</p>
    )
  }

  function submit() {
    setError(null)
    const cents = Math.round(parseFloat(amount) * 100)
    if (!cents || isNaN(cents)) {
      setError('Enter a valid amount.')
      return
    }
    startTransition(async () => {
      const result = await refundPaymentAction(paymentId, orderId, cents, reason || null)
      if (!result.ok) setError(result.error)
      else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
      >
        <RotateCcw className="h-3 w-3" /> Refund
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
          Amount ({currency.toUpperCase()})
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={remaining.toFixed(2)}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm font-mono"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Up to {formatUSD(remaining, currency)} remaining.
        </p>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
          Reason (optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Customer request, defect, etc."
          className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          Confirm refund
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
