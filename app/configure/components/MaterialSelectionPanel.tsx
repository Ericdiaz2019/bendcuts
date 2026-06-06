'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Ruler,
  RotateCw,
  Scissors,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  PANEL_MATERIALS,
  materialsForService,
  type CatalogMaterial as PanelMaterial,
} from '@/lib/configure/materials'
import { calculateQuote, ManufacturingService } from '@/lib/utils/quoteCalculator'
import { useDisplayUnit, formatLength as formatLengthMm } from '@/lib/configure/displayUnit'
import type {
  CADPreviewKind,
  DetectedPartShape,
  Feature,
  FeatureConfigMap,
} from '@/lib/types/configuration'

import { easeOut } from './motion'
import FeaturesList from './features/FeaturesList'

export type { PanelMaterial }
export { PANEL_MATERIALS }

interface MaterialSelectionPanelProps {
  fileInfo: {
    lengthMm: number
    lengthInches: number
    originalUnits?: string
    bends: number
    cuts: number
    laserFeatures?: number
    partShape?: DetectedPartShape
    recommendedService?: ManufacturingService
    previewKind?: CADPreviewKind
    instantQuoteEligible?: boolean
    quoteConfidence?: number
    quoteBlockingReasons?: string[]
  } | null
  selectedMaterial: PanelMaterial | null
  quantity: number
  gauge: string
  service: ManufacturingService
  isReadyToQuote: boolean
  isSubmitting?: boolean
  /** Detected per-feature geometry (bends, holes, end-cuts). */
  features?: Feature[]
  featureConfigs: FeatureConfigMap
  selectedFeatureId: string | null
  onMaterialChange: (material: PanelMaterial) => void
  onQuantityChange: (quantity: number) => void
  onGaugeChange: (gauge: string) => void
  onServiceChange: (service: ManufacturingService) => void
  onConfigureFeature: (featureId: string) => void
  onClearFeatureConfig: (featureId: string) => void
  onSelectFeature: (featureId: string | null) => void
  onResetAllFeatures: () => void
  onSubmit: () => void
}

// Quantity tiers shown in the price-break drawer (SendCutSend-style).
const QTY_TIERS = [1, 2, 10, 50, 100, 1000] as const

// Length now reads in whatever display unit the user selected from the viewer
// toolbar. The original file units used to drive this but the user can switch
// presentation independent of source, which matches the cross-shop expectation.

function formatUSD(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Today + 5 business days (skip Sat/Sun). Returns "May 16" style.
function estimateArrivalDate(): string {
  const d = new Date()
  let added = 0
  while (added < 5) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MaterialSelectionPanel({
  fileInfo,
  selectedMaterial,
  quantity,
  gauge,
  service,
  isReadyToQuote,
  isSubmitting = false,
  features,
  featureConfigs,
  selectedFeatureId,
  onMaterialChange,
  onQuantityChange,
  onGaugeChange,
  onConfigureFeature,
  onClearFeatureConfig,
  onSelectFeature,
  onResetAllFeatures,
  onSubmit,
}: MaterialSelectionPanelProps) {
  const canSubmit =
    isReadyToQuote && !!selectedMaterial && !!gauge && quantity > 0 && !isSubmitting
  const availableMaterials = materialsForService(service)
  const featureConfigEntries = useMemo(() => Object.values(featureConfigs), [featureConfigs])
  const [displayUnit] = useDisplayUnit()

  // Computed pricing — only when we have everything needed to produce a quote.
  const pricing = useMemo(() => {
    if (!selectedMaterial || !gauge || !fileInfo) return null
    const baseInputs = {
      material: {
        id: selectedMaterial.id,
        name: selectedMaterial.name,
        pricePerLb: selectedMaterial.pricePerLb,
      },
      gauge,
      length: fileInfo.lengthInches,
      bends: fileInfo.bends,
      cuts: fileInfo.cuts,
      service,
      laserFeatures: fileInfo.laserFeatures ?? 0,
      featureConfigs: featureConfigEntries,
    }

    const current = calculateQuote({ ...baseInputs, quantity })
    const tiers = QTY_TIERS.map(qty => {
      const q = calculateQuote({ ...baseInputs, quantity: qty })
      return { qty, pricePerEa: q.pricePerPart, total: q.total }
    })

    return {
      pricePerEa: current.pricePerPart,
      subtotal: current.total,
      tiers,
    }
  }, [selectedMaterial, gauge, fileInfo, service, quantity, featureConfigEntries])

  const arrival = useMemo(estimateArrivalDate, [])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm lg:sticky lg:top-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
          Step 2 — Configure
        </div>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Configure your part
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Pick a material and quantity for an instant quote.
        </p>
      </div>

      {/* Stats — always length, bends, cuts. The analyzer figures out the service. */}
      {fileInfo ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-3 text-white"
        >
          <Stat
            icon={Ruler}
            label="Length"
            value={formatLengthMm(fileInfo.lengthMm, displayUnit)}
          />
          <Stat icon={RotateCw} label="Bends" value={`${fileInfo.bends}`} />
          <Stat icon={Scissors} label="Cuts" value={`${fileInfo.cuts}`} />
        </motion.div>
      ) : (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          Awaiting analysis…
        </div>
      )}

      {fileInfo && !isReadyToQuote && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">Engineering review required</div>
              <p className="mt-0.5">
                {fileInfo.quoteBlockingReasons?.[0] ??
                  'This file format is accepted, but automated preview and quote analysis are not ready for it yet.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detected features — clickable rows that open per-feature config sheets */}
      {features && features.length > 0 && (
        <FeaturesList
          features={features}
          configs={featureConfigs}
          selectedFeatureId={selectedFeatureId}
          onConfigure={onConfigureFeature}
          onClearConfig={onClearFeatureConfig}
          onSelect={onSelectFeature}
          onResetAll={onResetAllFeatures}
        />
      )}

      {/* Materials */}
      <div className="mt-6">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Material
        </div>
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.05 } },
          }}
          className="space-y-2"
        >
          {availableMaterials.map(material => {
            const selected = selectedMaterial?.id === material.id
            return (
              <motion.button
                key={material.id}
                type="button"
                onClick={() => onMaterialChange(material)}
                variants={{
                  initial: { opacity: 0, x: -6 },
                  animate: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.3, ease: easeOut },
                  },
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                className={`group relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  selected
                    ? 'border-slate-900 bg-slate-900/[0.025] shadow-md ring-1 ring-slate-900/5'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-full ring-2 ring-white shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${material.color} 0%, #fff 200%)`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900">{material.name}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500">
                    {material.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {material.pricePerLb > 0 ? (
                    <>
                      <div className="text-sm font-semibold text-slate-900">
                        ${material.pricePerLb.toFixed(2)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">/ lb</div>
                    </>
                  ) : (
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Quote</div>
                  )}
                </div>
                <AnimatePresence>
                  {selected && (
                    <motion.span
                      key="check"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-md ring-2 ring-white"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* Grade + Quantity — only after a material is picked */}
      <AnimatePresence>
        {selectedMaterial && (
          <motion.div
            key="specs"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="overflow-hidden"
          >
            <div className="mt-5">
              <Label className="text-xs font-medium text-slate-700">
                Grade / thickness
              </Label>
              <Select value={gauge} onValueChange={onGaugeChange}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {selectedMaterial.gauges.map(g => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <QuantityPicker
              quantity={quantity}
              onQuantityChange={onQuantityChange}
              pricePerEa={pricing?.pricePerEa ?? null}
              subtotal={pricing?.subtotal ?? null}
              tiers={pricing?.tiers ?? null}
              arrival={arrival}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-6 h-12 w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20 disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating quote…
          </>
        ) : (
          <>
            {fileInfo && !isReadyToQuote ? 'Engineering review required' : 'Get instant quote'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <p className="mt-3 text-center text-[11px] text-slate-500">
        No commitment · transparent line-item pricing
      </p>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-blue-200/80">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

interface QuantityPickerProps {
  quantity: number
  onQuantityChange: (n: number) => void
  pricePerEa: number | null
  subtotal: number | null
  tiers: Array<{ qty: number; pricePerEa: number; total: number }> | null
  arrival: string
}

function QuantityPicker({
  quantity,
  onQuantityChange,
  pricePerEa,
  subtotal,
  tiers,
  arrival,
}: QuantityPickerProps) {
  const [open, setOpen] = useState(false)
  const clamp = (n: number) => Math.max(1, Math.min(10000, Math.floor(n) || 1))

  const decrement = () => onQuantityChange(clamp(quantity - 1))
  const increment = () => onQuantityChange(clamp(quantity + 1))

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Quantity
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            {pricePerEa !== null ? formatUSD(pricePerEa) : '—'}
            <span className="ml-1 text-xs font-medium text-slate-500">/ ea</span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={decrement}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            min={1}
            max={10000}
            value={quantity}
            onChange={e => onQuantityChange(clamp(parseInt(e.target.value, 10)))}
            className="w-14 bg-transparent text-center text-sm font-semibold text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Quantity"
          />
          <button
            type="button"
            onClick={increment}
            aria-label="Increase quantity"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* View details toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={!tiers}
        className="flex w-full items-center justify-between gap-2 border-t border-slate-200/70 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-white/60 sm:px-4 disabled:cursor-not-allowed disabled:text-slate-400"
        aria-expanded={open}
      >
        <span>{open ? 'Hide price breaks' : 'View price breaks'}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Tier table */}
      <AnimatePresence initial={false}>
        {open && tiers && (
          <motion.div
            key="tiers"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: easeOut }}
            className="overflow-hidden"
          >
            <ul className="border-t border-slate-200/70 divide-y divide-slate-200/70">
              {tiers.map(tier => {
                const active = tier.qty === quantity
                const baseline = tiers[0]?.pricePerEa ?? tier.pricePerEa
                const savings =
                  baseline > 0 && tier.qty > 1
                    ? Math.round((1 - tier.pricePerEa / baseline) * 100)
                    : 0
                return (
                  <li key={tier.qty}>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(tier.qty)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition sm:px-4 ${
                        active ? 'bg-slate-900/[0.04]' : 'hover:bg-white'
                      }`}
                    >
                      <span className="font-medium text-slate-700">
                        {tier.qty.toLocaleString()}{' '}
                        <span className="text-slate-400">parts</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {savings > 0 && (
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            −{savings}%
                          </span>
                        )}
                        <span
                          className={`font-semibold tabular-nums ${
                            active ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {formatUSD(tier.pricePerEa)}
                          <span className="ml-0.5 font-normal text-slate-400">/ea</span>
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtotal + lead time */}
      <div className="space-y-1 border-t border-slate-200/70 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Subtotal</span>
          <span className="font-semibold tabular-nums text-slate-900">
            {subtotal !== null ? formatUSD(subtotal) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Arrives as soon as</span>
          <span className="font-medium text-slate-700">{arrival}</span>
        </div>
      </div>
    </div>
  )
}
