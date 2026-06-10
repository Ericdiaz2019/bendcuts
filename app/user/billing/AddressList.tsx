'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Check, MapPin, MoreVertical, Star, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { AddressDialog } from './AddressDialog'
import { deleteAddressAction, setDefaultAddressAction } from './actions'
import { easeOut } from '@/app/configure/components/motion'
import type { Tables } from '@/lib/types/supabase'

type Address = Tables<'addresses'>

export function AddressList({ addresses }: { addresses: Address[] }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {addresses.map(address => (
        <AddressCard key={address.id} address={address} />
      ))}
    </motion.div>
  )
}

function AddressCard({ address }: { address: Address }) {
  const [busy, setBusy] = useState(false)

  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
      }}
      className="relative rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-400"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              address.type === 'billing'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {address.type === 'billing' ? <Building2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-neutral-900">{address.name}</span>
              {address.is_default && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                  <Check className="h-2.5 w-2.5" />
                  Default
                </span>
              )}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">
              {address.type}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" aria-label="Menu">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AddressDialog
              address={address}
              trigger={
                <DropdownMenuItem onSelect={e => e.preventDefault()}>
                  Edit
                </DropdownMenuItem>
              }
            />
            {!address.is_default && (
              <DropdownMenuItem
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await setDefaultAddressAction(address.id)
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
                if (!confirm('Delete this address?')) return
                setBusy(true)
                await deleteAddressAction(address.id)
                setBusy(false)
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 space-y-0.5 text-sm text-neutral-600">
        {address.company && <div>{address.company}</div>}
        <div>{address.street1}</div>
        {address.street2 && <div>{address.street2}</div>}
        <div>
          {address.city}, {address.state} {address.zip_code}
        </div>
        <div className="text-neutral-500">{address.country}</div>
        {address.phone && <div className="text-neutral-500">{address.phone}</div>}
      </div>
    </motion.div>
  )
}
