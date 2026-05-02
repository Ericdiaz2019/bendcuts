'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Truck } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { markShippedAction } from '@/app/admin/actions'

export function ShipForm({
  orderId,
  carrier: initialCarrier,
  trackingNumber: initialTracking,
  estimatedDelivery: initialETA,
}: {
  orderId: string
  carrier: string
  trackingNumber: string
  estimatedDelivery: string
}) {
  const [carrier, setCarrier] = useState(initialCarrier)
  const [trackingNumber, setTrackingNumber] = useState(initialTracking)
  const [estimatedDelivery, setEstimatedDelivery] = useState(initialETA)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await markShippedAction(
        orderId,
        carrier,
        trackingNumber,
        estimatedDelivery || null,
      )
      if (!result.ok) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="carrier" className="text-xs text-slate-700">Carrier</Label>
          <Input
            id="carrier"
            value={carrier}
            onChange={e => setCarrier(e.target.value)}
            placeholder="UPS, FedEx, USPS…"
            className="mt-1 h-10"
          />
        </div>
        <div>
          <Label htmlFor="tracking" className="text-xs text-slate-700">Tracking number</Label>
          <Input
            id="tracking"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            placeholder="1Z…"
            className="mt-1 h-10 font-mono"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="eta" className="text-xs text-slate-700">Estimated delivery (optional)</Label>
        <Input
          id="eta"
          type="date"
          value={estimatedDelivery}
          onChange={e => setEstimatedDelivery(e.target.value)}
          className="mt-1 h-10"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !carrier.trim() || !trackingNumber.trim()}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
        Mark shipped
      </button>
    </form>
  )
}
