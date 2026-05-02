import type { OrderStatus } from '../lib/format'
import { ORDER_STATUS_LABEL } from '../lib/format'

const TONE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 ring-blue-200',
  processing: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  in_production: 'bg-violet-100 text-violet-800 ring-violet-200',
  quality_check: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
  ready_to_ship: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  shipped: 'bg-teal-100 text-teal-800 ring-teal-200',
  delivered: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-slate-200 text-slate-700 ring-slate-300',
  refunded: 'bg-rose-100 text-rose-800 ring-rose-200',
}

export function OrderStatusBadge({ status, size = 'sm' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const tone = TONE[status]
  const sizing = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium uppercase tracking-wide ring-1 ring-inset ${tone} ${sizing}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
