import Link from 'next/link'
import { ArrowRight, FolderKanban } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'

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
    <div className="min-h-screen bg-slate-50">
      <UserNav
        firstName={profile?.first_name ?? null}
        lastName={profile?.last_name ?? null}
        email={profile?.email ?? user.email ?? ''}
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
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Projects
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Your projects
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-300">
            Group related parts, files, and orders into reusable workspaces.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <NewProjectDialog />
            <Button
              asChild
              variant="outline"
              className="h-9 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/configure">Upload a CAD file</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        {decorated.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No projects yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a project to organize files and orders, or jump straight to a quote.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <NewProjectDialog />
              <Link
                href="/configure"
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Start a quote
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <ProjectsGrid projects={decorated} />
        )}
      </div>
    </div>
  )
}
