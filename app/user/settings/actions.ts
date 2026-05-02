'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/supabase'

type ActionResult = { ok: true } | { ok: false; error: string }

export interface UserPreferences {
  notifications: {
    email: boolean
    sms: boolean
    orderUpdates: boolean
    marketing: boolean
    quotes: boolean
  }
  defaults: {
    rushOrder: boolean
    finishing: 'none' | 'deburr' | 'polish' | 'paint' | 'powder_coat'
    quantity: number
  }
  ui: {
    theme: 'light' | 'dark' | 'system'
    language: string
    currency: string
  }
}

export async function updatePreferencesAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const next: UserPreferences = {
    notifications: {
      email: formData.get('notifications.email') === 'on',
      sms: formData.get('notifications.sms') === 'on',
      orderUpdates: formData.get('notifications.orderUpdates') === 'on',
      marketing: formData.get('notifications.marketing') === 'on',
      quotes: formData.get('notifications.quotes') === 'on',
    },
    defaults: {
      rushOrder: formData.get('defaults.rushOrder') === 'on',
      finishing:
        (String(formData.get('defaults.finishing')) as UserPreferences['defaults']['finishing']) ||
        'none',
      quantity: Math.max(1, Math.min(10000, Number(formData.get('defaults.quantity')) || 1)),
    },
    ui: {
      theme: (String(formData.get('ui.theme')) as UserPreferences['ui']['theme']) || 'system',
      language: String(formData.get('ui.language')) || 'en',
      currency: String(formData.get('ui.currency')) || 'USD',
    },
  }

  const { error } = await supabase
    .from('profiles')
    .update({ preferences: next as unknown as Json })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/user/settings')
  return { ok: true }
}
