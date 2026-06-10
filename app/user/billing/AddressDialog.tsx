'use client'

import { useState } from 'react'
import { Loader2, Plus, Pencil } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { upsertAddressAction } from './actions'
import type { Tables, Enums } from '@/lib/types/supabase'

type Address = Tables<'addresses'>

export function AddressDialog({
  address,
  defaultType = 'shipping',
  trigger,
}: {
  address?: Address
  defaultType?: Enums<'address_type'>
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    if (address) formData.set('id', address.id)
    const result = await upsertAddressAction(formData)
    setIsPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-9">
            {address ? <Pencil className="mr-1.5 h-3.5 w-3.5" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            {address ? 'Edit' : 'Add address'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? 'Edit address' : 'Add address'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={address?.type ?? defaultType}>
                <SelectTrigger id="type" className="mt-1.5 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" name="name" required defaultValue={address?.name ?? ''} className="mt-1.5 h-10" />
            </div>
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={address?.company ?? ''} className="mt-1.5 h-10" />
          </div>

          <div>
            <Label htmlFor="street1">Street address *</Label>
            <Input id="street1" name="street1" required defaultValue={address?.street1 ?? ''} className="mt-1.5 h-10" />
          </div>

          <div>
            <Label htmlFor="street2">Apt / Suite</Label>
            <Input id="street2" name="street2" defaultValue={address?.street2 ?? ''} className="mt-1.5 h-10" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label htmlFor="city">City *</Label>
              <Input id="city" name="city" required defaultValue={address?.city ?? ''} className="mt-1.5 h-10" />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input id="state" name="state" required defaultValue={address?.state ?? ''} className="mt-1.5 h-10" />
            </div>
            <div>
              <Label htmlFor="zip_code">ZIP *</Label>
              <Input id="zip_code" name="zip_code" required defaultValue={address?.zip_code ?? ''} className="mt-1.5 h-10" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={address?.country ?? 'US'} className="mt-1.5 h-10" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={address?.phone ?? ''} className="mt-1.5 h-10" />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="is_default"
              defaultChecked={address?.is_default ?? false}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            Make this my default
          </label>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-neutral-900 text-white hover:bg-neutral-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save address'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
