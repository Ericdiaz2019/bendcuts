'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { OrderActionType } from '@/lib/types/orders'
import type { Database } from '@/lib/types/supabase'
import {
  attachPaymentMethodProvider,
  chargeProvider,
  type NewCardInput,
  type PaymentChoice,
} from '@/lib/payments/provider'
import { validateAndRecompute } from '@/lib/configure/validateOrder'
import { getPricingConfig } from '@/lib/configure/pricingConfig'

type CadFileType = Database['public']['Enums']['cad_file_type']

type SubmitResult =
  | {
      ok: true
      orderId: string
      orderNumber: string
      action: OrderActionType
      materialName: string
      quantity: number
      idempotentReplay: boolean
    }
  | { ok: false; error: string; needsAuth?: boolean }

function inferFileType(fileName: string): CadFileType {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (ext === 'step' || ext === 'stp' || ext === 'iges' || ext === 'igs' || ext === 'dxf') {
    return ext as CadFileType
  }
  return 'step'
}

export async function submitOrderAction(
  payload: unknown,
  action: OrderActionType,
): Promise<SubmitResult> {
  if (action !== 'submit' && action !== 'save') {
    return { ok: false, error: 'Invalid order action.' }
  }

  const pricingConfig = await getPricingConfig()
  const validation = validateAndRecompute(payload, pricingConfig)
  if (!validation.ok) return { ok: false, error: validation.error }
  const { payload: validated, canonicalQuote } = validation

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in', needsAuth: true }

  const fileType = inferFileType(validated.file.name)
  const storagePath =
    validated.file.storagePath ??
    `${user.id}/pending/${crypto.randomUUID()}/${validated.file.name}`

  if (validated.file.storagePath && !validated.file.storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: 'Storage path does not belong to this user.' }
  }

  const { data, error } = await supabase.rpc('create_order_graph', {
    p_idempotency_key: validated.idempotencyKey ?? null,
    p_action: action,
    p_status: 'pending',
    p_payment_method_id: null,
    p_subtotal: canonicalQuote.subtotal,
    p_tax: canonicalQuote.tax,
    p_shipping: 0,
    p_total: canonicalQuote.total,
    p_currency: 'USD',
    p_file_name: validated.file.name,
    p_file_size: validated.file.fileSize ?? 0,
    p_file_type: fileType,
    p_storage_bucket: 'cad-files',
    p_storage_path: storagePath,
    p_parsed_analysis: {
      lengthMm: validated.file.lengthMm,
      lengthInches: validated.file.lengthInches,
      originalUnits: validated.file.originalUnits ?? null,
      bends: validated.file.bends,
      cuts: validated.file.cuts,
    },
    p_material_id: null,
    p_material_name: validated.materialName,
    p_gauge: validated.gauge,
    p_quantity: validated.quantity,
    p_quote: canonicalQuote as unknown as Database['public']['Tables']['configurations']['Insert']['quote'],
    p_length_mm: validated.file.lengthMm,
    p_length_inches: validated.file.lengthInches,
    p_bends: validated.file.bends,
    p_cuts: validated.file.cuts,
    p_price_per_part: canonicalQuote.pricePerPart,
    p_payment_intent_id: null,
    p_payment_charge_id: null,
    p_payment_status: null,
    p_payment_metadata: null,
  })

  if (error || !data || data.length === 0) {
    return { ok: false, error: error?.message ?? 'Could not create order.' }
  }
  const row = data[0]

  revalidatePath('/user/dashboard')
  revalidatePath('/user/orders')

  return {
    ok: true,
    orderId: row.order_id,
    orderNumber: row.order_number,
    action,
    materialName: validated.materialName,
    quantity: validated.quantity,
    idempotentReplay: row.idempotent_replay,
  }
}

type PaidSubmitResult =
  | {
      ok: true
      orderId: string
      orderNumber: string
      materialName: string
      quantity: number
      paymentIntentId: string
      idempotentReplay: boolean
    }
  | { ok: false; error: string; needsAuth?: boolean }

function validateNewCard(card: NewCardInput): string | null {
  // Emulator: length-only check so random demo numbers go through.
  // The live Stripe path validates server-side via PaymentMethod creation.
  const digits = card.number.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return 'That card number is invalid.'
  if (!card.expMonth || card.expMonth < 1 || card.expMonth > 12) return 'Expiration month is invalid.'
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  if (card.expYear < currentYear || (card.expYear === currentYear && card.expMonth < currentMonth)) {
    return 'This card is expired.'
  }
  if (!card.cvc || card.cvc.length < 3 || card.cvc.length > 4) return 'CVC is invalid.'
  return null
}

export async function submitWithPaymentAction(
  payload: unknown,
  choice: PaymentChoice,
): Promise<PaidSubmitResult> {
  const pricingConfig = await getPricingConfig()
  const validation = validateAndRecompute(payload, pricingConfig)
  if (!validation.ok) return { ok: false, error: validation.error }
  const { payload: validated, canonicalQuote } = validation

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in', needsAuth: true }

  // Idempotency replay: if this key already produced an order for this user,
  // short-circuit before charging.
  if (validated.idempotencyKey) {
    const { data: existing } = await supabase
      .from('orders')
      .select('id, order_number, payment_method_id, payments:payments!payments_order_id_fkey(stripe_payment_intent_id)')
      .eq('user_id', user.id)
      .eq('idempotency_key', validated.idempotencyKey)
      .maybeSingle()
    if (existing) {
      const pi = Array.isArray(existing.payments) ? existing.payments[0] : null
      return {
        ok: true,
        orderId: existing.id,
        orderNumber: existing.order_number,
        materialName: validated.materialName,
        quantity: validated.quantity,
        paymentIntentId: pi?.stripe_payment_intent_id ?? '',
        idempotentReplay: true,
      }
    }
  }

  // Resolve the payment method — either an existing one or attach a new one.
  let paymentMethodId: string | null = null
  let stripePaymentMethodId: string | null = null

  if (choice.kind === 'saved') {
    const { data: pm, error } = await supabase
      .from('payment_methods')
      .select('id, stripe_payment_method_id, user_id')
      .eq('id', choice.paymentMethodId)
      .single()
    if (error || !pm) return { ok: false, error: 'Saved payment method not found.' }
    if (pm.user_id !== user.id) return { ok: false, error: 'Payment method does not belong to you.' }
    paymentMethodId = pm.id
    stripePaymentMethodId = pm.stripe_payment_method_id
  } else {
    const validationError = validateNewCard(choice.card)
    if (validationError) return { ok: false, error: validationError }

    const attached = await attachPaymentMethodProvider(choice.card)
    stripePaymentMethodId = attached.stripePaymentMethodId

    if (choice.saveForFuture) {
      const { count } = await supabase
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      const shouldBeDefault = (count ?? 0) === 0

      const { data: inserted, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          stripe_payment_method_id: attached.stripePaymentMethodId,
          type: attached.type,
          brand: attached.brand,
          last4: attached.last4,
          expiry_month: attached.expiryMonth,
          expiry_year: attached.expiryYear,
          is_default: shouldBeDefault,
          is_valid: true,
        })
        .select('id')
        .single()
      if (error || !inserted) {
        return { ok: false, error: error?.message ?? 'Could not save card.' }
      }
      paymentMethodId = inserted.id
    }
  }

  // Charge via the provider (emulator today, Stripe later).
  const amountCents = Math.round(canonicalQuote.total * 100)
  const charge = await chargeProvider(amountCents, 'USD')

  if (charge.status !== 'succeeded') {
    return { ok: false, error: charge.failureMessage ?? 'Payment failed.' }
  }

  // Create the full order graph + payment row + activity log atomically.
  const fileType = inferFileType(validated.file.name)
  const storagePath =
    validated.file.storagePath ??
    `${user.id}/pending/${crypto.randomUUID()}/${validated.file.name}`

  if (validated.file.storagePath && !validated.file.storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: 'Storage path does not belong to this user.' }
  }

  const { data, error } = await supabase.rpc('create_order_graph', {
    p_idempotency_key: validated.idempotencyKey ?? null,
    p_action: 'submit',
    p_status: 'confirmed',
    p_payment_method_id: paymentMethodId,
    p_subtotal: canonicalQuote.subtotal,
    p_tax: canonicalQuote.tax,
    p_shipping: 0,
    p_total: canonicalQuote.total,
    p_currency: 'USD',
    p_file_name: validated.file.name,
    p_file_size: validated.file.fileSize ?? 0,
    p_file_type: fileType,
    p_storage_bucket: 'cad-files',
    p_storage_path: storagePath,
    p_parsed_analysis: {
      lengthMm: validated.file.lengthMm,
      lengthInches: validated.file.lengthInches,
      originalUnits: validated.file.originalUnits ?? null,
      bends: validated.file.bends,
      cuts: validated.file.cuts,
    },
    p_material_id: null,
    p_material_name: validated.materialName,
    p_gauge: validated.gauge,
    p_quantity: validated.quantity,
    p_quote: canonicalQuote as unknown as Database['public']['Tables']['configurations']['Insert']['quote'],
    p_length_mm: validated.file.lengthMm,
    p_length_inches: validated.file.lengthInches,
    p_bends: validated.file.bends,
    p_cuts: validated.file.cuts,
    p_price_per_part: canonicalQuote.pricePerPart,
    p_payment_intent_id: charge.stripePaymentIntentId,
    p_payment_charge_id: charge.stripeChargeId,
    p_payment_status: charge.status,
    p_payment_metadata: {
      provider: 'emulated',
      stripe_payment_method_id: stripePaymentMethodId,
    },
  })

  if (error || !data || data.length === 0) {
    // Order/payment graph failed AFTER successful charge.
    // TODO(stripe): wire `stripe.refunds.create({ payment_intent })` here once live keys arrive.
    // The emulator doesn't move real money, so this is logged-only for now.
    console.error('Order graph creation failed after successful charge', {
      paymentIntentId: charge.stripePaymentIntentId,
      userId: user.id,
      error: error?.message,
    })
    return {
      ok: false,
      error:
        'We charged your card but the order failed to save. Our team has been notified — please contact support with payment ID ' +
        charge.stripePaymentIntentId,
    }
  }
  const row = data[0]

  revalidatePath('/user/dashboard')
  revalidatePath('/user/orders')
  revalidatePath('/user/billing')

  return {
    ok: true,
    orderId: row.order_id,
    orderNumber: row.order_number,
    materialName: validated.materialName,
    quantity: validated.quantity,
    paymentIntentId: charge.stripePaymentIntentId,
    idempotentReplay: row.idempotent_replay,
  }
}
