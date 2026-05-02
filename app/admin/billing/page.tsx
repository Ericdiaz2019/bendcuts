import Link from 'next/link'
import { ChevronRight, CreditCard, Filter, TrendingUp } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import {
  PAYMENT_STATUS_LABEL,
  formatDateTime,
  formatRelative,
  formatUSD,
  type PaymentStatus,
} from '../lib/format'

export const dynamic = 'force-dynamic'

const STATUS_OPTIONS: PaymentStatus[] = [
  'succeeded',
  'processing',
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'requires_capture',
  'failed',
  'canceled',
  'refunded',
]

const STATUS_TONE: Record<PaymentStatus, string> = {
  requires_payment_method: 'bg-amber-100 text-amber-800 ring-amber-200',
  requires_confirmation: 'bg-amber-100 text-amber-800 ring-amber-200',
  requires_action: 'bg-amber-100 text-amber-800 ring-amber-200',
  processing: 'bg-blue-100 text-blue-800 ring-blue-200',
  requires_capture: 'bg-blue-100 text-blue-800 ring-blue-200',
  succeeded: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  canceled: 'bg-slate-200 text-slate-700 ring-slate-300',
  refunded: 'bg-rose-100 text-rose-800 ring-rose-200',
  failed: 'bg-rose-100 text-rose-800 ring-rose-200',
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const statusFilter = (STATUS_OPTIONS as string[]).includes(params.status ?? '')
    ? (params.status as PaymentStatus)
    : null

  const supabase = await createClient()

  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const [paymentsRes, monthRevRes, todayRevRes, refundsRes] = await Promise.all([
    (() => {
      let q = supabase
        .from('payments')
        .select(
          'id, amount, refunded_amount, currency, status, stripe_payment_intent_id, created_at, order_id, user_id, orders:order_id(order_number), profiles:user_id(first_name, last_name, email, company)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .limit(100)
      if (statusFilter) q = q.eq('status', statusFilter)
      return q
    })(),
    supabase.from('payments').select('amount').eq('status', 'succeeded').gte('created_at', last30),
    supabase.from('payments').select('amount').eq('status', 'succeeded').gte('created_at', todayISO),
    supabase.from('payments').select('refunded_amount').gt('refunded_amount', 0).gte('created_at', last30),
  ])

  const payments = paymentsRes.data ?? []
  const monthRev = (monthRevRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const todayRev = (todayRevRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const refundsTotal = (refundsRes.data ?? []).reduce(
    (sum, p) => sum + Number(p.refunded_amount),
    0,
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Operations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">
          {paymentsRes.count ?? 0} {paymentsRes.count === 1 ? 'payment' : 'payments'} match the current filter.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Today</div>
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {formatUSD(todayRev)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Last 30 days</div>
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {formatUSD(monthRev)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Refunds (30d)</div>
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {formatUSD(refundsTotal)}
          </div>
        </div>
      </div>

      <form
        action="/admin/billing"
        method="GET"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            name="status"
            defaultValue={statusFilter ?? ''}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-cyan-600"
          >
            <Filter className="h-3.5 w-3.5" /> Apply
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Refunded</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  No payments match.
                </td>
              </tr>
            )}
            {payments.map(p => {
              const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
              const orderRef = Array.isArray(p.orders) ? p.orders[0] : p.orders
              const customerName =
                profile?.company ||
                [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
                profile?.email ||
                '—'
              return (
                <tr key={p.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${p.order_id}`}
                      className="font-mono text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      {orderRef?.order_number ?? p.order_id.slice(0, 8)}
                    </Link>
                    {p.stripe_payment_intent_id && (
                      <div className="font-mono text-[11px] text-slate-400">
                        {p.stripe_payment_intent_id.slice(0, 24)}…
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{customerName}</div>
                    <div className="text-xs text-slate-500">{profile?.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${STATUS_TONE[p.status]}`}
                    >
                      {PAYMENT_STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatUSD(Number(p.amount), p.currency || 'USD')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                    {Number(p.refunded_amount) > 0
                      ? `−${formatUSD(Number(p.refunded_amount), p.currency || 'USD')}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{formatRelative(p.created_at)}</div>
                    <div className="text-[11px] text-slate-500">{formatDateTime(p.created_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${p.order_id}`}
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
    </main>
  )
}
