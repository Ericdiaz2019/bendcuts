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
        className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-700 sm:w-auto"
      >
        <Lock className="mr-2 h-4 w-4" />
        Pay ${total.toFixed(2)} & submit
      </Button>

      <Dialog
        open={open}
        onOpenChange={v => (step === 'paying' ? null : setOpen(v))}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          <div className="relative bg-neutral-900 px-6 py-5">
            <div className="relative">
              <DialogHeader>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
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
                <span className="text-xs uppercase tracking-wider text-neutral-400">
                  {currency}
                </span>
              </div>
              <div className="mt-1 text-xs text-neutral-300">{itemSummary}</div>
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
                    <div className="flex items-center justify-center py-6 text-sm text-neutral-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading payment methods…
                    </div>
                  )}

                  {!loadingSaved && hasSaved && !usingNew && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
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
                                  ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10'
                                  : 'border-neutral-200 bg-white hover:border-neutral-300'
                              }`}
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                                <CreditCard className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium capitalize text-neutral-900">
                                  {pm.brand ?? 'Card'} •••• {pm.last4}
                                </div>
                                {expiry && (
                                  <div className="text-[11px] text-neutral-500">Expires {expiry}</div>
                                )}
                              </div>
                              {selected && (
                                <CheckCircle2 className="h-4 w-4 text-neutral-900" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setUsingNew(true)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
                      >
                        <Plus className="h-3 w-3" />
                        Use a new card
                      </button>
                    </div>
                  )}

                  {!loadingSaved && usingNew && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          New card
                        </div>
                        {hasSaved && (
                          <button
                            type="button"
                            onClick={() => setUsingNew(false)}
                            className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
                          >
                            Use saved card
                          </button>
                        )}
                      </div>
                      <EmulatedCardInput onChange={setCard} />
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
                        <input
                          type="checkbox"
                          checked={saveForFuture}
                          onChange={e => setSaveForFuture(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        Save this card for future orders
                      </label>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handlePay}
                      disabled={!canPay}
                      className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-60"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Pay ${total.toFixed(2)}
                    </Button>

                    <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-neutral-500">
                      <ShieldCheck className="h-3 w-3 text-neutral-900" />
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
                    <div className="absolute inset-0 animate-ping rounded-full bg-neutral-900/15" />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white">
                      <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="mt-5 text-base font-semibold text-neutral-900">
                    Charging your card…
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
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
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white"
                  >
                    <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
                  </motion.div>
                  <p className="mt-5 text-base font-semibold text-neutral-900">
                    Payment successful
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Order{' '}
                    <span className="font-mono font-medium text-neutral-900">{orderNumber}</span>{' '}
                    is on its way to production.
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-neutral-500">
                    <Sparkles className="h-3 w-3 text-neutral-400" />
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
