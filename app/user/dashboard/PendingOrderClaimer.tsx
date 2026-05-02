'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, X } from 'lucide-react'

import { submitOrderAction } from '@/app/configure/actions'

const STORAGE_KEY = 'tubebend_pending_order'

type Status =
  | { kind: 'idle' }
  | { kind: 'claiming' }
  | { kind: 'success'; orderNumber: string }
  | { kind: 'error'; message: string }

/**
 * Picks up a saved-for-later order that was stashed before sign-in and
 * submits it as a draft now that the user is authenticated. Mounted on
 * the dashboard so users land on a familiar page and see their draft saved.
 */
export function PendingOrderClaimer() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const claimedRef = useRef(false)

  useEffect(() => {
    if (claimedRef.current) return
    claimedRef.current = true

    const raw = (() => {
      try {
        return sessionStorage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
    })()
    if (!raw) return

    let parsed: { action?: string; payload?: unknown } | null = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }

    // Only auto-claim drafts. "Submit order" requires payment and can't be replayed silently.
    if (!parsed || parsed.action !== 'save' || !parsed.payload) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }

    setStatus({ kind: 'claiming' })

    submitOrderAction(parsed.payload, 'save')
      .then(result => {
        sessionStorage.removeItem(STORAGE_KEY)
        if (result.ok) {
          setStatus({ kind: 'success', orderNumber: result.orderNumber })
          router.refresh()
        } else {
          setStatus({ kind: 'error', message: result.error })
        }
      })
      .catch(err => {
        sessionStorage.removeItem(STORAGE_KEY)
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not save your draft.',
        })
      })
  }, [router])

  if (status.kind === 'idle') return null

  return (
    <div className="mb-4">
      {status.kind === 'claiming' && (
        <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving your draft from before you signed in…
        </div>
      )}
      {status.kind === 'success' && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Draft saved as{' '}
            <span className="font-mono font-semibold">{status.orderNumber}</span>. You can finish
            checkout from your orders list.
          </div>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <div>We couldn&apos;t save your pre-signin draft: {status.message}</div>
        </div>
      )}
    </div>
  )
}
