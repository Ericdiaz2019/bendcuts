import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'

import { ActivityFeed } from './ActivityFeed'
import { PendingOrderClaimer } from './PendingOrderClaimer'
import { QuickActions } from './QuickActions'
import { RecentProjects } from './RecentProjects'
import { StatCard } from './StatCard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, statsRes, projectsRes, activityRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(4),
    supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const profile = profileRes.data
  const stats = statsRes.data
  const projects = projectsRes.data ?? []
  const activity = activityRes.data ?? []

  const firstName = profile?.first_name?.trim() || null
  const greeting = firstName ? `Welcome back, ${firstName}` : 'Welcome back'

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
            Dashboard
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-300">
            Here&apos;s what&apos;s happening with your tube bending projects today.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              asChild
              className="h-9 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600"
            >
              <Link href="/configure">
                Start a new quote
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-9 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/user/orders">View orders</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="-mt-8">
          <PendingOrderClaimer />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total projects"
            value={Number(stats?.total_projects ?? 0)}
            icon="folder"
            accent="violet"
          />
          <StatCard
            label="Total orders"
            value={Number(stats?.total_orders ?? 0)}
            icon="shoppingBag"
            accent="blue"
            delay={0.05}
          />
          <StatCard
            label="Total spent"
            value={Number(stats?.total_spent ?? 0)}
            prefix="$"
            decimals={2}
            icon="dollar"
            accent="emerald"
            delay={0.1}
          />
          <StatCard
            label="In production"
            value={Number(stats?.orders_in_production ?? 0)}
            icon="hammer"
            accent="cyan"
            hint="Active manufacturing"
            delay={0.15}
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <SectionHeader
              eyebrow="Workspace"
              title="Recent projects"
              action={
                <Link
                  href="/user/projects"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all →
                </Link>
              }
            />
            <div className="mt-4">
              <RecentProjects projects={projects} />
            </div>
          </section>

          <section>
            <SectionHeader eyebrow="Updates" title="Recent activity" />
            <div className="mt-4">
              <ActivityFeed activity={activity} />
            </div>
          </section>
        </div>

        <section className="mt-12">
          <SectionHeader eyebrow="Get going" title="Quick actions" />
          <div className="mt-4">
            <QuickActions />
          </div>
        </section>
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-2">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
