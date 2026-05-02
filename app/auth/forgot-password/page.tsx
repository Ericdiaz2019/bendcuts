'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Boxes, Loader2, Mail, MailCheck } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { requestPasswordResetAction } from '@/lib/auth/actions'
import { easeOut } from '@/app/configure/components/motion'

export default function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsPending(true)
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const result = await requestPasswordResetAction(formData)
    setIsPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
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

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2 text-white/90 transition hover:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md">
            <Boxes className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">TubeBend</span>
        </Link>

        <div className="w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Reset your password
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">
            We&apos;ll send a secure link to your inbox.
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
                  If an account exists for <span className="font-medium text-slate-900">{submitted.email}</span>,
                  we&apos;ve sent you a password reset link.
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
                className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/40 ring-1 ring-white/5 sm:p-8"
              >
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

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-70"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending link…
                    </>
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-slate-500">
                  Remembered it?{' '}
                  <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-700">
                    Back to sign in
                  </Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
