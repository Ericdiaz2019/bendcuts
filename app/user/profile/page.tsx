import { Database, Lock, UserCircle, UserX } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'

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
            Profile
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-300">
            Personal info and account security.
          </p>
        </div>
      </div>

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
          <p className="mt-1 text-xs text-slate-500">
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
          {eyebrow}
        </div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
      </div>
    </div>
  )
}
