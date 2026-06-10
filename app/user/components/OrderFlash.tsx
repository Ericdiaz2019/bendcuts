'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

// Key is shared with QuoteDisplay/CheckoutDialog, which write it after checkout.
const FLASH_KEY = 'tubebend_dashboard_flash'

interface Flash {
  action: 'submit' | 'save'
  orderNumber?: string
  materialName?: string
  quantity?: number
}

/**
 * Reads and clears the one-shot success flash that QuoteDisplay/CheckoutDialog
 * write after a completed order, then shows a dismissible confirmation banner.
 * Without this the flash key was written but never read — users got no
 * confirmation that their order went through.
 */
export function OrderFlash() {
  const [flash, setFlash] = useState<Flash | null>(null)

  useEffect(() => {
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem(FLASH_KEY)
      if (raw) sessionStorage.removeItem(FLASH_KEY)
    } catch {
      return
    }
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Flash
      if (parsed && (parsed.action === 'submit' || parsed.action === 'save')) {
        setFlash(parsed)
      }
    } catch {
      /* ignore malformed */
    }
  }, [])

  if (!flash) return null

  const parts =
    flash.quantity && flash.materialName
      ? ` — ${flash.quantity} part${flash.quantity !== 1 ? 's' : ''} · ${flash.materialName}`
      : ''
  const headline =
    flash.action === 'submit' ? 'Order placed' : 'Saved for later'

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <span className="font-semibold">{headline}</span>
          {flash.orderNumber && (
            <>
              {' '}
              <span className="font-mono font-semibold">{flash.orderNumber}</span>
            </>
          )}
          {parts}.
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFlash(null)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
