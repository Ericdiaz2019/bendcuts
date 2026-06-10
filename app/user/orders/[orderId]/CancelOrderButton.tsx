'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, X } from 'lucide-react'

import { cancelOrderAction } from '@/app/user/orders/actions'

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await cancelOrderAction(orderId, reason)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
      >
        <X className="h-3.5 w-3.5" />
        Cancel order
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900">Cancel this order?</p>
          <p className="mt-0.5 text-xs text-red-700">
            Once cancelled, you&apos;ll need to start a new quote. This can&apos;t be undone.
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional, helps us improve)"
            maxLength={500}
            rows={2}
            className="mt-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
          />
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, cancel order
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setOpen(false)
                setError(null)
                setReason('')
              }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Keep order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
