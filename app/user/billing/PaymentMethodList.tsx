'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, CreditCard, MoreVertical, Star, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { deletePaymentMethodAction, setDefaultPaymentMethodAction } from './actions'
import { easeOut } from '@/app/configure/components/motion'
import type { Tables } from '@/lib/types/supabase'

type PaymentMethod = Tables<'payment_methods'>

export function PaymentMethodList({ paymentMethods }: { paymentMethods: PaymentMethod[] }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {paymentMethods.map(pm => (
        <PaymentMethodCard key={pm.id} pm={pm} />
      ))}
    </motion.div>
  )
}

function PaymentMethodCard({ pm }: { pm: PaymentMethod }) {
  const [busy, setBusy] = useState(false)

  const brand = pm.brand?.toLowerCase() ?? 'card'
  const label = pm.type === 'card' ? `${capitalize(brand)} •••• ${pm.last4 ?? '----'}` : capitalize(pm.type)
  const expiry =
    pm.expiry_month && pm.expiry_year
      ? `${String(pm.expiry_month).padStart(2, '0')} / ${String(pm.expiry_year).slice(-2)}`
      : null

  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
      }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 text-white">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-900">{label}</span>
              {pm.is_default && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                  <Check className="h-2.5 w-2.5" />
                  Default
                </span>
              )}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              {expiry ? `Expires ${expiry}` : pm.type}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Menu">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!pm.is_default && (
              <DropdownMenuItem
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await setDefaultPaymentMethodAction(pm.id)
                  setBusy(false)
                }}
              >
                <Star className="mr-2 h-3.5 w-3.5" />
                Set as default
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={busy}
              onClick={async () => {
                if (!confirm('Remove this payment method?')) return
                setBusy(true)
                await deletePaymentMethodAction(pm.id)
                setBusy(false)
              }}
              className="text-rose-600"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!pm.is_valid && (
        <div className="mt-3 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
          This card needs to be updated.
        </div>
      )}
    </motion.div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
