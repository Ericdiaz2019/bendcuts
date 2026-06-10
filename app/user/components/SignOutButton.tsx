'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'

import { signOutAction } from '@/lib/auth/actions'

export function SignOutButton({ className }: { className?: string }) {
  const [isPending, setIsPending] = useState(false)
  return (
    <form
      action={async () => {
        setIsPending(true)
        await signOutAction()
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        className={
          className ??
          'inline-flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60'
        }
      >
        <LogOut className="h-4 w-4" />
        {isPending ? 'Signing out…' : 'Sign out'}
      </button>
    </form>
  )
}
