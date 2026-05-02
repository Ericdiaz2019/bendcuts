'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, FileText, Package } from 'lucide-react'

import { easeOut } from '@/app/configure/components/motion'
import type { Tables, Enums } from '@/lib/types/supabase'

type Order = Pick<
  Tables<'orders'>,
  | 'id'
  | 'order_number'
  | 'status'
  | 'action'
  | 'total'
  | 'currency'
  | 'created_at'
  | 'updated_at'
> & {
  order_items: Pick<
    Tables<'order_items'>,
    'id' | 'material_name' | 'gauge' | 'file_name' | 'quantity'
  >[]
}

const STATUS_STYLES: Record<Enums<'order_status'>, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'In production', className: 'bg-violet-100 text-violet-700' },
  quality_check: { label: 'Quality check', className: 'bg-cyan-100 text-cyan-700' },
  ready_to_ship: { label: 'Ready to ship', className: 'bg-cyan-100 text-cyan-700' },
  shipped: { label: 'Shipped', className: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700' },
  refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-700' },
}

const FILTERS: { key: 'all' | 'submit' | 'save'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submit', label: 'Submitted' },
  { key: 'save', label: 'Drafts' },
]

export function OrdersList({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<'all' | 'submit' | 'save'>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter(o => o.action === filter)
  }, [filter, orders])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map(f => {
          const count =
            f.key === 'all' ? orders.length : orders.filter(o => o.action === f.key).length
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.ul
          initial="initial"
          animate="animate"
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-2.5"
        >
          <AnimatePresence initial={false}>
            {filtered.map(order => (
              <OrderRow key={order.id} order={order} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const status = STATUS_STYLES[order.status]
  const firstItem = order.order_items[0]
  const itemCount = order.order_items.length
  const isDraft = order.action === 'save'

  return (
    <motion.li
      layout
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
      }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}
    >
      <Link
        href={`/user/orders/${order.id}`}
        className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${
                isDraft
                  ? 'bg-gradient-to-br from-slate-700 to-slate-900'
                  : 'bg-gradient-to-br from-blue-600 to-cyan-500'
              }`}
            >
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {order.order_number}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    isDraft ? 'bg-slate-100 text-slate-700' : status.className
                  }`}
                >
                  {isDraft ? 'Draft' : status.label}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <FileText className="h-3 w-3" />
                <span className="truncate">
                  {firstItem?.file_name ?? '—'}
                  {itemCount > 1 ? ` · +${itemCount - 1} more` : ''}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {firstItem
                  ? `${firstItem.material_name} · ${firstItem.gauge} · ${firstItem.quantity} part${firstItem.quantity !== 1 ? 's' : ''}`
                  : '—'}{' '}
                · {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <div className="text-right">
              <div className="text-base font-semibold text-slate-900">
                ${Number(order.total).toFixed(2)}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                {order.currency}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
          </div>
        </div>
      </Link>
    </motion.li>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Package className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">No orders yet</h3>
      <p className="mt-1 text-sm text-slate-500">
        Upload a CAD file to generate your first quote.
      </p>
      <Link
        href="/configure"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Start a new quote
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
