import Link from 'next/link'
import { ArrowRight, ChevronRight, Clock, Package, ShoppingBag, TrendingUp } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/app/user/dashboard/StatCard'

import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { formatRelative, formatUSD } from '../lib/format'

export const dynamic = 'force-dynamic'

const PIPELINE_STATUSES = ['confirmed', 'processing', 'in_production', 'quality_check', 'ready_to_ship'] as const

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [todayOrdersRes, todayRevRes, pipelineRes, pendingRevRes, recentOrdersRes, activityRes, monthRevRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('submitted_at', todayISO)
      .neq('status', 'cancelled'),
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', todayISO),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', [...PIPELINE_STATUSES]),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id, order_number, status, total, currency, submitted_at, created_at, user_id, profiles:user_id(first_name, last_name, email, company)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('activity_log')
      .select('id, type, title, description, created_at, related_order_id, user_id, profiles:user_id(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', last30),
  ])

  const todayOrdersCount = todayOrdersRes.count ?? 0
  const todayRevenue = (todayRevRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const pipelineCount = pipelineRes.count ?? 0
  const pendingReviewCount = pendingRevRes.count ?? 0
  const monthRevenue = (monthRevRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  const recentOrders = recentOrdersRes.data ?? []
  const activity = activityRes.data ?? []

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Admin overview</h1>
          <p className="mt-1 text-sm text-slate-600">Today&apos;s activity and the order pipeline at a glance.</p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          All orders <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders today"
          value={todayOrdersCount}
          icon="shoppingBag"
          accent="blue"
          hint={`${pendingReviewCount} pending review`}
          delay={0}
        />
        <StatCard
          label="Revenue today"
          value={todayRevenue}
          prefix="$"
          decimals={2}
          icon="dollar"
          accent="emerald"
          hint={`${formatUSD(monthRevenue)} last 30 days`}
          delay={0.05}
        />
        <StatCard
          label="In pipeline"
          value={pipelineCount}
          icon="hammer"
          accent="cyan"
          hint="Confirmed → ready to ship"
          delay={0.1}
        />
        <StatCard
          label="Pending review"
          value={pendingReviewCount}
          icon="folder"
          accent="violet"
          hint="Need confirmation"
          delay={0.15}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Recent orders</h2>
              </div>
              <Link href="/admin/orders" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentOrders.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-slate-500">No orders yet.</li>
              )}
              {recentOrders.map(o => {
                const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles
                const customer =
                  profile?.company ||
                  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
                  profile?.email ||
                  '—'
                return (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-slate-900">{o.order_number}</span>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {customer} · {formatRelative(o.submitted_at ?? o.created_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">{formatUSD(Number(o.total))}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Clock className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {activity.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-slate-500">No activity yet.</li>
              )}
              {activity.map(a => {
                const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
                const who =
                  [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.email || 'Unknown user'
                return (
                  <li key={a.id} className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-slate-900">{a.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {who} · {formatRelative(a.created_at)}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-cyan-50 to-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Last 30 days</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{formatUSD(monthRevenue)}</p>
                <p className="mt-1 text-xs text-slate-600">Captured revenue across all customers.</p>
              </div>
            </div>
          </div>

          <Link
            href="/admin/orders?status=pending"
            className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm shadow-sm transition hover:bg-amber-100"
          >
            <span className="inline-flex items-center gap-2 font-medium text-amber-900">
              <Package className="h-4 w-4" />
              {pendingReviewCount} {pendingReviewCount === 1 ? 'order needs' : 'orders need'} review
            </span>
            <ArrowRight className="h-4 w-4 text-amber-700" />
          </Link>
        </div>
      </div>
    </main>
  )
}
