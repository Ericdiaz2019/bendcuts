'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Boxes, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { signInAction } from '@/lib/auth/actions'
import { easeOut } from '@/app/configure/components/motion'

function LoginForm() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/user/projects'
  const initialError = params.get('error') ?? ''
  const registered = params.get('registered') === '1'

  const [error, setError] = useState(initialError)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsPending(true)
    const formData = new FormData(event.currentTarget)
    formData.set('next', next)
    const result = await signInAction(formData)
    if (result && !result.ok) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/40 ring-1 ring-white/5 sm:p-8"
    >
      {registered && !error && (
        <Alert>
          <AlertDescription>
            Account created. Check your email to confirm your address, then sign in.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="email" className="text-sm text-slate-700">
          Email
        </Label>
        <div className="relative mt-1.5">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 pl-10"
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm text-slate-700">
            Password
          </Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="h-11 pl-10 pr-10"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-70"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-slate-500">
        New to TubeBend?{' '}
        <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-700">
          Create an account
        </Link>
      </p>
    </motion.form>
  )
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 35%, rgba(34,211,238,0.14), rgba(59,130,246,0.08) 45%, transparent 75%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 50% 35%, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at 50% 35%, black 30%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-white/90 transition hover:text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md">
            <Boxes className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">TubeBend</span>
        </Link>

        <div className="w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">
            Sign in to manage your projects and orders.
          </p>
        </div>

        <div className="mt-8 w-full">
          <Suspense fallback={<div className="h-[420px]" />}>
            <LoginForm />
          </Suspense>
        </div>

        <Link
          href="/"
          className="mt-6 text-xs text-slate-400 transition hover:text-white"
        >
          ← Back to TubeBend
        </Link>
      </div>
    </div>
  )
}
