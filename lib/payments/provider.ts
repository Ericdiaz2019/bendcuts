/**
 * Payment provider abstraction.
 *
 * The current implementation is an emulator — it never makes a network call.
 * To switch to live Stripe:
 *   1. Drop in the Stripe SDK calls inside `chargeProvider` and `attachPaymentMethodProvider`.
 *   2. Add STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET to env.
 *   3. Replace EmulatedCardInput in CheckoutDialog with @stripe/react-stripe-js's PaymentElement.
 *   4. Implement app/api/webhooks/stripe/route.ts to update payments rows by stripe_payment_intent_id.
 *
 * The function signatures and the Supabase schema do not change.
 */

import type { Database } from '@/lib/types/supabase'

export type PaymentMethodType = Database['public']['Enums']['payment_method_type']
export type PaymentStatus = Database['public']['Enums']['payment_status']

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'unknown'

export interface NewCardInput {
  number: string
  expMonth: number
  expYear: number
  cvc: string
  zip?: string
  name?: string
}

export interface AttachedPaymentMethod {
  stripePaymentMethodId: string
  type: PaymentMethodType
  brand: CardBrand
  last4: string
  expiryMonth: number
  expiryYear: number
}

export type PaymentChoice =
  | { kind: 'saved'; paymentMethodId: string; stripePaymentMethodId: string | null }
  | { kind: 'new'; card: NewCardInput; saveForFuture: boolean }

export interface ChargeResult {
  stripePaymentIntentId: string
  stripeChargeId: string | null
  status: PaymentStatus
  failureMessage: string | null
}

// Brand detection — matches the prefix table Stripe and most processors use.
export function detectCardBrand(rawNumber: string): CardBrand {
  const n = rawNumber.replace(/\D/g, '')
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^6(?:011|5)/.test(n)) return 'discover'
  if (/^3(?:0[0-5]|[68])/.test(n)) return 'diners'
  if (/^35(?:2[89]|[3-8])/.test(n)) return 'jcb'
  if (/^62/.test(n)) return 'unionpay'
  return 'unknown'
}

export function luhnCheck(rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, '')
  if (digits.length < 12 || digits.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

const EMULATOR_DELAY_MS = 1200

export async function attachPaymentMethodProvider(
  card: NewCardInput,
): Promise<AttachedPaymentMethod> {
  // EMULATOR: simulate Stripe's "create + attach payment method" round-trip
  await new Promise(resolve => setTimeout(resolve, 600))
  const digits = card.number.replace(/\D/g, '')
  return {
    stripePaymentMethodId: `pm_emulated_${cryptoRandom()}`,
    type: 'card',
    brand: detectCardBrand(digits),
    last4: digits.slice(-4),
    expiryMonth: card.expMonth,
    expiryYear: card.expYear,
  }
}

export async function chargeProvider(
  amountCents: number,
  currency: string,
): Promise<ChargeResult> {
  // EMULATOR: simulate a Stripe PaymentIntent confirmation
  await new Promise(resolve => setTimeout(resolve, EMULATOR_DELAY_MS))

  // Always succeed for now. To test failure paths later, gate on a magic
  // amount (e.g. amountCents === 4242 → declined).
  void currency
  void amountCents

  return {
    stripePaymentIntentId: `pi_emulated_${cryptoRandom()}`,
    stripeChargeId: `ch_emulated_${cryptoRandom()}`,
    status: 'succeeded',
    failureMessage: null,
  }
}

function cryptoRandom() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return Math.random().toString(36).slice(2)
}

export const PAYMENT_PROVIDER_NAME: 'emulated' | 'stripe' = 'emulated'
