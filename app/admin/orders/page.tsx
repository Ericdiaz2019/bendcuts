import Link from 'next/link'
import { ChevronRight, Filter, Search } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { OrderStatusBadge } from '../components/OrderStatusBadge'
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  formatDateTime,
  formatRelative,
  formatUSD,
  type OrderStatus,
} from '../lib/format'

export const dynamic = 'force-dynamic'

type SearchParams = {
  status?: string
  q?: string
  range?: string
}

const RANGE_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: 'all', label: 'All time', days: null },
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
]

function rangeToISO(value: string | undefined): string | null {
  const opt = RANGE_OPTIONS.find(o => o.value === value)
  if (!opt || opt.days === null) return null
  return new Date(Date.now() - opt.days * 24 * 60 * 60 * 1000).toISOString()
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const statusFilter = (ORDER_STATUSES as string[]).includes(params.status ?? '')
    ? (params.status as OrderStatus)
    : null
  const q = (params.q ?? '').trim()
  const rangeIso = rangeToISO(params.range)

  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, status, total, currency, submitted_at, created_at, user_id, profiles:user_id(first_name, last_name, email, company)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (rangeIso) query = query.gte('created_at', rangeIso)
  if (q) {
    // Match on order_number first; customer search is best-effort.
    query = query.ilike('order_number', `%${q}%`)
  }

  const { data: orders, count } = await query

  type OrderRow = NonNullable<typeof orders>[number]

  // Status counts (small, run in parallel)
  const counts = await Promise.all(
    ORDER_STATUSES.map(s =>
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', s),
    ),
  )
  const statusCounts: Record<OrderStatus, number> = ORDER_STATUSES.reduce(
    (acc, s, i) => ({ ...acc, [s]: counts[i].count ?? 0 }),
    {} as Record<OrderStatus, number>,
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Operations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-600">
          {count ?? 0} {count === 1 ? 'order' : 'orders'} match the current filters.
        </p>
      </div>

      <form
        action="/admin/orders"
        method="GET"
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by order number…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            name="status"
            defaultValue={statusFilter ?? ''}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map(s => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]} ({statusCounts[s]})
              </option>
            ))}
          </select>

          <select
            name="range"
            defaultValue={params.range ?? 'all'}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {RANGE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-cyan-600"
          >
            <Filter className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No orders match these filters.
                </td>
              </tr>
            )}
            {(orders ?? []).map((o: OrderRow) => {
              const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles
              const customerName =
                [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—'
              return (
                <tr key={o.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {profile?.company || customerName}
                    </div>
                    <div className="text-xs text-slate-500">{profile?.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{formatRelative(o.submitted_at ?? o.created_at)}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(o.submitted_at ?? o.created_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatUSD(Number(o.total), o.currency || 'USD')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Open <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {q && (
        <p className="mt-3 text-xs text-slate-500">
          Tip: customer-name search isn&apos;t indexed yet — try the{' '}
          <Link href="/admin/customers" className="text-blue-600 hover:underline">
            customers
          </Link>{' '}
          page to find a buyer first.
        </p>
      )}
    </main>
  )
}
