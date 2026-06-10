'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/supabase'

type OrderStatus = Database['public']['Enums']['order_status']

type ActionResult<T = void> =
  | ({ ok: true } & ([T] extends [void] ? object : { data: T }))
  | { ok: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, isAdmin: false as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return { supabase, user, isAdmin: profile?.role === 'admin' }
}

const ORDER_STATUS_VALUES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'in_production',
  'quality_check',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

function revalidateOrder(orderId?: string) {
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/orders')
  if (orderId) revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/user/projects')
  revalidatePath('/user/orders')
  if (orderId) revalidatePath(`/user/orders/${orderId}`)
}

export async function updateOrderStatusAction(
  orderId: string,
  newStatus: OrderStatus,
): Promise<ActionResult> {
  if (!ORDER_STATUS_VALUES.includes(newStatus)) {
    return { ok: false, error: 'Invalid status.' }
  }

  const { supabase, user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) return { ok: false, error: 'Forbidden.' }

  const { data: existing, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, user_id, order_number')
    .eq('id', orderId)
    .maybeSingle()

  if (fetchErr || !existing) return { ok: false, error: 'Order not found.' }
  if (existing.status === newStatus) return { ok: true }

  const patch: Database['public']['Tables']['orders']['Update'] = {
    status: newStatus,
  }
  if (newStatus === 'delivered') {
    patch.actual_delivery = new Date().toISOString().slice(0, 10)
  }

  const { error: updateErr } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)

  if (updateErr) return { ok: false, error: updateErr.message }

  await supabase.from('activity_log').insert({
    user_id: existing.user_id,
    type: newStatus === 'shipped' ? 'order_shipped' : 'project_updated',
    title: `Order ${existing.order_number} → ${newStatus.replace(/_/g, ' ')}`,
    description: `Status changed by admin`,
    metadata: { from: existing.status, to: newStatus, by_admin: user.id },
    related_order_id: orderId,
  })

  revalidateOrder(orderId)
  return { ok: true }
}

export async function addAdminNoteAction(
  orderId: string,
  body: string,
): Promise<ActionResult> {
  const trimmed = body.trim()
  if (trimmed.length < 1) return { ok: false, error: 'Note cannot be empty.' }
  if (trimmed.length > 4000) return { ok: false, error: 'Note is too long.' }

  const { supabase, user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) return { ok: false, error: 'Forbidden.' }

  const { error } = await supabase.from('admin_notes').insert({
    order_id: orderId,
    author_id: user.id,
    body: trimmed,
  })
  if (error) return { ok: false, error: error.message }

  revalidateOrder(orderId)
  return { ok: true }
}

export async function deleteAdminNoteAction(
  noteId: string,
  orderId: string,
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) return { ok: false, error: 'Forbidden.' }

  const { error } = await supabase.from('admin_notes').delete().eq('id', noteId)
  if (error) return { ok: false, error: error.message }

  revalidateOrder(orderId)
  return { ok: true }
}

export async function markShippedAction(
  orderId: string,
  carrier: string,
  trackingNumber: string,
  estimatedDelivery: string | null,
): Promise<ActionResult> {
  if (!carrier.trim() || !trackingNumber.trim()) {
    return { ok: false, error: 'Carrier and tracking number are required.' }
  }

  const { supabase, user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) return { ok: false, error: 'Forbidden.' }

  const { data: existing } = await supabase
    .from('orders')
    .select('id, user_id, order_number')
    .eq('id', orderId)
    .maybeSingle()
  if (!existing) return { ok: false, error: 'Order not found.' }

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'shipped',
      carrier: carrier.trim(),
      tracking_number: trackingNumber.trim(),
      estimated_delivery: estimatedDelivery || null,
    })
    .eq('id', orderId)
  if (error) return { ok: false, error: error.message }

  await supabase.from('activity_log').insert({
    user_id: existing.user_id,
    type: 'order_shipped',
    title: `Order ${existing.order_number} shipped via ${carrier.trim()}`,
    description: `Tracking ${trackingNumber.trim()}`,
    metadata: { carrier: carrier.trim(), tracking_number: trackingNumber.trim(), by_admin: user.id },
    related_order_id: orderId,
  })

  revalidateOrder(orderId)
  return { ok: true }
}

export async function refundPaymentAction(
  paymentId: string,
  orderId: string,
  amountCents: number | null,
  reason: string | null,
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) return { ok: false, error: 'Forbidden.' }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, refunded_amount, status, currency, order_id, user_id, metadata')
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment) return { ok: false, error: 'Payment not found.' }
  if (payment.status !== 'succeeded' && payment.status !== 'requires_capture') {
    return { ok: false, error: `Cannot refund a ${payment.status} payment.` }
  }

  const refundCentsRequested = amountCents ?? Math.round((Number(payment.amount) - Number(payment.refunded_amount)) * 100)
  const remainingCents = Math.round((Number(payment.amount) - Number(payment.refunded_amount)) * 100)
  if (refundCentsRequested <= 0 || refundCentsRequested > remainingCents) {
    return { ok: false, error: 'Refund amount exceeds remaining balance.' }
  }

  const refundDollars = refundCentsRequested / 100
  const newRefundedTotal = Number(payment.refunded_amount) + refundDollars
  const fullRefund = Math.abs(newRefundedTotal - Number(payment.amount)) < 0.005

  const previousMetadata =
    payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
      ? (payment.metadata as Record<string, unknown>)
      : {}

  const previousRefunds = Array.isArray(previousMetadata.refunds)
    ? (previousMetadata.refunds as unknown[])
    : []

  // EMULATOR: simulate Stripe refund. When Stripe is wired, replace with stripe.refunds.create()
  // and store the returned refund.id; the columns/metadata shape stays identical.
  const emulatedRefundId = `re_emulated_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2)}`

  const newMetadata: Record<string, unknown> = {
    ...previousMetadata,
    refunds: [
      ...previousRefunds,
      {
        id: emulatedRefundId,
        amount: refundDollars,
        currency: payment.currency,
        reason: reason?.trim() || null,
        by_admin: user.id,
        at: new Date().toISOString(),
      },
    ],
  }

  const { error: payErr } = await supabase
    .from('payments')
    .update({
      refunded_amount: newRefundedTotal,
      status: fullRefund ? 'refunded' : 'succeeded',
      metadata: newMetadata as Database['public']['Tables']['payments']['Update']['metadata'],
    })
    .eq('id', paymentId)
  if (payErr) return { ok: false, error: payErr.message }

  if (fullRefund) {
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId)
  }

  await supabase.from('activity_log').insert({
    user_id: payment.user_id,
    type: 'payment_failed',
    title: fullRefund ? 'Payment fully refunded' : 'Payment partially refunded',
    description: `${refundDollars.toFixed(2)} ${payment.currency.toUpperCase()} refunded${reason ? ` — ${reason.trim()}` : ''}`,
    metadata: { refund_id: emulatedRefundId, amount: refundDollars, by_admin: user.id },
    related_order_id: orderId,
  })

  revalidateOrder(orderId)
  revalidatePath('/admin/billing')
  revalidatePath('/user/billing')
  return { ok: true }
}

export async function updatePricingConfigAction(
  patch: {
    bending_cost_per_bend: number
    cutting_cost_per_cut: number
    setup_cost: number
    labor_rate: number
    base_time_per_part: number
    time_per_bend: number
    time_per_cut: number
    tax_rate: number
  },
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) return { ok: false, error: 'Forbidden.' }

  const MAX_PRICING: Record<keyof typeof patch, number> = {
    bending_cost_per_bend: 1000,
    cutting_cost_per_cut: 1000,
    setup_cost: 100000,
    labor_rate: 1000,
    base_time_per_part: 100,
    time_per_bend: 100,
    time_per_cut: 100,
    tax_rate: 1,
  }
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      return { ok: false, error: `Invalid ${k}: ${v}` }
    }
    const max = MAX_PRICING[k as keyof typeof patch]
    if (v > max) {
      return { ok: false, error: `${k} is too large (max ${max}).` }
    }
  }
  if (patch.tax_rate > 1) {
    return { ok: false, error: 'Tax rate must be a fraction (e.g. 0.08875 = 8.875%).' }
  }

  const { error } = await supabase
    .from('pricing_config')
    .update({ ...patch, updated_by: user.id })
    .eq('id', 'default')
  if (error) return { ok: false, error: error.message }

  await supabase.from('activity_log').insert({
    user_id: user.id,
    type: 'project_updated',
    title: 'Pricing config updated',
    description: 'Admin updated pricing constants',
    metadata: { ...patch, by_admin: user.id },
  })

  revalidatePath('/admin/pricing')
  return { ok: true }
}

export async function setUserRoleAction(
  targetUserId: string,
  newRole: Database['public']['Enums']['user_role'],
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) return { ok: false, error: 'Forbidden.' }

  if (targetUserId === user.id && newRole !== 'admin') {
    return { ok: false, error: "You can't demote yourself." }
  }

  const { data: previous } = await supabase
    .from('profiles')
    .select('role, email, first_name, last_name')
    .eq('id', targetUserId)
    .maybeSingle()
  if (!previous) return { ok: false, error: 'User not found.' }
  if (previous.role === newRole) return { ok: true }

  // Never let the system drop to zero admins — that locks /admin for everyone and
  // can only be repaired directly in the database.
  if (previous.role === 'admin' && newRole !== 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .neq('id', targetUserId)
    if (!count || count < 1) {
      return { ok: false, error: 'Cannot remove the last admin.' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)
  if (error) return { ok: false, error: error.message }

  const targetLabel =
    [previous.first_name, previous.last_name].filter(Boolean).join(' ') ||
    previous.email ||
    targetUserId.slice(0, 8)

  await supabase.from('activity_log').insert({
    user_id: targetUserId,
    type: 'project_updated',
    title: `Role changed: ${previous.role} → ${newRole}`,
    description: `${targetLabel} role set to ${newRole} by admin`,
    metadata: { from: previous.role, to: newRole, by_admin: user.id, target_user_id: targetUserId },
  })

  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${targetUserId}`)
  return { ok: true }
}
