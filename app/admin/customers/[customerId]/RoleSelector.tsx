'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { setUserRoleAction } from '@/app/admin/actions'
import type { Database } from '@/lib/types/supabase'

type UserRole = Database['public']['Enums']['user_role']

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'business', label: 'Business' },
  { value: 'admin', label: 'Admin' },
]

export function RoleSelector({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const [role, setRole] = useState<UserRole>(currentRole)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function change(next: UserRole) {
    if (next === role) return
    if (next === 'admin' && !confirm('Promote this user to admin? They will get full access to /admin.')) return
    setError(null)
    startTransition(async () => {
      const result = await setUserRoleAction(userId, next)
      if (!result.ok) setError(result.error)
      else {
        setRole(next)
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Role</div>
      <div className="mt-2 flex gap-1">
        {ROLES.map(r => (
          <button
            key={r.value}
            type="button"
            disabled={isPending || r.value === role}
            onClick={() => change(r.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-100 ${
              r.value === role
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {isPending && (
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Updating…
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-rose-600">{error}</p>}
    </div>
  )
}
