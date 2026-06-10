'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Check, Loader2, Mail, Phone, User as UserIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { updateProfileAction } from './actions'
import { easeOut } from '@/app/configure/components/motion'
import type { Tables } from '@/lib/types/supabase'

type Profile = Tables<'profiles'>

export function ProfileForm({ profile }: { profile: Profile }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setIsPending(true)
    const result = await updateProfileAction(new FormData(event.currentTarget))
    setIsPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-neutral-200 bg-neutral-50 text-neutral-900">
          <AlertDescription className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Profile saved.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="email" className="text-sm text-neutral-700">Email</Label>
        <div className="relative mt-1.5">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input id="email" value={profile.email} disabled className="h-10 pl-10 text-neutral-500" />
        </div>
        <p className="mt-1 text-[11px] text-neutral-500">
          Email is managed by your account. Contact support to change it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="first_name" className="text-sm text-neutral-700">First name</Label>
          <div className="relative mt-1.5">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="first_name"
              name="first_name"
              defaultValue={profile.first_name ?? ''}
              className="h-10 pl-10"
              placeholder="Jane"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="last_name" className="text-sm text-neutral-700">Last name</Label>
          <div className="relative mt-1.5">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="last_name"
              name="last_name"
              defaultValue={profile.last_name ?? ''}
              className="h-10 pl-10"
              placeholder="Smith"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="company" className="text-sm text-neutral-700">Company</Label>
          <div className="relative mt-1.5">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="company"
              name="company"
              defaultValue={profile.company ?? ''}
              className="h-10 pl-10"
              placeholder="Optional"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="phone" className="text-sm text-neutral-700">Phone</Label>
          <div className="relative mt-1.5">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ''}
              className="h-10 pl-10"
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
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
            'Save changes'
          )}
        </Button>
      </div>
    </motion.form>
  )
}
