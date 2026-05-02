import type { Database } from '@/lib/types/supabase'

export type OrderStatus = Database['public']['Enums']['order_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']

export function formatUSD(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatRelative(input: string | null | undefined): string {
  if (!input) return '—'
  const date = new Date(input)
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(input: string | null | undefined): string {
  if (!input) return '—'
  return new Date(input).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'in_production',
  'quality_check',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  in_production: 'In production',
  quality_check: 'Quality check',
  ready_to_ship: 'Ready to ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  requires_payment_method: 'Needs method',
  requires_confirmation: 'Awaiting confirm',
  requires_action: 'Needs action',
  processing: 'Processing',
  requires_capture: 'Awaiting capture',
  succeeded: 'Succeeded',
  canceled: 'Canceled',
  refunded: 'Refunded',
  failed: 'Failed',
}
