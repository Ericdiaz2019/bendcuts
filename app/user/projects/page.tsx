import Link from 'next/link'
import { FolderKanban, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'
import { OrderFlash } from '@/app/user/components/OrderFlash'
import { PageHeader } from '@/app/user/components/PageHeader'
import { PendingOrderClaimer } from '@/app/user/components/PendingOrderClaimer'

import { NewProjectDialog } from './NewProjectDialog'
import { ProjectsGrid } from './ProjectsGrid'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, projectsRes, fileCountsRes, orderCountsRes] = await Promise.all([
    supabase.from('profiles').select('first_name,last_name,email').eq('id', user.id).single(),
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('cad_files')
      .select('project_id')
      .eq('user_id', user.id)
      .not('project_id', 'is', null),
    supabase
      .from('orders')
      .select('project_id')
      .eq('user_id', user.id)
      .not('project_id', 'is', null),
  ])

  const profile = profileRes.data
  const projects = projectsRes.data ?? []

  const fileCountByProject = (fileCountsRes.data ?? []).reduce<Record<string, number>>((acc, row) => {
    if (row.project_id) acc[row.project_id] = (acc[row.project_id] ?? 0) + 1
    return acc
  }, {})
  const orderCountByProject = (orderCountsRes.data ?? []).reduce<Record<string, number>>((acc, row) => {
    if (row.project_id) acc[row.project_id] = (acc[row.project_id] ?? 0) + 1
    return acc
  }, {})

  const decorated = projects.map(p => ({
    ...p,
    fileCount: fileCountByProject[p.id] ?? 0,
    orderCount: orderCountByProject[p.id] ?? 0,
  }))

  return (
    <div className="min-h-screen bg-white">
      <UserNav
        firstName={profile?.first_name ?? null}
        lastName={profile?.last_name ?? null}
        email={profile?.email ?? user.email ?? ''}
      />

      <PageHeader
        title="Projects"
        description="Your parts, files, and orders — grouped by project."
        actions={
          <>
            <NewProjectDialog />
            <Button asChild className="h-9 bg-neutral-900 text-white hover:bg-neutral-700">
              <Link href="/configure">
                <Upload className="mr-1.5 h-4 w-4" />
                Upload a drawing
              </Link>
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        <OrderFlash />
        <PendingOrderClaimer />

        {decorated.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-neutral-900">No projects yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
              Upload a drawing to get an instant quote, or create a project to organize files and
              orders.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild className="h-9 bg-neutral-900 text-white hover:bg-neutral-700">
                <Link href="/configure">
                  <Upload className="mr-1.5 h-4 w-4" />
                  Upload a drawing
                </Link>
              </Button>
              <NewProjectDialog />
            </div>
          </div>
        ) : (
          <ProjectsGrid projects={decorated} />
        )}
      </div>
    </div>
  )
}
