import Link from 'next/link'
import { ChevronRight, Search, ShieldCheck, User as UserIcon } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { formatRelative, formatUSD } from '../lib/format'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const supabase = await createClient()

  let profilesQuery = supabase
    .from('profiles')
    .select('id, first_name, last_name, email, company, role, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (q) {
    profilesQuery = profilesQuery.or(
      `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,company.ilike.%${q}%`,
    )
  }

  const { data: profiles } = await profilesQuery
  const ids = (profiles ?? []).map(p => p.id)

  const { data: stats } =
    ids.length > 0
      ? await supabase.from('user_stats').select('*').in('user_id', ids)
      : { data: [] as Array<{ user_id: string | null; total_orders: number | null; total_spent: number | null; last_order_at: string | null }> }

  const statsMap = new Map(
    (stats ?? []).map(s => [s.user_id ?? '', s] as const),
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-600">
            {(profiles ?? []).length} {(profiles ?? []).length === 1 ? 'profile' : 'profiles'} loaded.
          </p>
        </div>
      </div>

      <form
        action="/admin/customers"
        method="GET"
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, or company…"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Spent</th>
              <th className="px-4 py-3 text-left">Last order</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(profiles ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  No customers found.
                </td>
              </tr>
            )}
            {(profiles ?? []).map(p => {
              const s = statsMap.get(p.id)
              const name =
                [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—'
              return (
                <tr key={p.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${p.id}`}
                      className="font-medium text-slate-900 hover:text-blue-700"
                    >
                      {name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {p.company ? `${p.company} · ` : ''}
                      {p.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </span>
                    ) : p.role === 'business' ? (
                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-violet-800 ring-1 ring-inset ring-violet-200">
                        Business
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-700 ring-1 ring-inset ring-slate-200">
                        <UserIcon className="h-3 w-3" />
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s?.total_orders ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatUSD(Number(s?.total_spent ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatRelative(s?.last_order_at ?? null)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatRelative(p.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/customers/${p.id}`}
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
