'use client'

import { useEffect, useState } from 'react'
import { Check, Target } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import type { BendFeature, FeatureConfig, FeatureConfigMap } from '@/lib/types/configuration'

import { formatInch } from './featureFormat'

type ToleranceTier = 'standard' | 'precision' | 'critical'

const TIERS: Array<{
  id: ToleranceTier
  label: string
  toleranceLabel: string
  description: string
  surcharge: number
}> = [
  {
    id: 'standard',
    label: 'Standard',
    toleranceLabel: '±1.0°',
    description: 'Stocked tooling. Suitable for most brackets and frames.',
    surcharge: 0,
  },
  {
    id: 'precision',
    label: 'Precision',
    toleranceLabel: '±0.5°',
    description: 'Indicator-verified bends. For mating tubes or weld assemblies.',
    surcharge: 0.15,
  },
  {
    id: 'critical',
    label: 'Critical',
    toleranceLabel: '±0.25°',
    description: 'CMM-verified. For aerospace, medical, and tight-fit-up jobs.',
    surcharge: 0.35,
  },
]

const BASE_BEND_COST = 15

interface BendToleranceSheetProps {
  open: boolean
  bend: BendFeature
  configs: FeatureConfigMap
  onApply: (entry: FeatureConfig) => void
  onClose: () => void
}

function buildBendConfig(bendId: string, tier: ToleranceTier): FeatureConfig {
  const t = TIERS.find(x => x.id === tier)!
  return {
    featureId: bendId,
    serviceId: 'tolerance',
    params: { tier },
    costDeltaPerPart: Number((BASE_BEND_COST * t.surcharge).toFixed(2)),
    summary: `${t.label} ${t.toleranceLabel}`,
  }
}

export default function BendToleranceSheet({
  open,
  bend,
  configs,
  onApply,
  onClose,
}: BendToleranceSheetProps) {
  const existing = configs[bend.id]
  const initialTier: ToleranceTier =
    existing?.serviceId === 'tolerance' && typeof existing.params?.tier === 'string'
      ? (existing.params.tier as ToleranceTier)
      : 'standard'

  const [tier, setTier] = useState<ToleranceTier>(initialTier)

  useEffect(() => {
    if (open) setTier(initialTier)
  }, [open, initialTier])

  return (
    <Sheet open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Bend tolerance</SheetTitle>
          <SheetDescription>
            How tight does this bend need to land? Tighter tolerances cost more
            because of slower setup and verification.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Bend angle
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
              {bend.angleDeg}°
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Centerline radius
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
              {formatInch(bend.centerlineRadiusMm)}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {TIERS.map(t => {
            const active = t.id === tier
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-slate-900 bg-slate-900/[0.03] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Target className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
                      {t.toleranceLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{t.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold text-slate-900">
                    {t.surcharge === 0 ? 'Included' : `+${Math.round(t.surcharge * 100)}%`}
                  </div>
                  {active && (
                    <Check className="ml-auto mt-1 h-4 w-4 text-emerald-600" strokeWidth={3} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <SheetFooter className="mt-6 flex-row items-center justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => { onApply(buildBendConfig(bend.id, tier)); onClose() }}>
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
