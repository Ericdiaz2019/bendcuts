import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'

import { SettingsForm } from './SettingsForm'
import type { UserPreferences } from './actions'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name,last_name,email,preferences')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const initialPreferences = (profile.preferences as Partial<UserPreferences>) ?? {}

  return (
    <div className="min-h-screen bg-slate-50">
      <UserNav
        firstName={profile.first_name ?? null}
        lastName={profile.last_name ?? null}
        email={profile.email}
      />

      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 80% 0%, rgba(34,211,238,0.18), rgba(59,130,246,0.10) 40%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Account
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-300">
            Notifications, default quote settings, and display preferences.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6">
        <SettingsForm initial={initialPreferences} />
      </div>
    </div>
  )
}
