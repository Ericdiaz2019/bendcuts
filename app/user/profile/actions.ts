'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

type ActionResult = { ok: true } | { ok: false; error: string }
type ActionResultWith<T> = ({ ok: true } & T) | { ok: false; error: string }

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const firstName = String(formData.get('first_name') ?? '').trim() || null
  const lastName = String(formData.get('last_name') ?? '').trim() || null
  const company = String(formData.get('company') ?? '').trim() || null
  const phone = String(formData.get('phone') ?? '').trim() || null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, company, phone })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/user', 'layout')
  return { ok: true }
}

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (password !== confirm) return { ok: false, error: 'Passwords do not match.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function changeEmailAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'Enter a valid email address.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  if (user.email?.toLowerCase() === email) {
    return { ok: false, error: 'That is already your email.' }
  }

  // Supabase sends a verification link to the new address. Email isn't actually changed
  // until the user clicks it. The profile.email will sync via Supabase's auth-to-profile trigger.
  const { error } = await supabase.auth.updateUser({ email })
  if (error) return { ok: false, error: error.message }

  return { ok: true }
}

export async function exportMyDataAction(): Promise<ActionResultWith<{ data: Record<string, unknown> }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const [
    profileRes,
    addressesRes,
    paymentMethodsRes,
    projectsRes,
    cadFilesRes,
    configurationsRes,
    ordersRes,
    orderItemsRes,
    paymentsRes,
    activityRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', user.id),
    supabase
      .from('payment_methods')
      .select('id, type, brand, last4, expiry_month, expiry_year, is_default, is_valid, created_at')
      .eq('user_id', user.id),
    supabase.from('projects').select('*').eq('user_id', user.id),
    supabase.from('cad_files').select('*').eq('user_id', user.id),
    supabase.from('configurations').select('*').eq('user_id', user.id),
    supabase.from('orders').select('*').eq('user_id', user.id),
    supabase
      .from('order_items')
      .select('*, orders!inner(user_id)')
      .eq('orders.user_id', user.id),
    supabase.from('payments').select('*').eq('user_id', user.id),
    supabase.from('activity_log').select('*').eq('user_id', user.id),
  ])

  return {
    ok: true,
    data: {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
      profile: profileRes.data,
      addresses: addressesRes.data ?? [],
      payment_methods: paymentMethodsRes.data ?? [],
      projects: projectsRes.data ?? [],
      cad_files: cadFilesRes.data ?? [],
      configurations: configurationsRes.data ?? [],
      orders: ordersRes.data ?? [],
      order_items: orderItemsRes.data ?? [],
      payments: paymentsRes.data ?? [],
      activity_log: activityRes.data ?? [],
    },
  }
}

export async function deactivateAccountAction(formData: FormData): Promise<ActionResult> {
  const confirm = String(formData.get('confirm') ?? '').trim()
  if (confirm !== 'DELETE') {
    return { ok: false, error: 'Type DELETE to confirm.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  // Soft-delete: mark inactive. We retain order history for accounting/legal purposes.
  // Hard delete (auth row purge + data wipe) requires admin action via Supabase dashboard
  // or a service-role endpoint — out of scope for self-service.
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }

  await supabase.from('activity_log').insert({
    user_id: user.id,
    type: 'project_updated',
    title: 'Account deactivated',
    description: 'Customer-initiated account deactivation. Data retained for legal/accounting.',
    metadata: { action: 'deactivate', initiated_by: 'self' },
  })

  await supabase.auth.signOut()
  revalidatePath('/user', 'layout')
  return { ok: true }
}
