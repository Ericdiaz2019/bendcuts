'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  attachPaymentMethodProvider,
  chargeProvider,
  type NewCardInput,
  type PaymentChoice,
} from '@/lib/payments/provider'

type ActionResult = { ok: true } | { ok: false; error: string }

type PayDraftResult =
  | {
      ok: true
      orderId: string
      orderNumber: string
      paymentIntentId: string
    }
  | { ok: false; error: string; needsAuth?: boolean }

function validateNewCard(card: NewCardInput): string | null {
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

/**
 * Charge a draft order and flip it to confirmed. Used when an anonymous user
 * built a quote and signed in afterwards — PendingOrderClaimer creates the
 * draft, then the order detail page lets them pay it.
 */
export async function payDraftOrderAction(
  orderId: string,
  choice: PaymentChoice,
): Promise<PayDraftResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.', needsAuth: true }

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, order_number, action, status, total, currency, user_id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (fetchErr || !order) return { ok: false, error: 'Order not found.' }
  if (order.action !== 'save' || order.status !== 'pending') {
    return { ok: false, error: 'This order has already been submitted.' }
  }

  // Resolve payment method (mirrors submitWithPaymentAction).
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

  const amountCents = Math.round(Number(order.total) * 100)
  const charge = await chargeProvider(amountCents, order.currency || 'USD')
  if (charge.status !== 'succeeded') {
    return { ok: false, error: charge.failureMessage ?? 'Payment failed.' }
  }

  const { error: payErr } = await supabase.from('payments').insert({
    order_id: order.id,
    user_id: user.id,
    stripe_payment_intent_id: charge.stripePaymentIntentId,
    stripe_charge_id: charge.stripeChargeId,
    payment_method_id: paymentMethodId,
    amount: order.total,
    currency: order.currency || 'USD',
    status: charge.status,
    metadata: { provider: 'emulated', stripe_payment_method_id: stripePaymentMethodId },
  })
  if (payErr) {
    // TODO(stripe): refund the charge here when live keys arrive.
    return {
      ok: false,
      error:
        'We charged your card but could not record the payment. Contact support with payment ID ' +
        charge.stripePaymentIntentId,
    }
  }

  const { error: updErr } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      action: 'submit',
      submitted_at: new Date().toISOString(),
      payment_method_id: paymentMethodId,
    })
    .eq('id', orderId)
    .eq('user_id', user.id)
  if (updErr) return { ok: false, error: updErr.message }

  await supabase.from('activity_log').insert([
    {
      user_id: user.id,
      type: 'order_placed',
      title: `Order ${order.order_number} submitted`,
      description: `Draft completed and charged`,
      related_order_id: orderId,
      metadata: { total: order.total, from_draft: true },
    },
    {
      user_id: user.id,
      type: 'payment_succeeded',
      title: `Payment of $${Number(order.total).toFixed(2)} succeeded`,
      description: `Charged via ${stripePaymentMethodId ?? 'card on file'}`,
      related_order_id: orderId,
      metadata: { amount: order.total, provider: 'emulated' },
    },
  ])

  revalidatePath('/user/orders')
  revalidatePath(`/user/orders/${orderId}`)
  revalidatePath('/user/dashboard')
  revalidatePath('/user/billing')
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    paymentIntentId: charge.stripePaymentIntentId,
  }
}

const CANCELLABLE_STATUSES = ['pending', 'confirmed'] as const
type CancellableStatus = (typeof CANCELLABLE_STATUSES)[number]

export async function cancelOrderAction(orderId: string, reason?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, user_id, status, order_number')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (fetchErr || !order) return { ok: false, error: 'Order not found.' }

  if (!CANCELLABLE_STATUSES.includes(order.status as CancellableStatus)) {
    return {
      ok: false,
      error: `This order is ${order.status.replace(/_/g, ' ')} and can no longer be cancelled. Contact support if you need help.`,
    }
  }

  const trimmedReason = (reason ?? '').trim().slice(0, 500)

  const { error: updErr } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      notes: trimmedReason || null,
    })
    .eq('id', orderId)
    .eq('user_id', user.id)
  if (updErr) return { ok: false, error: updErr.message }

  await supabase.from('activity_log').insert({
    user_id: user.id,
    type: 'project_updated',
    title: `Order ${order.order_number} cancelled`,
    description: trimmedReason ? `Cancelled by customer — ${trimmedReason}` : 'Cancelled by customer',
    metadata: { from: order.status, to: 'cancelled', cancelled_by: 'customer' },
    related_order_id: orderId,
  })

  revalidatePath('/user/orders')
  revalidatePath(`/user/orders/${orderId}`)
  revalidatePath('/user/dashboard')
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  return { ok: true }
}
