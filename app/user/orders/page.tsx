import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'

import { OrdersList } from './OrdersList'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, ordersRes] = await Promise.all([
    supabase.from('profiles').select('first_name,last_name,email').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select(
        'id, order_number, status, action, total, currency, created_at, updated_at, order_items(id, material_name, gauge, file_name, quantity)',
      )
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const orders = ordersRes.data ?? []

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
            Orders
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Your orders
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-300">
            Track production status, download invoices, and revisit drafts.
          </p>
          <div className="mt-5">
            <Button
              asChild
              className="h-9 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600"
            >
              <Link href="/configure">
                Start a new quote
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        <OrdersList orders={orders} />
      </div>
    </div>
  )
}
