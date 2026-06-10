import { Building2, CreditCard, MapPin, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'
import { PageHeader } from '@/app/user/components/PageHeader'

import { AddressDialog } from './AddressDialog'
import { AddressList } from './AddressList'
import { PaymentMethodList } from './PaymentMethodList'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, addressesRes, paymentMethodsRes] = await Promise.all([
    supabase.from('profiles').select('first_name,last_name,email').eq('id', user.id).single(),
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

  const profile = profileRes.data
  const addresses = addressesRes.data ?? []
  const paymentMethods = paymentMethodsRes.data ?? []

  const shippingAddresses = addresses.filter(a => a.type === 'shipping')
  const billingAddresses = addresses.filter(a => a.type === 'billing')

  return (
    <div className="min-h-screen bg-white">
      <UserNav
        firstName={profile?.first_name ?? null}
        lastName={profile?.last_name ?? null}
        email={profile?.email ?? user.email ?? ''}
      />

      <PageHeader
        title="Billing"
        description="Shipping and billing addresses, plus payment methods used on your orders."
        widthClassName="max-w-5xl"
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Shipping addresses */}
        <Section
          icon={<MapPin className="h-4 w-4" />}
          title="Shipping addresses"
          description="Where we send your finished parts."
          action={
            <AddressDialog
              defaultType="shipping"
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add shipping address
                </Button>
              }
            />
          }
        >
          {shippingAddresses.length > 0 ? (
            <AddressList addresses={shippingAddresses} />
          ) : (
            <EmptyState
              icon={<MapPin className="h-5 w-5" />}
              title="No shipping address yet"
              description="Add one to speed up checkout."
              action={
                <AddressDialog
                  defaultType="shipping"
                  trigger={
                    <Button className="bg-neutral-900 text-white hover:bg-neutral-700">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add shipping address
                    </Button>
                  }
                />
              }
            />
          )}
        </Section>

        {/* Billing addresses */}
        <Section
          icon={<Building2 className="h-4 w-4" />}
          title="Billing addresses"
          description="The address on your invoices and receipts."
          action={
            <AddressDialog
              defaultType="billing"
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add billing address
                </Button>
              }
            />
          }
        >
          {billingAddresses.length > 0 ? (
            <AddressList addresses={billingAddresses} />
          ) : (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title="No billing address yet"
              description="Add one so invoices come out right."
              action={
                <AddressDialog
                  defaultType="billing"
                  trigger={
                    <Button className="bg-neutral-900 text-white hover:bg-neutral-700">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add billing address
                    </Button>
                  }
                />
              }
            />
          )}
        </Section>

        {/* Payment methods */}
        <Section
          icon={<CreditCard className="h-4 w-4" />}
          title="Payment methods"
          description="Cards saved securely via Stripe at checkout."
          action={
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
          }
        >
          {paymentMethods.length > 0 ? (
            <PaymentMethodList paymentMethods={paymentMethods} />
          ) : (
            <EmptyState
              icon={<CreditCard className="h-5 w-5" />}
              title="No payment methods"
              description="We'll save your card securely via Stripe at first checkout. Direct payment-method management is coming soon."
            />
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-neutral-200 py-8 first:pt-0 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-900">{title}</h2>
            <p className="text-xs text-neutral-500">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
