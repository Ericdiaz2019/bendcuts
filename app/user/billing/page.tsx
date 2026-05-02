import Link from 'next/link'
import { ArrowLeft, CreditCard, MapPin, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { createClient } from '@/lib/supabase/server'
import { AddressDialog } from './AddressDialog'
import { AddressList } from './AddressList'
import { PaymentMethodList } from './PaymentMethodList'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()

  const [addressesRes, paymentMethodsRes] = await Promise.all([
    supabase
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('payment_methods')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const addresses = addressesRes.data ?? []
  const paymentMethods = paymentMethodsRes.data ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/user/dashboard"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-900">Billing</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            Account
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Billing &amp; addresses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage shipping, billing, and payment methods used on your orders.
          </p>
        </div>

        {/* Addresses */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <MapPin className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Addresses
              </h2>
            </div>
            <AddressDialog />
          </div>

          <div className="mt-4">
            {addresses.length > 0 ? (
              <AddressList addresses={addresses} />
            ) : (
              <EmptyState
                icon={<MapPin className="h-5 w-5" />}
                title="No addresses yet"
                description="Add a shipping or billing address to speed up checkout."
                action={
                  <AddressDialog
                    trigger={
                      <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add address
                      </Button>
                    }
                  />
                }
              />
            )}
          </div>
        </section>

        {/* Payment methods */}
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <CreditCard className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Payment methods
              </h2>
            </div>
            <Button
              type="button"
              disabled
              variant="outline"
              size="sm"
              className="h-9"
              title="Stripe payment setup coming soon"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add payment method
            </Button>
          </div>

          <div className="mt-4">
            {paymentMethods.length > 0 ? (
              <PaymentMethodList paymentMethods={paymentMethods} />
            ) : (
              <EmptyState
                icon={<CreditCard className="h-5 w-5" />}
                title="No payment methods"
                description="We'll save your card securely via Stripe at first checkout. Direct payment-method management is coming soon."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
