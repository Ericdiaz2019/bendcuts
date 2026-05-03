'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, CreditCard, Loader2, Lock, Plus, ShieldCheck, Sparkles } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { EmulatedCardInput, type EmulatedCardValue } from '@/app/configure/EmulatedCardInput'
import { payDraftOrderAction } from '@/app/user/orders/actions'
import { createClient } from '@/lib/supabase/client'

import type { Tables } from '@/lib/types/supabase'

type SavedPaymentMethod = Pick<
  Tables<'payment_methods'>,
  'id' | 'stripe_payment_method_id' | 'brand' | 'last4' | 'expiry_month' | 'expiry_year' | 'is_default'
>

type Step = 'review' | 'paying' | 'success'

const easeOut = [0.16, 1, 0.3, 1] as const

interface PayDraftDialogProps {
  orderId: string
  orderNumber: string
  total: number
  currency: string
  itemSummary: string
  /** Set to "1" to auto-open on mount (used after sign-in redirect). */
  autoOpenParam?: string
}

export function PayDraftDialog({
  orderId,
  orderNumber,
  total,
  currency,
  itemSummary,
  autoOpenParam = 'pay',
}: PayDraftDialogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('review')
  const [error, setError] = useState('')
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)

  const hasSaved = savedPaymentMethods.length > 0
  const defaultId =
    savedPaymentMethods.find(pm => pm.is_default)?.id ?? savedPaymentMethods[0]?.id ?? null

  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)
  const [usingNew, setUsingNew] = useState<boolean>(true)
  const [card, setCard] = useState<EmulatedCardValue>({ card: null, isValid: false })
  const [saveForFuture, setSaveForFuture] = useState(true)

  // Auto-open when redirected from sign-in with ?pay=1
  useEffect(() => {
    if (searchParams.get(autoOpenParam) === '1') {
      setOpen(true)
    }
  }, [searchParams, autoOpenParam])

  // Fetch saved cards on open
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingSaved(true)
    const supabase = createClient()
    supabase
      .from('payment_methods')
      .select('id, stripe_payment_method_id, brand, last4, expiry_month, expiry_year, is_default')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        const list = (data ?? []) as SavedPaymentMethod[]
        setSavedPaymentMethods(list)
        const def = list.find(pm => pm.is_default)?.id ?? list[0]?.id ?? null
        setSelectedSavedId(def)
        setUsingNew(list.length === 0)
        setLoadingSaved(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setStep('review')
      setError('')
      setCard({ card: null, isValid: false })
      setSaveForFuture(true)
    }
  }, [open])

  useEffect(() => {
    setSelectedSavedId(prev => prev ?? defaultId)
  }, [defaultId])

  const canPay = usingNew ? card.isValid : !!selectedSavedId

  async function handlePay() {
    if (!canPay) return
    setStep('paying')
    setError('')

    const result = await payDraftOrderAction(
      orderId,
      usingNew && card.card
        ? { kind: 'new', card: card.card, saveForFuture }
        : { kind: 'saved', paymentMethodId: selectedSavedId!, stripePaymentMethodId: null },
    )

    if (!result.ok) {
      setError(result.error || 'Payment failed.')
      setStep('review')
      return
    }

    setStep('success')
    setTimeout(() => {
      router.refresh()
      // Clean the ?pay=1 from URL so a refresh doesn't re-open the dialog
      const url = new URL(window.location.href)
      url.searchParams.delete(autoOpenParam)
      window.history.replaceState({}, '', url.toString())
      setOpen(false)
    }, 1400)
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600 sm:w-auto"
      >
        <Lock className="mr-2 h-4 w-4" />
        Pay ${total.toFixed(2)} & submit
      </Button>

      <Dialog
        open={open}
        onOpenChange={v => (step === 'paying' ? null : setOpen(v))}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-5">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 60% 80% at 70% 0%, rgba(34,211,238,0.18), rgba(59,130,246,0.10) 40%, transparent 70%)',
              }}
            />
            <div className="relative">
              <DialogHeader>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  Complete order
                </div>
                <DialogTitle className="text-white">
                  Pay for {orderNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-white">
                  ${total.toFixed(2)}
                </span>
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  {currency}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-300">{itemSummary}</div>
            </div>
          </div>

          <div className="px-6 pb-5 pt-5">
            <AnimatePresence mode="wait">
              {step === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: easeOut }}
                  className="space-y-4"
                >
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {loadingSaved && (
                    <div className="flex items-center justify-center py-6 text-sm text-slate-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading payment methods…
                    </div>
                  )}

                  {!loadingSaved && hasSaved && !usingNew && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Pay with
                      </div>
                      <div className="space-y-1.5">
                        {savedPaymentMethods.map(pm => {
                          const expiry =
                            pm.expiry_month && pm.expiry_year
                              ? `${String(pm.expiry_month).padStart(2, '0')}/${String(pm.expiry_year).slice(-2)}`
                              : null
                          const selected = selectedSavedId === pm.id
                          return (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setSelectedSavedId(pm.id)}
                              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                                selected
                                  ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                <CreditCard className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium capitalize text-slate-900">
                                  {pm.brand ?? 'Card'} •••• {pm.last4}
                                </div>
                                {expiry && (
                                  <div className="text-[11px] text-slate-500">Expires {expiry}</div>
                                )}
                              </div>
                              {selected && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setUsingNew(true)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3 w-3" />
                        Use a new card
                      </button>
                    </div>
                  )}

                  {!loadingSaved && usingNew && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          New card
                        </div>
                        {hasSaved && (
                          <button
                            type="button"
                            onClick={() => setUsingNew(false)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            Use saved card
                          </button>
                        )}
                      </div>
                      <EmulatedCardInput onChange={setCard} />
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={saveForFuture}
                          onChange={e => setSaveForFuture(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                        />
                        Save this card for future orders
                      </label>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handlePay}
                      disabled={!canPay}
                      className="h-11 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-60"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Pay ${total.toFixed(2)}
                    </Button>

                    <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      Test mode · no real charges yet
                    </p>
                  </div>
                </motion.div>
              )}

              {step === 'paying' && (
                <motion.div
                  key="paying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: easeOut }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30">
                      <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="mt-5 text-base font-semibold text-slate-900">
                    Charging your card…
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Securely processing ${total.toFixed(2)}
                  </p>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: easeOut }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
                  >
                    <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
                  </motion.div>
                  <p className="mt-5 text-base font-semibold text-slate-900">
                    Payment successful
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Order{' '}
                    <span className="font-mono font-medium text-slate-900">{orderNumber}</span>{' '}
                    is on its way to production.
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
                    <Sparkles className="h-3 w-3 text-cyan-500" />
                    Refreshing…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
