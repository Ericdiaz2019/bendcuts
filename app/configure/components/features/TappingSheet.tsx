'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import type {
  Feature,
  FeatureConfig,
  FeatureConfigMap,
  HoleFeature,
} from '@/lib/types/configuration'
import {
  isTapApplicable,
  recommendTap,
  tapCostPerHole,
  tapsByStandard,
  type TapSpec,
} from '@/lib/configure/taps'

import { formatInch } from './featureFormat'

interface TappingSheetProps {
  open: boolean
  hole: HoleFeature
  /** All features in the part — used for "apply to all of this size". */
  allFeatures: Feature[]
  configs: FeatureConfigMap
  onApply: (entries: FeatureConfig[]) => void
  onClose: () => void
}

const SIZE_MATCH_TOLERANCE_MM = 0.5

function buildTapConfig(featureId: string, tap: TapSpec, applicable: boolean): FeatureConfig {
  return {
    featureId,
    serviceId: 'tap',
    params: { tapId: tap.id, kind: tap.kind, standard: tap.standard, applicable },
    costDeltaPerPart: applicable ? tapCostPerHole(tap) : 0,
    summary: `Tap ${tap.label.replace(/\s*(Roll|Cut)\s*Tap.*$/i, '').trim()}`,
  }
}

export default function TappingSheet({
  open,
  hole,
  allFeatures,
  configs,
  onApply,
  onClose,
}: TappingSheetProps) {
  const recommended = useMemo(() => recommendTap(hole.diameterMm), [hole.diameterMm])
  const existing = configs[hole.id]
  const initialTapId =
    existing?.serviceId === 'tap' && typeof existing.params?.tapId === 'string'
      ? (existing.params.tapId as string)
      : recommended.id

  const [selectedTapId, setSelectedTapId] = useState<string>(initialTapId)
  const [applyToAll, setApplyToAll] = useState<boolean>(false)

  // Re-seed selection when the sheet opens for a new hole.
  useEffect(() => {
    if (open) setSelectedTapId(initialTapId)
  }, [open, initialTapId])

  const groups = useMemo(() => tapsByStandard(), [])

  const sameSizeHoles = useMemo(() => {
    return allFeatures.filter(
      (f): f is HoleFeature =>
        f.kind === 'hole' && Math.abs(f.diameterMm - hole.diameterMm) <= SIZE_MATCH_TOLERANCE_MM,
    )
  }, [allFeatures, hole.diameterMm])

  function handleApply() {
    const tap = groups.metric.concat(groups.sae).find(t => t.id === selectedTapId)
    if (!tap) return

    const targets = applyToAll ? sameSizeHoles : [hole]
    const entries: FeatureConfig[] = targets.map(h =>
      buildTapConfig(h.id, tap, isTapApplicable(tap, h.diameterMm)),
    )
    onApply(entries)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Select your tap</SheetTitle>
          <SheetDescription>
            Don&apos;t model threads in the part file — we&apos;ll tap to your spec.
          </SheetDescription>
        </SheetHeader>

        {/* Hole details */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Hole diameter
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900">
              {formatInch(hole.diameterMm)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Depth
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900">
              {formatInch(hole.depthMm)}
            </div>
          </div>
          {sameSizeHoles.length > 1 && (
            <label className="ml-auto flex items-center gap-2 text-xs font-medium text-neutral-700">
              <Checkbox
                checked={applyToAll}
                onCheckedChange={v => setApplyToAll(v === true)}
              />
              Apply to all {sameSizeHoles.length} holes of this size
            </label>
          )}
        </div>

        {/* Tap groups */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {(['metric', 'sae'] as const).map(std => (
            <div key={std}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                {std === 'metric' ? 'Metric' : 'SAE'}
              </div>
              <div className="space-y-1.5">
                {groups[std].map(tap => {
                  const active = tap.id === selectedTapId
                  const applicable = isTapApplicable(tap, hole.diameterMm)
                  const isRecommended = tap.id === recommended.id
                  return (
                    <button
                      key={tap.id}
                      type="button"
                      onClick={() => setSelectedTapId(tap.id)}
                      className={`group relative flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? 'border-neutral-900 bg-neutral-900/[0.03] shadow-sm'
                          : applicable
                            ? 'border-neutral-200 bg-white hover:border-neutral-300'
                            : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                      }`}
                    >
                      <span className="flex-1 font-medium text-neutral-900">{tap.label}</span>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                          <Sparkles className="h-3 w-3" /> Auto
                        </span>
                      )}
                      {!applicable && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 text-amber-600"
                          aria-label="Hole size outside recommended range"
                        />
                      )}
                      {active && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Manufacturability hint */}
        {hole.depthMm > hole.diameterMm * 3 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This hole is deeper than 3× its diameter — deep taps need lubrication and
              risk breakage. We&apos;ll review before machining.
            </span>
          </div>
        )}

        <SheetFooter className="mt-6 flex-row items-center justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedTapId}>
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
