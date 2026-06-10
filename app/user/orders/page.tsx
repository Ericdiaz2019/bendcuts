import Link from 'next/link'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'
import { PageHeader } from '@/app/user/components/PageHeader'

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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const orders = ordersRes.data ?? []

  return (
    <div className="min-h-screen bg-white">
      <UserNav
        firstName={profile?.first_name ?? null}
        lastName={profile?.last_name ?? null}
        email={profile?.email ?? user.email ?? ''}
      />

      <PageHeader
        title="Orders"
        description="Track production status and revisit drafts."
        actions={
          <Button asChild className="h-9 bg-neutral-900 text-white hover:bg-neutral-700">
            <Link href="/configure">
              <Upload className="mr-1.5 h-4 w-4" />
              Start a new quote
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        <OrdersList orders={orders} />
      </div>
    </div>
  )
}
