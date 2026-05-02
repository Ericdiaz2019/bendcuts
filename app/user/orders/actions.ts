'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

type ActionResult = { ok: true } | { ok: false; error: string }

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
