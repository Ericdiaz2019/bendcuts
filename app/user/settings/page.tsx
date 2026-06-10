import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'
import { PageHeader } from '@/app/user/components/PageHeader'

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
    <div className="min-h-screen bg-white">
      <UserNav
        firstName={profile.first_name ?? null}
        lastName={profile.last_name ?? null}
        email={profile.email}
      />

      <PageHeader
        title="Settings"
        description="Notifications, default quote settings, and display preferences."
        widthClassName="max-w-4xl"
      />

      <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6">
        <SettingsForm initial={initialPreferences} />
      </div>
    </div>
  )
}
