'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, CreditCard, Loader2, Lock, LogIn, Plus, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { EmulatedCardInput, type EmulatedCardValue } from './EmulatedCardInput'
import { submitWithPaymentAction } from './actions'
import { easeOut } from './components/motion'
import { createClient } from '@/lib/supabase/client'

import type { PendingOrderPayload } from '@/lib/types/orders'
import type { Tables } from '@/lib/types/supabase'

type SavedPaymentMethod = Pick<
  Tables<'payment_methods'>,
  'id' | 'stripe_payment_method_id' | 'brand' | 'last4' | 'expiry_month' | 'expiry_year' | 'is_default'
>

type Step = 'review' | 'paying' | 'success' | 'auth-required'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: PendingOrderPayload | null
}

export function CheckoutDialog({ open, onOpenChange, payload }: CheckoutDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('review')
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)

  const hasSaved = savedPaymentMethods.length > 0
  const defaultId =
    savedPaymentMethods.find(pm => pm.is_default)?.id ?? savedPaymentMethods[0]?.id ?? null

  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)
  const [usingNew, setUsingNew] = useState<boolean>(true)
  const [card, setCard] = useState<EmulatedCardValue>({ card: null, isValid: false })
  const [saveForFuture, setSaveForFuture] = useState(true)

  // Fetch saved cards when the dialog opens. Also detects an unauthenticated session
  // (e.g. timeout while filling card info) and switches to the auth-required step.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingSaved(true)
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: userData }) => {
      if (cancelled) return
      if (!userData.user) {
        setStep('auth-required')
        setLoadingSaved(false)
        return
      }
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
    })

    return () => {
      cancelled = true
    }
  }, [open])

  // Reset everything else on open.
  useEffect(() => {
    if (open) {
      setStep('review')
      setError('')
      setCard({ card: null, isValid: false })
      setSaveForFuture(true)
      setOrderNumber(null)
    }
  }, [open])

  // Re-sync selected when saved list changes after re-open.
  useEffect(() => {
    setSelectedSavedId(prev => prev ?? defaultId)
  }, [defaultId])

  if (!payload) return null

  const total = payload.quote.total
  const canPay = usingNew ? card.isValid : !!selectedSavedId

  function stashAndAuth(target: '/auth/login' | '/auth/register') {
    if (!payload) return
    try {
      // Preserve the pay intent: the user was in checkout, so after sign-in
      // PendingOrderClaimer routes them to the order's Pay dialog (?pay=1).
      sessionStorage.setItem(
        'tubebend_pending_order',
        JSON.stringify({ action: 'submit', payload }),
      )
    } catch {
      // ignore
    }
    onOpenChange(false)
    router.push(`${target}?next=/user/projects`)
  }

  async function handlePay() {
    if (!payload || !canPay) return
    setStep('paying')
    setError('')

    const result = await submitWithPaymentAction(
      payload,
      usingNew && card.card
        ? { kind: 'new', card: card.card, saveForFuture }
        : { kind: 'saved', paymentMethodId: selectedSavedId!, stripePaymentMethodId: null },
    )

    if (!result.ok) {
      if (result.needsAuth) {
        setStep('auth-required')
        return
      }
      setError(result.error || 'Payment failed.')
      setStep('review')
      return
    }

    setOrderNumber(result.orderNumber)
    setStep('success')
    setTimeout(() => {
      try {
        sessionStorage.setItem(
          'tubebend_dashboard_flash',
          JSON.stringify({
            action: 'submit',
            orderNumber: result.orderNumber,
            materialName: result.materialName,
            quantity: result.quantity,
          }),
        )
      } catch {
        // ignore
      }
      router.push('/user/projects')
      router.refresh()
    }, 1400)
  }

  return (
    <Dialog open={open} onOpenChange={v => step === 'paying' ? null : onOpenChange(v)}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        {/* Top accent strip */}
        <div className="relative bg-neutral-900 px-6 py-5">
          <div className="relative">
            <DialogHeader>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Checkout
              </div>
              <DialogTitle className="text-white">Pay for your order</DialogTitle>
            </DialogHeader>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-white">
                ${total.toFixed(2)}
              </span>
              <span className="text-xs uppercase tracking-wider text-neutral-400">USD</span>
            </div>
            <div className="mt-1 text-xs text-neutral-300">
              {payload.quantity} part{payload.quantity !== 1 ? 's' : ''} ·{' '}
              {payload.materialName} · {payload.gauge}
            </div>
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
                      {savedPaymentMethods.map(pm => (
                        <SavedCardRow
                          key={pm.id}
                          pm={pm}
                          selected={selectedSavedId === pm.id}
                          onSelect={() => setSelectedSavedId(pm.id)}
                        />
                      ))}
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
                <p className="mt-5 text-base font-semibold text-neutral-900">Charging your card…</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Securely processing ${total.toFixed(2)}
                </p>
              </motion.div>
            )}

            {step === 'auth-required' && (
              <motion.div
                key="auth-required"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: easeOut }}
                className="space-y-5 py-2"
              >
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-900">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                    Sign in to checkout
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    We&apos;ll save this quote so you can pay right after you&apos;re in. Takes
                    about 30 seconds.
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => stashAndAuth('/auth/login')}
                    className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-700"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in to existing account
                  </Button>

                  <Button
                    onClick={() => stashAndAuth('/auth/register')}
                    variant="outline"
                    className="h-11 w-full"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create a new account
                  </Button>
                </div>

                <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-[11px] text-neutral-600">
                  <span className="font-medium text-neutral-900">Quote saved.</span>{' '}
                  ${total.toFixed(2)} · {payload.quantity} part{payload.quantity !== 1 ? 's' : ''} ·{' '}
                  {payload.materialName}
                </div>

                <p className="text-center">
                  <Link
                    href="/contact"
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                  >
                    Or contact us instead →
                  </Link>
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
                  Redirecting to your dashboard…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SavedCardRow({
  pm,
  selected,
  onSelect,
}: {
  pm: SavedPaymentMethod
  selected: boolean
  onSelect: () => void
}) {
  const brand = pm.brand?.toLowerCase() ?? 'card'
  const expiry =
    pm.expiry_month && pm.expiry_year
      ? `${String(pm.expiry_month).padStart(2, '0')}/${String(pm.expiry_year).slice(-2)}`
      : null
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-neutral-900 bg-neutral-900/[0.025] shadow-sm ring-1 ring-neutral-900/5'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      }`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
        <CreditCard className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
          {capitalize(brand)} •••• {pm.last4 ?? '----'}
          {pm.is_default && (
            <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
              Default
            </span>
          )}
        </div>
        {expiry && <div className="text-[11px] text-neutral-500">Expires {expiry}</div>}
      </div>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          selected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'
        }`}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
