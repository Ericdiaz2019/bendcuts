import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { AdminNav } from './components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') redirect('/user/projects')

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav
        firstName={profile.first_name ?? null}
        lastName={profile.last_name ?? null}
        email={profile.email}
      />
      {children}
    </div>
  )
}
