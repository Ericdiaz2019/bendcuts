import { Database, Lock, UserCircle, UserX } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'
import { PageHeader } from '@/app/user/components/PageHeader'

import { ChangeEmailCard, DataExportCard, DeactivateAccountCard } from './AccountActions'
import { PasswordForm } from './PasswordForm'
import { ProfileForm } from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return (
    <div className="min-h-screen bg-white">
      <UserNav
        firstName={profile.first_name ?? null}
        lastName={profile.last_name ?? null}
        email={profile.email}
      />

      <PageHeader
        title="Profile"
        description="Personal info and account security."
        widthClassName="max-w-4xl"
      />

      <div className="mx-auto max-w-4xl space-y-10 px-4 pb-12 pt-8 sm:px-6">
        <section>
          <SectionHeader
            eyebrow="Personal info"
            title="Your details"
            icon={<UserCircle className="h-4 w-4" />}
          />
          <div className="mt-4">
            <ProfileForm profile={profile} />
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Security"
            title="Change password"
            icon={<Lock className="h-4 w-4" />}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Choose a strong password you don&apos;t use elsewhere.
          </p>
          <div className="mt-4">
            <PasswordForm />
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Account"
            title="Email & data"
            icon={<Database className="h-4 w-4" />}
          />
          <div className="mt-4 grid gap-4">
            <ChangeEmailCard currentEmail={profile.email} />
            <DataExportCard />
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Danger zone"
            title="Deactivate account"
            icon={<UserX className="h-4 w-4" />}
          />
          <div className="mt-4">
            <DeactivateAccountCard />
          </div>
        </section>
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string
  title: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {eyebrow}
        </div>
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">{title}</h2>
      </div>
    </div>
  )
}
