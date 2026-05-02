'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Eye, EyeOff, Loader2, Lock } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { changePasswordAction } from './actions'
import { easeOut } from '@/app/configure/components/motion'

function passwordScore(password: string) {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ]
  return checks.filter(Boolean).length
}

const STRENGTH_COPY = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong', 'Excellent']
const STRENGTH_COLOR = [
  'bg-rose-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-emerald-500',
  'bg-emerald-500',
]

export function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const score = useMemo(() => passwordScore(password), [password])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (score < 3) {
      setError('Please choose a stronger password.')
      return
    }
    setIsPending(true)
    const result = await changePasswordAction(new FormData(event.currentTarget))
    setIsPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPassword('')
    setConfirm('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Password updated.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="password" className="text-sm text-slate-700">New password</Label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-10 pl-10 pr-10"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && (
          <div className="mt-2">
            <div className="flex h-1.5 gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < score ? STRENGTH_COLOR[score] : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{STRENGTH_COPY[score]}</p>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword" className="text-sm text-slate-700">Confirm new password</Label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={show ? 'text' : 'password'}
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="h-10 pl-10"
            autoComplete="new-password"
          />
          {confirm && password === confirm && (
            <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating…
            </>
          ) : (
            'Update password'
          )}
        </Button>
      </div>
    </motion.form>
  )
}
