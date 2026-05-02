'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Download, Loader2, Mail } from 'lucide-react'

import {
  changeEmailAction,
  deactivateAccountAction,
  exportMyDataAction,
} from './actions'

export function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', email)
      const result = await changeEmailAction(fd)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setEmail('')
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Mail className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Email address</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Currently <span className="font-medium text-slate-700">{currentEmail}</span>. We&apos;ll
            send a verification link to your new address — your email won&apos;t change until you
            click it.
          </p>

          {!open && !success && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              Change email →
            </button>
          )}

          {success && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Check your new inbox for a verification link.
            </p>
          )}

          {open && !success && (
            <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="new@example.com"
                required
                autoFocus
                className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-cyan-600 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setError(null)
                  setEmail('')
                }}
                className="h-10 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
            </form>
          )}

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export function DataExportCard() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function downloadJSON(payload: Record<string, unknown>) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tubebend-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleExport() {
    setError(null)
    startTransition(async () => {
      const result = await exportMyDataAction()
      if (!result.ok) {
        setError(result.error)
        return
      }
      downloadJSON(result.data)
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Export your data</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Download a JSON archive of everything we have on file — profile, orders, files,
            payments, addresses, activity.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isPending ? 'Preparing…' : 'Download JSON'}
          </button>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export function DeactivateAccountCard() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('confirm', confirm)
      const result = await deactivateAccountAction(fd)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push('/')
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-rose-900">Deactivate account</h3>
          <p className="mt-0.5 text-xs text-rose-700">
            Your account will be deactivated and you&apos;ll be signed out. Order history is
            retained for accounting & legal records. Contact support to fully purge your data.
          </p>

          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            >
              Deactivate account
            </button>
          )}

          {open && (
            <form onSubmit={submit} className="mt-3 space-y-2">
              <label className="block text-xs font-medium text-rose-800">
                Type <span className="font-mono font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoFocus
                className="h-10 w-full rounded-lg border border-rose-200 bg-white px-3 text-sm font-mono focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isPending || confirm !== 'DELETE'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Permanently deactivate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setConfirm('')
                    setError(null)
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="text-xs text-rose-700">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
