'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Loader2,
  Ruler,
  RotateCw,
  Scissors,
  Box,
  Layers,
  Zap,
  Printer,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { ManufacturingService, SERVICE_LABELS } from '@/lib/utils/quoteCalculator'
import type { DetectedPartShape } from '@/lib/types/configuration'

import { easeOut } from './motion'

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
  } | null
  selectedMaterial: PanelMaterial | null
  quantity: number
  gauge: string
  service: ManufacturingService
  isReadyToQuote: boolean
  isSubmitting?: boolean
  onMaterialChange: (material: PanelMaterial) => void
  onQuantityChange: (quantity: number) => void
  onGaugeChange: (gauge: string) => void
  onServiceChange: (service: ManufacturingService) => void
  onSubmit: () => void
}

const SERVICE_OPTIONS: Array<{
  id: ManufacturingService
  icon: React.ComponentType<{ className?: string }>
  short: string
  description: string
}> = [
  {
    id: 'tube-bending',
    icon: RotateCw,
    short: 'Tube bending',
    description: 'Mandrel and rotary draw bending — round and square tube up to 2.5″.',
  },
  {
    id: 'tube-laser',
    icon: Zap,
    short: 'Tube laser',
    description: '5-axis fiber laser — holes, slots, and copes included at no upcharge.',
  },
  {
    id: 'sheet-laser',
    icon: Layers,
    short: 'Sheet laser',
    description: 'Flat sheet metal cuts on a 5×10 ft fiber laser table.',
  },
  {
    id: 'straight-cut',
    icon: Scissors,
    short: 'Straight cut',
    description: 'Straight tube saw cuts to spec, no bending or features.',
  },
  {
    id: '3d-printing',
    icon: Printer,
    short: '3D printing',
    description: 'FDM/SLS prints in PLA, PETG, ABS, Nylon, and TPU.',
  },
]

function formatLength(lengthMm: number, lengthInches: number, originalUnits?: string) {
  const mm = Number(lengthMm) || 0
  const inches = Number(lengthInches) || 0
  const unit = (originalUnits || '').toLowerCase()

  switch (unit) {
    case 'foot':
    case 'feet':
    case 'ft':
      return `${(inches / 12).toFixed(2)} ft`
    case 'meter':
    case 'metre':
    case 'm':
      return `${(mm / 1000).toFixed(2)} m`
    case 'centimeter':
    case 'centimetre':
    case 'cm':
      return `${(mm / 10).toFixed(1)} cm`
    case 'millimeter':
    case 'millimetre':
    case 'mm':
      return `${mm.toFixed(1)} mm`
    default:
      return `${inches.toFixed(2)}″`
  }
}

export default function MaterialSelectionPanel({
  fileInfo,
  selectedMaterial,
  quantity,
  gauge,
  service,
  isReadyToQuote,
  isSubmitting = false,
  onMaterialChange,
  onQuantityChange,
  onGaugeChange,
  onServiceChange,
  onSubmit,
}: MaterialSelectionPanelProps) {
  const canSubmit =
    isReadyToQuote && !!selectedMaterial && !!gauge && quantity > 0 && !isSubmitting
  const availableMaterials = materialsForService(service)
  const showsBends = service === 'tube-bending'
  const showsCuts = service === 'tube-bending' || service === 'tube-laser' || service === 'straight-cut'
  const showsFeatures = (service === 'tube-laser' || service === 'sheet-laser') && (fileInfo?.laserFeatures ?? 0) > 0
  const showsPrint = service === '3d-printing'

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
          Pick a service, material, and quantity for an instant quote.
        </p>
      </div>

      {/* Service selector */}
      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Service
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SERVICE_OPTIONS.map(option => {
            const isActive = option.id === service
            const recommended = fileInfo?.recommendedService === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onServiceChange(option.id)}
                className={`group relative flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all ${
                  isActive
                    ? 'border-slate-900 bg-slate-900/[0.025] shadow-sm ring-1 ring-slate-900/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <option.icon className={`h-3.5 w-3.5 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                  <span className="text-xs font-semibold text-slate-900">{option.short}</span>
                </div>
                <span className="line-clamp-2 text-[11px] leading-snug text-slate-500">
                  {option.description}
                </span>
                {recommended && !isActive && (
                  <span className="absolute -top-2 right-1 rounded-full bg-blue-600 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-white shadow">
                    Auto
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      {fileInfo ? (
        <motion.div
          key={`stats-${service}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className={`mt-4 grid gap-2 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-3 text-white ${
            showsPrint ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          <Stat
            icon={Ruler}
            label={showsPrint ? 'Longest edge' : 'Length'}
            value={formatLength(fileInfo.lengthMm, fileInfo.lengthInches, fileInfo.originalUnits)}
          />
          {showsBends && (
            <Stat icon={RotateCw} label="Bends" value={`${fileInfo.bends}`} />
          )}
          {showsCuts && (
            <Stat icon={Scissors} label="Cuts" value={`${fileInfo.cuts}`} />
          )}
          {showsFeatures && (
            <Stat icon={Sparkles} label="Holes/slots" value={`${fileInfo.laserFeatures}`} />
          )}
          {showsPrint && (
            <Stat icon={Box} label="Service" value="3D Print" />
          )}
          {!showsBends && !showsCuts && !showsFeatures && !showsPrint && (
            <Stat icon={Box} label="Service" value={SERVICE_LABELS[service]} />
          )}
        </motion.div>
      ) : (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          Awaiting analysis…
        </div>
      )}

      {/* Tubelaser/sheet-laser callout — features are included at no upcharge */}
      {(service === 'tube-laser' || service === 'sheet-laser') && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-snug text-blue-900">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Hole, slot, and cope laser features are included at no extra charge —
            you&apos;re only billed for material, setup, and labor.
          </span>
        </div>
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
                  {service === '3d-printing' ? (
                    <>
                      <div className="text-sm font-semibold text-slate-900">$35.00</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">/ lb print</div>
                    </>
                  ) : material.pricePerLb > 0 ? (
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

      {/* Specs */}
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
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity" className="text-xs font-medium text-slate-700">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={10000}
                  value={quantity}
                  onChange={e => onQuantityChange(parseInt(e.target.value) || 1)}
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">
                  {service === '3d-printing' ? 'Polymer' : 'Gauge / thickness'}
                </Label>
                <Select value={gauge} onValueChange={onGaugeChange}>
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue placeholder={service === '3d-printing' ? 'Select polymer' : 'Select gauge'} />
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
            </div>
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
            Get instant quote
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
