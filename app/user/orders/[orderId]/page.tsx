import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileText,
  Hammer,
  MapPin,
  Package,
  Truck,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { UserNav } from '@/app/user/components/UserNav'
import type { Enums, Tables } from '@/lib/types/supabase'
import { carrierTrackingUrl, normalizeCarrierLabel } from '@/lib/utils/tracking'

import { CancelOrderButton } from './CancelOrderButton'
import { PayDraftDialog } from './PayDraftDialog'

type EmbeddedAddress = Tables<'addresses'>
type EmbeddedPaymentMethod = Tables<'payment_methods'>

export const dynamic = 'force-dynamic'

const STATUS_FLOW: Enums<'order_status'>[] = [
  'pending',
  'confirmed',
  'processing',
  'in_production',
  'quality_check',
  'ready_to_ship',
  'shipped',
  'delivered',
]

const STATUS_META: Record<
  Enums<'order_status'>,
  { label: string; icon: typeof CheckCircle2; description: string }
> = {
  pending: { label: 'Pending', icon: Package, description: 'Order received' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, description: 'Payment processed' },
  processing: { label: 'Processing', icon: Hammer, description: 'Materials allocated' },
  in_production: { label: 'In production', icon: Hammer, description: 'Bending operations' },
  quality_check: { label: 'Quality check', icon: CheckCircle2, description: 'Inspection in progress' },
  ready_to_ship: { label: 'Ready to ship', icon: Package, description: 'Awaiting carrier pickup' },
  shipped: { label: 'Shipped', icon: Truck, description: 'On its way' },
  delivered: { label: 'Delivered', icon: CheckCircle2, description: 'Arrived' },
  cancelled: { label: 'Cancelled', icon: Package, description: 'Order cancelled' },
  refunded: { label: 'Refunded', icon: CreditCard, description: 'Refund issued' },
}

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { orderId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, orderRes] = await Promise.all([
    supabase.from('profiles').select('first_name,last_name,email').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select(
        'id, order_number, status, action, subtotal, tax, shipping, total, currency, carrier, tracking_number, estimated_delivery, actual_delivery, notes, submitted_at, created_at, updated_at, order_items(*), order_files(*), shipping_address:addresses!orders_shipping_address_id_fkey(*), billing_address:addresses!orders_billing_address_id_fkey(*), payment_method:payment_methods!orders_payment_method_id_fkey(*)',
      )
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const profile = profileRes.data
  const order = orderRes.data
  if (!order) notFound()

  const items = order.order_items ?? []
  const files = order.order_files ?? []
  const shippingAddress = order.shipping_address as EmbeddedAddress | null
  const billingAddress = order.billing_address as EmbeddedAddress | null
  const paymentMethod = order.payment_method as EmbeddedPaymentMethod | null
  const isDraft = order.action === 'save'
  const currentStatusIndex = STATUS_FLOW.indexOf(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'
  const trackingUrl = carrierTrackingUrl(order.carrier, order.tracking_number)
  const carrierLabel = normalizeCarrierLabel(order.carrier)
  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  return (
    <div className="min-h-screen bg-white">
      <UserNav
        firstName={profile?.first_name ?? null}
        lastName={profile?.last_name ?? null}
        email={profile?.email ?? user.email ?? ''}
      />

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/user/orders"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Orders
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="font-mono text-sm font-medium text-neutral-900">
            {order.order_number}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {isDraft ? 'Draft order' : 'Order'}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              {order.order_number}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {isDraft
                ? 'This is a saved draft. Submit it to start production.'
                : `Submitted ${format(new Date(order.submitted_at ?? order.created_at), 'MMM d, yyyy')}`}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-3xl font-semibold tracking-tight text-neutral-900">
              ${Number(order.total).toFixed(2)}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-400">
              {order.currency}
            </div>
          </div>
        </div>

        {/* Pay-now panel for draft orders */}
        {isDraft && (
          <section className="mt-8 rounded-xl border border-neutral-900 bg-neutral-50 p-5 sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Ready to submit
                </div>
                <h2 className="mt-1 text-base font-semibold text-neutral-900">
                  Complete payment to start production
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  This is a saved draft. Pay now to lock in pricing and queue your order.
                </p>
              </div>
              <PayDraftDialog
                orderId={order.id}
                orderNumber={order.order_number}
                total={Number(order.total)}
                currency={order.currency}
                itemSummary={
                  items.length > 0
                    ? `${items.reduce((sum, i) => sum + i.quantity, 0)} part${
                        items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? '' : 's'
                      } · ${items[0].material_name}${
                        items.length > 1 ? ` + ${items.length - 1} more` : ''
                      }`
                    : 'Draft order'
                }
              />
            </div>
          </section>
        )}

        {/* Status timeline */}
        {!isDraft && !isCancelled && (
          <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Production
            </div>
            <h2 className="mt-1 text-base font-semibold text-neutral-900">Order timeline</h2>

            <ol className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {STATUS_FLOW.map((status, idx) => {
                const meta = STATUS_META[status]
                const Icon = meta.icon
                const reached = idx <= currentStatusIndex
                const current = idx === currentStatusIndex
                return (
                  <li key={status} className="flex flex-col items-start gap-1.5">
                    <div className="flex w-full items-center gap-1.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
                          reached
                            ? current
                              ? 'bg-neutral-900 text-white ring-4 ring-neutral-200'
                              : 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 text-neutral-400'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {idx < STATUS_FLOW.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 rounded ${
                            idx < currentStatusIndex ? 'bg-neutral-900' : 'bg-neutral-200'
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <div className={`text-xs font-medium ${reached ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-neutral-400">{meta.description}</div>
                    </div>
                  </li>
                )
              })}
            </ol>

            {order.tracking_number && (
              <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm">
                <span className="text-neutral-500">
                  {carrierLabel ? `${carrierLabel} tracking:` : 'Tracking:'}
                </span>
                {trackingUrl ? (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
                  >
                    {order.tracking_number}
                    <Truck className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="font-mono font-medium text-neutral-900">{order.tracking_number}</span>
                )}
              </div>
            )}
          </section>
        )}

        {isCancelled && (
          <section className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="font-medium text-red-900">
              This order is {STATUS_META[order.status].label.toLowerCase()}.
            </div>
            <div className="mt-1 text-sm text-red-700">{STATUS_META[order.status].description}</div>
          </section>
        )}

        {/* Line items */}
        <section className="mt-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Items
          </div>
          <h2 className="mt-1 text-base font-semibold text-neutral-900">Line items</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-2.5 font-medium">Part</th>
                  <th className="px-4 py-2.5 font-medium">Material</th>
                  <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                  <th className="px-4 py-2.5 font-medium text-right">Unit</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate font-medium text-neutral-900" title={item.file_name}>
                          {item.file_name}
                        </span>
                      </div>
                      {item.length_inches && (
                        <div className="mt-0.5 text-[11px] text-neutral-500">
                          {Number(item.length_inches).toFixed(2)}″ ·{' '}
                          {item.bends ?? 0} bend{item.bends === 1 ? '' : 's'} ·{' '}
                          {item.cuts ?? 0} cut{item.cuts === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-neutral-900">{item.material_name}</div>
                      <div className="text-[11px] text-neutral-500">{item.gauge}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">
                      ${Number(item.price_per_part).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                      ${Number(item.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-neutral-500">
                    Subtotal
                  </td>
                  <td className="px-4 py-2 text-right text-neutral-900">
                    ${Number(order.subtotal).toFixed(2)}
                  </td>
                </tr>
                {Number(order.tax) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-neutral-500">
                      Tax
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-900">
                      ${Number(order.tax).toFixed(2)}
                    </td>
                  </tr>
                )}
                {Number(order.shipping) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-neutral-500">
                      Shipping
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-900">
                      ${Number(order.shipping).toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-neutral-200">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-base font-semibold text-neutral-900">
                    ${Number(order.total).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Addresses + payment */}
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <DetailCard
            title="Shipping"
            icon={<MapPin className="h-4 w-4" />}
            empty="No shipping address yet"
          >
            {shippingAddress && <AddressBlock address={shippingAddress} />}
          </DetailCard>

          <DetailCard
            title="Billing"
            icon={<MapPin className="h-4 w-4" />}
            empty="No billing address yet"
          >
            {billingAddress && <AddressBlock address={billingAddress} />}
          </DetailCard>

          <DetailCard
            title="Payment"
            icon={<CreditCard className="h-4 w-4" />}
            empty="No payment method yet"
          >
            {paymentMethod && (
              <div className="text-sm text-neutral-700">
                <div className="font-medium text-neutral-900">
                  {paymentMethod.type === 'card'
                    ? `${capitalize(paymentMethod.brand ?? 'Card')} •••• ${paymentMethod.last4}`
                    : capitalize(paymentMethod.type)}
                </div>
                {paymentMethod.expiry_month && paymentMethod.expiry_year && (
                  <div className="mt-0.5 text-xs text-neutral-500">
                    Expires{' '}
                    {String(paymentMethod.expiry_month).padStart(2, '0')}/
                    {String(paymentMethod.expiry_year).slice(-2)}
                  </div>
                )}
              </div>
            )}
          </DetailCard>
        </section>

        {/* Files */}
        {files.length > 0 && (
          <section className="mt-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Documents
            </div>
            <h2 className="mt-1 text-base font-semibold text-neutral-900">Attached files</h2>
            <ul className="mt-4 space-y-2">
              {files.map(file => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-neutral-900">{file.file_name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                      {file.doc_type.replace('_', ' ')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.notes && (
          <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Notes
            </div>
            <p className="mt-2 text-sm text-neutral-700">{order.notes}</p>
          </section>
        )}

        {canCancel && (
          <section className="mt-8">
            <CancelOrderButton orderId={order.id} />
          </section>
        )}

        <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 text-center">
          <p className="text-sm text-neutral-600">
            Need help with this order?{' '}
            <Link href="/contact" className="font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600">
              Contact support →
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}

function DetailCard({
  title,
  icon,
  empty,
  children,
}: {
  title: string
  icon: React.ReactNode
  empty: string
  children?: React.ReactNode
}) {
  const hasContent = !!children
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      </div>
      <div className="mt-3 text-sm">
        {hasContent ? children : <span className="text-neutral-400">{empty}</span>}
      </div>
    </div>
  )
}

function AddressBlock({
  address,
}: {
  address: {
    name: string
    company: string | null
    street1: string
    street2: string | null
    city: string
    state: string
    zip_code: string
    country: string
  }
}) {
  return (
    <div className="space-y-0.5 text-neutral-700">
      <div className="font-medium text-neutral-900">{address.name}</div>
      {address.company && <div>{address.company}</div>}
      <div>{address.street1}</div>
      {address.street2 && <div>{address.street2}</div>}
      <div>
        {address.city}, {address.state} {address.zip_code}
      </div>
      <div className="text-neutral-500">{address.country}</div>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
