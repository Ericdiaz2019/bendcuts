'use client'

import { useEffect, useState } from 'react'
import { Check, Scissors, Slash, Triangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import type { EndCutFeature, FeatureConfig, FeatureConfigMap } from '@/lib/types/configuration'

type EndCutStyle = 'square' | 'miter' | 'chamfer'

interface StyleOption {
  id: EndCutStyle
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  baseCost: number
}

const STYLES: StyleOption[] = [
  {
    id: 'square',
    label: 'Square cut',
    description: 'Default. 90° saw cut, square to the tube axis.',
    icon: Scissors,
    baseCost: 0,
  },
  {
    id: 'miter',
    label: 'Miter',
    description: 'Angled saw cut for joining tubes at an angle.',
    icon: Slash,
    baseCost: 4,
  },
  {
    id: 'chamfer',
    label: 'Chamfer',
    description: 'Beveled edge — eases deburr and improves weld prep.',
    icon: Triangle,
    baseCost: 2.5,
  },
]

interface EndCutSheetProps {
  open: boolean
  endCut: EndCutFeature
  configs: FeatureConfigMap
  onApply: (entry: FeatureConfig) => void
  onClose: () => void
}

function buildEndCutConfig(
  endCutId: string,
  endIndex: 0 | 1,
  style: EndCutStyle,
  miterAngleDeg: number,
  chamferDepthMm: number,
): FeatureConfig {
  const opt = STYLES.find(s => s.id === style)!
  const summary =
    style === 'square'
      ? `${endIndex === 0 ? 'Start' : 'Finish'} · square`
      : style === 'miter'
        ? `${endIndex === 0 ? 'Start' : 'Finish'} · ${miterAngleDeg}° miter`
        : `${endIndex === 0 ? 'Start' : 'Finish'} · ${chamferDepthMm}mm chamfer`
  return {
    featureId: endCutId,
    serviceId: style === 'miter' ? 'miter' : style === 'chamfer' ? 'chamfer' : 'tolerance',
    params: { style, miterAngleDeg, chamferDepthMm },
    costDeltaPerPart: opt.baseCost,
    summary,
  }
}

export default function EndCutSheet({
  open,
  endCut,
  configs,
  onApply,
  onClose,
}: EndCutSheetProps) {
  const existing = configs[endCut.id]
  const params = (existing?.params ?? {}) as {
    style?: EndCutStyle
    miterAngleDeg?: number
    chamferDepthMm?: number
  }

  const [style, setStyle] = useState<EndCutStyle>(params.style ?? 'square')
  const [miterAngle, setMiterAngle] = useState<number>(params.miterAngleDeg ?? 45)
  const [chamferDepth, setChamferDepth] = useState<number>(params.chamferDepthMm ?? 1.5)

  useEffect(() => {
    if (!open) return
    setStyle(params.style ?? 'square')
    setMiterAngle(params.miterAngleDeg ?? 45)
    setChamferDepth(params.chamferDepthMm ?? 1.5)
    // We intentionally read from `existing` once when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, endCut.id])

  return (
    <Sheet open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{endCut.endIndex === 0 ? 'Start' : 'Finish'} end cut</SheetTitle>
          <SheetDescription>
            How should this end be finished? Square is standard at no charge.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-2">
          {STYLES.map(opt => {
            const Icon = opt.icon
            const active = opt.id === style
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStyle(opt.id)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-neutral-900 bg-neutral-900/[0.03] shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-neutral-900">{opt.label}</span>
                  <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">{opt.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold text-neutral-900">
                    {opt.baseCost === 0 ? 'Included' : `+$${opt.baseCost.toFixed(2)}/ea`}
                  </div>
                  {active && (
                    <Check className="ml-auto mt-1 h-4 w-4 text-neutral-900" strokeWidth={3} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {style === 'miter' && (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
            <label className="flex items-center justify-between text-xs font-semibold text-neutral-700">
              Miter angle
              <span className="font-mono text-neutral-900">{miterAngle}°</span>
            </label>
            <input
              type="range"
              min={5}
              max={45}
              step={1}
              value={miterAngle}
              onChange={e => setMiterAngle(parseInt(e.target.value, 10) || 45)}
              className="mt-3 w-full accent-neutral-900"
            />
            <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
              <span>5°</span>
              <span>45°</span>
            </div>
          </div>
        )}

        {style === 'chamfer' && (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
            <label className="flex items-center justify-between text-xs font-semibold text-neutral-700">
              Chamfer depth
              <span className="font-mono text-neutral-900">{chamferDepth.toFixed(1)} mm</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={chamferDepth}
              onChange={e => setChamferDepth(parseFloat(e.target.value) || 1.5)}
              className="mt-3 w-full accent-neutral-900"
            />
            <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
              <span>0.5 mm</span>
              <span>5 mm</span>
            </div>
          </div>
        )}

        <SheetFooter className="mt-6 flex-row items-center justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply(buildEndCutConfig(endCut.id, endCut.endIndex, style, miterAngle, chamferDepth))
              onClose()
            }}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
