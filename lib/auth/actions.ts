'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'

type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

type SignUpResult =
  | { ok: true; signedIn: boolean }
  | { ok: false; error: string }

function siteOrigin(headerHost: string | null) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (headerHost) {
    const protocol = headerHost.startsWith('localhost') ? 'http' : 'https'
    return `${protocol}://${headerHost}`
  }
  return 'http://localhost:3000'
}

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/user/dashboard')

  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(next.startsWith('/') ? next : '/user/dashboard')
}

export async function signUpAction(formData: FormData): Promise<SignUpResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const company = String(formData.get('company') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!email || !password || !firstName || !lastName) {
    return { ok: false, error: 'Please fill in all required fields.' }
  }

  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }

  const headerList = await headers()
  const origin = siteOrigin(headerList.get('host'))

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/user/dashboard`,
      data: {
        first_name: firstName,
        last_name: lastName,
        company: company || undefined,
        phone: phone || undefined,
      },
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  // When "Confirm email" is OFF in Supabase, signUp returns a session immediately.
  // When ON but our auto-confirm trigger fired, we still need to call signInWithPassword
  // to actually establish the session cookie. Try it; if it succeeds, we're in.
  let signedIn = !!data.session
  if (!signedIn) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (!signInErr) signedIn = true
  }

  if (signedIn) {
    revalidatePath('/', 'layout')
  }
  return { ok: true, signedIn }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { ok: false, error: 'Email is required.' }

  const headerList = await headers()
  const origin = siteOrigin(headerList.get('host'))

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updatePasswordAction(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirm) {
    return { ok: false, error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/', 'layout')
  redirect('/user/dashboard')
}
