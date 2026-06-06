'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/supabase'

type AddressType = Database['public']['Enums']['address_type']

type ActionResult = { ok: true } | { ok: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function upsertAddressAction(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') as string | null) || null
  const type = formData.get('type') as AddressType
  const name = String(formData.get('name') ?? '').trim()
  const company = String(formData.get('company') ?? '').trim() || null
  const street1 = String(formData.get('street1') ?? '').trim()
  const street2 = String(formData.get('street2') ?? '').trim() || null
  const city = String(formData.get('city') ?? '').trim()
  const state = String(formData.get('state') ?? '').trim()
  const zipCode = String(formData.get('zip_code') ?? '').trim()
  const country = String(formData.get('country') ?? 'US').trim() || 'US'
  const phone = String(formData.get('phone') ?? '').trim() || null
  const isDefault = formData.get('is_default') === 'on'

  if (!type || !name || !street1 || !city || !state || !zipCode) {
    return { ok: false, error: 'Please fill in all required fields.' }
  }

  try {
    const { supabase, user } = await requireUser()
    const payload = {
      user_id: user.id,
      type,
      name,
      company,
      street1,
      street2,
      city,
      state,
      zip_code: zipCode,
      country,
      phone,
      is_default: isDefault,
    }

    const { error } = id
      ? await supabase.from('addresses').update(payload).eq('id', id).eq('user_id', user.id)
      : await supabase.from('addresses').insert(payload)

    if (error) return { ok: false, error: error.message }
    revalidatePath('/user/billing')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save address.' }
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser()
    const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', user.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/user/billing')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete.' }
  }
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/user/billing')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not set default.' }
  }
}

export async function deletePaymentMethodAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/user/billing')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete.' }
  }
}

export async function setDefaultPaymentMethodAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/user/billing')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not set default.' }
  }
}
