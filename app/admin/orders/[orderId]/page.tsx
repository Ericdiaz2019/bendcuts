import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText, MapPin, Package } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { StatusChanger } from './StatusChanger'
import { ShipForm } from './ShipForm'
import { NotesPanel } from './NotesPanel'
import { RefundButton } from './RefundButton'
import { formatDateTime, formatRelative, formatUSD } from '../../lib/format'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { orderId } = await params
  const supabase = await createClient()

  const [orderRes, notesRes, paymentsRes, activityRes] = await Promise.all([
    supabase
      .from('orders')
      .select(
        `id, order_number, status, action, subtotal, tax, shipping, total, currency,
         tracking_number, carrier, estimated_delivery, actual_delivery, notes,
         submitted_at, created_at, updated_at, user_id,
         order_items(*),
         order_files(*),
         shipping_address:addresses!orders_shipping_address_id_fkey(*),
         billing_address:addresses!orders_billing_address_id_fkey(*),
         payment_method:payment_methods!orders_payment_method_id_fkey(*),
         profiles:user_id(id, first_name, last_name, email, company, phone)`,
      )
      .eq('id', orderId)
      .maybeSingle(),
    supabase
      .from('admin_notes')
      .select('id, body, created_at, author_id, profiles:author_id(first_name, last_name, email)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }),
    supabase
      .from('activity_log')
      .select('id, type, title, description, created_at, metadata')
      .eq('related_order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const order = orderRes.data
  if (!order) notFound()

  const items = order.order_items ?? []
  const files = order.order_files ?? []
  const customer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
  const ship = order.shipping_address
  const bill = order.billing_address
  const pm = order.payment_method
  const notes = notesRes.data ?? []
  const payments = paymentsRes.data ?? []
  const primaryPayment = payments[0] ?? null
  const activity = activityRes.data ?? []

  const customerName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
    customer?.email ||
    'Unknown customer'

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Order</p>
          <h1 className="mt-1 font-mono text-3xl font-semibold tracking-tight text-slate-900">
            {order.order_number}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <OrderStatusBadge status={order.status} size="md" />
            <span className="text-xs text-slate-500">
              Submitted {formatRelative(order.submitted_at ?? order.created_at)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">
            {formatUSD(Number(order.total), order.currency || 'USD')}
          </div>
          <div className="text-xs text-slate-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Status</h2>
            <p className="mt-1 text-xs text-slate-500">Move the order through the production pipeline.</p>
            <div className="mt-4">
              <StatusChanger orderId={order.id} current={order.status} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Ship</h2>
            <p className="mt-1 text-xs text-slate-500">
              Recording carrier + tracking moves the order to <em>shipped</em> automatically.
            </p>
            <div className="mt-4">
              <ShipForm
                orderId={order.id}
                carrier={order.carrier ?? ''}
                trackingNumber={order.tracking_number ?? ''}
                estimatedDelivery={order.estimated_delivery ?? ''}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Internal notes</h2>
            <p className="mt-1 text-xs text-slate-500">Visible only to admins. Not shared with the customer.</p>
            <div className="mt-4">
              <NotesPanel orderId={order.id} notes={notes} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
            </div>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 text-left">Part</th>
                  <th className="px-5 py-2.5 text-left">Material</th>
                  <th className="px-5 py-2.5 text-right">Qty</th>
                  <th className="px-5 py-2.5 text-right">Unit</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{item.file_name}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.material_name} · {item.gauge}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatUSD(Number(item.price_per_part), order.currency || 'USD')}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatUSD(Number(item.line_total), order.currency || 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr>
                  <td colSpan={4} className="px-5 py-2 text-right text-slate-500">Subtotal</td>
                  <td className="px-5 py-2 text-right tabular-nums text-slate-900">{formatUSD(Number(order.subtotal), order.currency || 'USD')}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-5 py-2 text-right text-slate-500">Tax</td>
                  <td className="px-5 py-2 text-right tabular-nums text-slate-900">{formatUSD(Number(order.tax), order.currency || 'USD')}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-5 py-2 text-right text-slate-500">Shipping</td>
                  <td className="px-5 py-2 text-right tabular-nums text-slate-900">{formatUSD(Number(order.shipping), order.currency || 'USD')}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-right font-semibold text-slate-900">Total</td>
                  <td className="px-5 py-3 text-right text-lg font-semibold tabular-nums text-slate-900">
                    {formatUSD(Number(order.total), order.currency || 'USD')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          {files.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Files</h2>
              <ul className="mt-3 space-y-2">
                {files.map(f => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-800">{f.file_name}</span>
                    <span className="ml-auto text-xs uppercase tracking-wider text-slate-500">{f.doc_type}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
            <ul className="mt-3 space-y-2.5">
              {activity.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
              {activity.map(a => (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-900">{a.title}</div>
                    {a.description && <div className="text-xs text-slate-500">{a.description}</div>}
                    <div className="text-[11px] text-slate-400">{formatDateTime(a.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Customer</h2>
            <div className="mt-3 space-y-1 text-sm">
              <div className="font-medium text-slate-900">{customerName}</div>
              {customer?.company && <div className="text-slate-600">{customer.company}</div>}
              <div className="text-slate-500">{customer?.email}</div>
              {customer?.phone && <div className="text-slate-500">{customer.phone}</div>}
            </div>
            {customer?.id && (
              <Link
                href={`/admin/customers/${customer.id}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                View customer profile →
              </Link>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Shipping</h2>
            </div>
            <div className="mt-3 text-sm text-slate-700">
              {ship ? (
                <>
                  <div className="font-medium text-slate-900">{ship.name}</div>
                  {ship.company && <div>{ship.company}</div>}
                  <div>{ship.street1}</div>
                  {ship.street2 && <div>{ship.street2}</div>}
                  <div>
                    {ship.city}, {ship.state} {ship.zip_code}
                  </div>
                  <div>{ship.country}</div>
                </>
              ) : (
                <span className="text-slate-500">No shipping address.</span>
              )}
            </div>
            {(order.tracking_number || order.carrier) && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
                <div className="font-semibold text-slate-700">{order.carrier || 'Carrier'}</div>
                <div className="font-mono text-slate-900">{order.tracking_number}</div>
                {order.estimated_delivery && <div className="mt-1 text-slate-500">ETA {order.estimated_delivery}</div>}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Billing</h2>
            </div>
            <div className="mt-3 text-sm text-slate-700">
              {bill ? (
                <>
                  <div className="font-medium text-slate-900">{bill.name}</div>
                  {bill.company && <div>{bill.company}</div>}
                  <div>{bill.street1}</div>
                  {bill.street2 && <div>{bill.street2}</div>}
                  <div>
                    {bill.city}, {bill.state} {bill.zip_code}
                  </div>
                </>
              ) : (
                <span className="text-slate-500">Same as shipping.</span>
              )}
            </div>
            {pm && (
              <div className="mt-4 text-xs text-slate-500">
                Charged to <span className="font-mono uppercase">{pm.brand}</span> ending {pm.last4}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Payment</h2>
            {primaryPayment ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium text-slate-900">{primaryPayment.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {formatUSD(Number(primaryPayment.amount), primaryPayment.currency || 'USD')}
                  </span>
                </div>
                {Number(primaryPayment.refunded_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Refunded</span>
                    <span className="font-medium text-rose-600 tabular-nums">
                      −{formatUSD(Number(primaryPayment.refunded_amount), primaryPayment.currency || 'USD')}
                    </span>
                  </div>
                )}
                <div className="break-all font-mono text-[11px] text-slate-400">
                  {primaryPayment.stripe_payment_intent_id}
                </div>
                <div className="pt-2">
                  <RefundButton
                    paymentId={primaryPayment.id}
                    orderId={order.id}
                    remaining={Number(primaryPayment.amount) - Number(primaryPayment.refunded_amount)}
                    currency={primaryPayment.currency || 'USD'}
                    canRefund={primaryPayment.status === 'succeeded' || primaryPayment.status === 'requires_capture'}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No payment recorded.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
