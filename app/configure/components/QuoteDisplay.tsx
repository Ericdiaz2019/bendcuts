'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  Clock,
  Save,
  Send,
  ShieldCheck,
  FileText,
  Package,
} from 'lucide-react'
import { QuoteBreakdown, formatCurrency } from '@/lib/utils/quoteCalculator'
import type { PendingOrderPayload, OrderActionType } from '@/lib/types/orders'
import { submitOrderAction } from '@/app/configure/actions'
import { CheckoutDialog } from '@/app/configure/CheckoutDialog'
import { easeOut } from './motion'

interface QuoteDisplayProps {
  quote: QuoteBreakdown
  materialName: string
  materialId?: string
  gauge: string
  quantity: number
  fileInfo: {
    fileName: string
    lengthMm: number
    lengthInches: number
    originalUnits?: string
    bends: number
    cuts: number
  }
  cadFile?: File | null
}

function formatLength(lengthMm: number, lengthInches: number, originalUnits?: string): string {
  const mm = Number(lengthMm) || 0
  const inches = Number(lengthInches) || 0
  const unit = (originalUnits || '').toLowerCase()

  const mmText = `${mm.toFixed(2)} mm`
  const inchText = `${inches.toFixed(2)}"`

  switch (unit) {
    case 'inch':
    case 'inches':
    case 'in':
      return `${inchText} (${mmText})`
    case 'foot':
    case 'feet':
    case 'ft':
      return `${(inches / 12).toFixed(2)} ft (${inchText}, ${mmText})`
    case 'meter':
    case 'metre':
    case 'm':
      return `${(mm / 1000).toFixed(3)} m (${inchText}, ${mmText})`
    case 'centimeter':
    case 'centimetre':
    case 'cm':
      return `${(mm / 10).toFixed(2)} cm (${inchText}, ${mmText})`
    default:
      return `${mmText} (${inchText})`
  }
}

export default function QuoteDisplay({
  quote,
  materialName,
  materialId,
  gauge,
  quantity,
  fileInfo,
  cadFile,
}: QuoteDisplayProps) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<{ type: 'error'; message: string } | null>(null)
  const [submittingAction, setSubmittingAction] = useState<OrderActionType | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPayload, setCheckoutPayload] = useState<PendingOrderPayload | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{ path: string; size: number } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadInFlightRef = useRef<Promise<{ path: string; size: number } | null> | null>(null)

  // Stable idempotency key per quote shape — same key for retries, fresh key when inputs change.
  const idempotencyKey = useMemo(
    () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : ''),
    [materialId, gauge, quantity, fileInfo.fileName, fileInfo.lengthInches, fileInfo.bends, fileInfo.cuts],
  )

  // Upload the CAD file to Supabase Storage as soon as we land on the quote step.
  // The path is keyed by idempotency key so retries reuse the same blob.
  useEffect(() => {
    if (!cadFile || !idempotencyKey) return
    if (uploadedFile && uploadedFile.size === cadFile.size) return
    if (uploadInFlightRef.current) return

    const upload = async () => {
      setUploadError(null)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        // Anonymous: defer upload until after sign-in. The action will retry the path.
        return null
      }
      const safeName = cadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${userData.user.id}/${idempotencyKey}/${safeName}`
      const { error: upErr } = await supabase.storage
        .from('cad-files')
        .upload(path, cadFile, { upsert: true, cacheControl: '3600' })
      if (upErr) {
        setUploadError(upErr.message)
        return null
      }
      const result = { path, size: cadFile.size }
      setUploadedFile(result)
      return result
    }

    uploadInFlightRef.current = upload().finally(() => {
      uploadInFlightRef.current = null
    })
  }, [cadFile, idempotencyKey, uploadedFile])

  async function ensureUploaded(): Promise<{ path: string; size: number } | null> {
    if (uploadedFile) return uploadedFile
    if (uploadInFlightRef.current) return uploadInFlightRef.current
    return null
  }

  const buildOrderPayload = (uploaded: { path: string; size: number } | null): PendingOrderPayload => ({
    materialName,
    materialId: materialId ?? '',
    gauge,
    quantity,
    quote,
    file: {
      name: fileInfo.fileName,
      lengthInches: fileInfo.lengthInches,
      lengthMm: fileInfo.lengthMm,
      originalUnits: fileInfo.originalUnits,
      bends: fileInfo.bends,
      cuts: fileInfo.cuts,
      storagePath: uploaded?.path,
      fileSize: uploaded?.size,
    },
    createdAt: new Date().toISOString(),
    idempotencyKey: idempotencyKey || undefined,
  })

  const handleOrderAction = async (action: OrderActionType) => {
    setFeedback(null)
    const uploaded = await ensureUploaded()
    const payload = buildOrderPayload(uploaded)

    // "Submit order" goes through the checkout dialog (charge first, then create the order).
    // "Save for later" still uses the lightweight server action — no payment needed.
    if (action === 'submit') {
      setCheckoutPayload(payload)
      setCheckoutOpen(true)
      return
    }

    setSubmittingAction(action)
    const result = await submitOrderAction(payload, action)

    if (result.ok) {
      sessionStorage.setItem(
        'tubebend_dashboard_flash',
        JSON.stringify({
          action,
          orderNumber: result.orderNumber,
          materialName: result.materialName,
          quantity: result.quantity,
        }),
      )
      router.push('/user/dashboard')
      router.refresh()
      return
    }

    if (result.needsAuth) {
      try {
        sessionStorage.setItem('tubebend_pending_order', JSON.stringify({ action, payload }))
      } catch {
        // ignore storage failures
      }
      router.push('/auth/login?next=/user/dashboard')
      return
    }

    setFeedback({
      type: 'error',
      message: result.error || 'Something went wrong while processing your order. Please try again.',
    })
    setSubmittingAction(null)
  }

  const lineItems: Array<{ label: string; sublabel?: string; value: number }> = [
    {
      label: 'Material cost',
      sublabel: `${quote.details.materialWeight.toFixed(2)} lbs × ${quantity} part${quantity !== 1 ? 's' : ''}`,
      value: quote.materialCost,
    },
    {
      label: 'Bending operations',
      sublabel: `${fileInfo.bends} bend${fileInfo.bends !== 1 ? 's' : ''} × ${quantity} part${quantity !== 1 ? 's' : ''}`,
      value: quote.bendingCost,
    },
    {
      label: 'Cutting operations',
      sublabel: `${fileInfo.cuts} cut${fileInfo.cuts !== 1 ? 's' : ''} × ${quantity} part${quantity !== 1 ? 's' : ''}`,
      value: quote.cuttingCost,
    },
    {
      label: 'Labor',
      sublabel: `${quote.details.laborHours.toFixed(1)} hours @ $${quote.details.laborRate}/hr`,
      value: quote.laborCost,
    },
    {
      label: 'Setup & tooling',
      sublabel: 'One-time setup cost',
      value: quote.setupCost,
    },
  ]

  return (
    <div className="space-y-6">
      <motion.div
        initial="initial"
        animate="animate"
        variants={{
          initial: {},
          animate: { transition: { staggerChildren: 0.07 } },
        }}
        className="space-y-6"
      >
        {/* Hero card with total */}
        <motion.section
          variants={{
            initial: { opacity: 0, y: 16 },
            animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
          }}
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"
          />

          <div className="relative flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Quote ready
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Your instant quote
              </h1>
              <p className="mt-2 max-w-md text-slate-600">
                Transparent line-item pricing. Submit to start production, or save it for later.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs uppercase tracking-widest text-slate-500">Total</div>
              <AnimatedCurrency value={quote.total} className="text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl" />
              <div className="mt-1 text-sm text-slate-500">
                <AnimatedCurrency value={quote.pricePerPart} className="font-medium text-slate-700" />{' '}
                per part · {quantity} {quantity === 1 ? 'part' : 'parts'}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Two-column: Project summary + Pricing breakdown */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Project summary */}
          <motion.section
            variants={{
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
            }}
            className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Project summary
            </h2>

            <div className="mt-4 space-y-4">
              <SummaryGroup icon={FileText} title="Part">
                <SummaryRow label="File" value={fileInfo.fileName} mono />
                <SummaryRow
                  label="Length"
                  value={formatLength(fileInfo.lengthMm, fileInfo.lengthInches, fileInfo.originalUnits)}
                />
                <SummaryRow label="Bends" value={`${fileInfo.bends}`} />
                <SummaryRow label="Cuts" value={`${fileInfo.cuts}`} />
              </SummaryGroup>

              <Separator />

              <SummaryGroup icon={Package} title="Material & quantity">
                <SummaryRow label="Material" value={materialName} />
                <SummaryRow label="Gauge" value={gauge} />
                <SummaryRow label="Quantity" value={`${quantity} ${quantity === 1 ? 'part' : 'parts'}`} />
                <SummaryRow label="Weight per part" value={`${quote.details.materialWeight.toFixed(2)} lbs`} />
              </SummaryGroup>
            </div>
          </motion.section>

          {/* Pricing breakdown */}
          <motion.section
            variants={{
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
            }}
            className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Pricing breakdown
            </h2>

            <ul className="mt-4 divide-y divide-slate-100">
              {lineItems.map((item, idx) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: easeOut, delay: 0.1 + idx * 0.05 }}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800">{item.label}</div>
                    {item.sublabel && (
                      <div className="text-xs text-slate-500">{item.sublabel}</div>
                    )}
                  </div>
                  <div className="font-semibold tabular-nums text-slate-900">
                    {formatCurrency(item.value)}
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium tabular-nums text-slate-900">{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Tax (8.875%)</span>
                <span className="font-medium tabular-nums text-slate-900">{formatCurrency(quote.tax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-lg font-semibold tabular-nums text-slate-900">
                  {formatCurrency(quote.total)}
                </span>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Lead time + guarantee */}
        <div className="grid gap-6 sm:grid-cols-2">
          <motion.div
            variants={{
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
            }}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Lead time</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">3–5 business days</div>
              <p className="mt-1 text-sm text-slate-500">
                Standard production for {quantity} part{quantity !== 1 ? 's' : ''}.
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={{
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
            }}
            className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-900">Quality guarantee</div>
              <ul className="mt-1.5 space-y-1 text-sm text-emerald-800">
                <li>· Precision tube bending to spec</li>
                <li>· Full dimensional inspection</li>
                <li>· 30-day quality guarantee</li>
              </ul>
            </div>
          </motion.div>
        </div>

        {feedback && (
          <Alert variant="destructive">
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <motion.div
          variants={{
            initial: { opacity: 0, y: 16 },
            animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
          }}
          className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => handleOrderAction('save')}
            disabled={submittingAction !== null}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Save className="w-4 h-4 mr-2" />
            Save for later
          </Button>

          <Button
            type="button"
            size="lg"
            onClick={() => handleOrderAction('submit')}
            disabled={submittingAction !== null}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
          >
            <Send className="w-4 h-4 mr-2" />
            {submittingAction === 'submit' ? 'Submitting…' : 'Submit order'}
          </Button>
        </motion.div>

        <p className="text-center text-xs text-slate-500">
          This instant estimate may be adjusted after our engineering review · Material ID:{' '}
          <span className="font-mono">{materialId ?? '—'}</span>
        </p>
      </motion.div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={open => {
          setCheckoutOpen(open)
          if (!open) setSubmittingAction(null)
        }}
        payload={checkoutPayload}
      />
    </div>
  )
}

function AnimatedCurrency({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, latest => formatCurrency(Math.max(0, latest)))
  const [display, setDisplay] = useState<string>(formatCurrency(0))
  const previous = useRef(0)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: easeOut,
      onUpdate: latest => {
        setDisplay(formatCurrency(Math.max(0, latest)))
      },
    })
    previous.current = value
    return () => controls.stop()
  }, [value, motionValue])

  // rounded is referenced to keep the transform alive even though we drive
  // setDisplay manually via onUpdate. Avoids "unused variable" lint without
  // changing behavior.
  void rounded

  return <span className={className}>{display}</span>
}

function SummaryGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Icon className="h-4 w-4 text-slate-500" />
        {title}
      </div>
      <dl className="mt-2 space-y-1.5">{children}</dl>
    </div>
  )
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium text-slate-900 truncate ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
