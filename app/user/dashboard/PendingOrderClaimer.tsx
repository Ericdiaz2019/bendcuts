'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RotateCcw, X } from 'lucide-react'

import { submitOrderAction } from '@/app/configure/actions'
import { createClient } from '@/lib/supabase/client'
import { deletePendingFile, loadPendingFile } from '@/lib/configure/pendingFileCache'
import type { PendingOrderPayload } from '@/lib/types/orders'

const STORAGE_KEY = 'tubebend_pending_order'

type Status =
  | { kind: 'idle' }
  | { kind: 'claiming'; detail: string }
  | { kind: 'success'; orderNumber: string }
  | { kind: 'error'; message: string; needsReupload: boolean }

interface Stashed {
  action?: string
  payload?: PendingOrderPayload
}

function readStash(): Stashed | null {
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    return JSON.parse(raw) as Stashed
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return null
  }
}

/**
 * Picks up an order that was configured before sign-in and finishes it now that
 * the user is authenticated: for an anonymous flow the CAD binary was cached in
 * IndexedDB (keyed by idempotencyKey), so we upload it to Storage first, then
 * create the order pointing at the real file. The stash + cache are cleared ONLY
 * on success — a failure keeps everything so the user can retry instead of
 * silently losing their order.
 */
export function PendingOrderClaimer() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const startedRef = useRef(false)

  const runClaim = useCallback(async () => {
    const parsed = readStash()
    if (!parsed) {
      setStatus({ kind: 'idle' })
      return
    }
    if (!parsed.payload || (parsed.action !== 'save' && parsed.action !== 'submit')) {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      setStatus({ kind: 'idle' })
      return
    }

    const wantedToPay = parsed.action === 'submit'
    const payload: PendingOrderPayload = parsed.payload
    const cacheKey = payload.idempotencyKey

    try {
      // If the binary was never uploaded (anonymous flow), upload the cached copy
      // now that storage RLS will accept the owner-prefixed path.
      if (!payload.file?.storagePath && cacheKey) {
        setStatus({ kind: 'claiming', detail: 'Uploading your CAD file…' })
        const cached = await loadPendingFile(cacheKey)
        if (cached) {
          const supabase = createClient()
          const { data: userData } = await supabase.auth.getUser()
          if (userData.user) {
            const safeName = cached.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const path = `${userData.user.id}/${cacheKey}/${safeName}`
            const { error: upErr } = await supabase.storage
              .from('cad-files')
              .upload(path, cached, { upsert: true, cacheControl: '3600' })
            if (!upErr) {
              payload.file = { ...payload.file, storagePath: path, fileSize: cached.size }
            }
          }
        }
      }

      setStatus({ kind: 'claiming', detail: 'Saving your order from before you signed in…' })
      const result = await submitOrderAction(payload, 'save')

      if (!result.ok) {
        setStatus({
          kind: 'error',
          message: result.error,
          needsReupload: !!result.needsReupload,
        })
        return
      }

      // Success — safe to clear the stash and the cached binary.
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      if (cacheKey) void deletePendingFile(cacheKey)

      if (wantedToPay) {
        router.replace(`/user/orders/${result.orderId}?pay=1`)
      } else {
        setStatus({ kind: 'success', orderNumber: result.orderNumber })
        router.refresh()
      }
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not save your order.',
        needsReupload: false,
      })
    }
  }, [router])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void runClaim()
  }, [runClaim])

  if (status.kind === 'idle') return null

  return (
    <div className="mb-4">
      {status.kind === 'claiming' && (
        <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          {status.detail}
        </div>
      )}
      {status.kind === 'success' && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Saved as{' '}
            <span className="font-mono font-semibold">{status.orderNumber}</span>. You can finish
            checkout from your orders list.
          </div>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="flex items-start gap-2">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              We couldn&apos;t finish your pre-sign-in order: {status.message}
              {status.needsReupload && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => router.push('/configure')}
                    className="font-medium underline underline-offset-2 hover:text-rose-950"
                  >
                    Re-upload your file
                  </button>
                  .
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus({ kind: 'claiming', detail: 'Retrying…' })
              void runClaim()
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
