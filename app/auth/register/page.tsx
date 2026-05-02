'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  Phone,
  User as UserIcon,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { signUpAction } from '@/lib/auth/actions'
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

export default function RegisterPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const score = useMemo(() => passwordScore(password), [password])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (score < 3) {
      setError('Please choose a stronger password.')
      return
    }

    setIsPending(true)
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const result = await signUpAction(formData)

    if (!result.ok) {
      setIsPending(false)
      setError(result.error)
      return
    }

    // If "Confirm email" is off in Supabase, the user is already signed in —
    // skip the inbox card and go straight to the dashboard.
    if (result.signedIn) {
      router.push('/user/dashboard')
      router.refresh()
      return
    }

    setIsPending(false)
    setSubmitted({ email })
  }

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

      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2 text-white/90 transition hover:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md">
            <Boxes className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">TubeBend</span>
        </Link>

        <div className="w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">
            Get instant quotes, save projects, and order parts.
          </p>
        </div>

        <div className="mt-8 w-full">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: easeOut }}
                className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-950/40 ring-1 ring-white/5"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <MailCheck className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Check your inbox</h2>
                <p className="mt-2 text-sm text-slate-600">
                  We sent a confirmation link to <span className="font-medium text-slate-900">{submitted.email}</span>.
                  Click it to verify your account and finish signing up.
                </p>
                <Link
                  href="/auth/login"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Back to sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: easeOut }}
                className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/40 ring-1 ring-white/5 sm:p-8"
              >
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="firstName" name="firstName" label="First name" icon={UserIcon} required />
                  <Field id="lastName" name="lastName" label="Last name" icon={UserIcon} required />
                </div>

                <Field id="email" name="email" type="email" label="Email" icon={Mail} required autoComplete="email" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="company" name="company" label="Company (optional)" icon={Building2} />
                  <Field id="phone" name="phone" type="tel" label="Phone (optional)" icon={Phone} />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm text-slate-700">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-11 pl-10 pr-10"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
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
                  <Label htmlFor="confirmPassword" className="text-sm text-slate-700">Confirm password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="h-11 pl-10"
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                    />
                    {confirmPassword && password === confirmPassword && (
                      <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                    )}
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
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-700">
                    Sign in
                  </Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <Link href="/" className="mt-6 text-xs text-slate-400 transition hover:text-white">
          ← Back to TubeBend
        </Link>
      </div>
    </div>
  )
}

function Field({
  id,
  name,
  label,
  icon: Icon,
  type = 'text',
  required,
  autoComplete,
}: {
  id: string
  name: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  type?: string
  required?: boolean
  autoComplete?: string
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm text-slate-700">
        {label}
      </Label>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          className="h-11 pl-10"
        />
      </div>
    </div>
  )
}
