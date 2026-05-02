import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FolderKanban, ShoppingBag } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { RoleSelector } from './RoleSelector'
import { formatDateTime, formatRelative, formatUSD } from '../../lib/format'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ customerId: string }>
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { customerId } = await params
  const supabase = await createClient()

  const [profileRes, statsRes, ordersRes, projectsRes, addressesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', customerId).maybeSingle(),
    supabase.from('user_stats').select('*').eq('user_id', customerId).maybeSingle(),
    supabase
      .from('orders')
      .select('id, order_number, status, total, currency, submitted_at, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('projects')
      .select('id, name, status, updated_at')
      .eq('user_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase.from('addresses').select('*').eq('user_id', customerId),
  ])

  const profile = profileRes.data
  if (!profile) notFound()

  const stats = statsRes.data
  const orders = ordersRes.data ?? []
  const projects = projectsRes.data ?? []
  const addresses = addressesRes.data ?? []

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href="/admin/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Customer</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{fullName}</h1>
          {profile.company && <p className="text-sm text-slate-600">{profile.company}</p>}
          <p className="text-sm text-slate-500">{profile.email}</p>
          {profile.phone && <p className="text-sm text-slate-500">{profile.phone}</p>}
          <p className="mt-1 text-xs text-slate-400">
            Joined {formatDateTime(profile.created_at)}
          </p>
        </div>
        <div>
          <RoleSelector userId={profile.id} currentRole={profile.role} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Orders</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {stats?.total_orders ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">{stats?.orders_in_production ?? 0} in production</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Spent</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {formatUSD(Number(stats?.total_spent ?? 0))}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            avg {formatUSD(Number(stats?.average_order_value ?? 0))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {stats?.total_projects ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">{stats?.projects_in_progress ?? 0} active</div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <ShoppingBag className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Orders</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {orders.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-slate-500">No orders yet.</li>
            )}
            {orders.map(o => (
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
                    <div className="mt-0.5 text-xs text-slate-500">
                      {formatRelative(o.submitted_at ?? o.created_at)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatUSD(Number(o.total), o.currency || 'USD')}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <FolderKanban className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {projects.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-slate-500">No projects.</li>
              )}
              {projects.map(p => (
                <li key={p.id} className="px-5 py-3 text-sm">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.status} · {formatRelative(p.updated_at)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Addresses</h2>
            {addresses.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">None on file.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {addresses.map(a => (
                  <li key={a.id} className="rounded-lg bg-slate-50 p-3 text-slate-700">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {a.type}
                      {a.is_default && ' · default'}
                    </div>
                    <div className="mt-1 font-medium text-slate-900">{a.name}</div>
                    {a.company && <div>{a.company}</div>}
                    <div>{a.street1}</div>
                    {a.street2 && <div>{a.street2}</div>}
                    <div>
                      {a.city}, {a.state} {a.zip_code}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
