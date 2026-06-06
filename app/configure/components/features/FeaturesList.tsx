'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  ChevronRight,
  Circle,
  RotateCw,
  Scissors,
  Settings2,
  X,
} from 'lucide-react'

import type { Feature, FeatureConfigMap, FeatureKind } from '@/lib/types/configuration'
import { useDisplayUnit } from '@/lib/configure/displayUnit'

import { describeFeatureDims, featureTitle } from './featureFormat'

interface FeaturesListProps {
  features: Feature[]
  configs: FeatureConfigMap
  selectedFeatureId: string | null
  onConfigure: (featureId: string) => void
  onClearConfig: (featureId: string) => void
  onSelect: (featureId: string | null) => void
  onResetAll: () => void
}

const KIND_META: Record<FeatureKind, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  bend: { label: 'Bends', Icon: RotateCw },
  hole: { label: 'Holes', Icon: Circle },
  'end-cut': { label: 'End cuts', Icon: Scissors },
}

const GROUP_ORDER: FeatureKind[] = ['bend', 'hole', 'end-cut']

export default function FeaturesList({
  features,
  configs,
  selectedFeatureId,
  onConfigure,
  onClearConfig,
  onSelect,
  onResetAll,
}: FeaturesListProps) {
  const [unit] = useDisplayUnit()
  // Keyboard nav — ↑/↓ cycle through features, Enter opens the active one, Esc deselects.
  // Ignore when focus is on a form element so we don't fight inputs/textareas.
  useEffect(() => {
    if (features.length === 0) return

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = selectedFeatureId
          ? features.findIndex(f => f.id === selectedFeatureId)
          : -1
        const next =
          e.key === 'ArrowDown'
            ? (idx + 1) % features.length
            : (idx <= 0 ? features.length : idx) - 1
        onSelect(features[next].id)
      } else if (e.key === 'Enter' && selectedFeatureId) {
        e.preventDefault()
        onConfigure(selectedFeatureId)
      } else if (e.key === 'Escape') {
        onSelect(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [features, selectedFeatureId, onSelect, onConfigure])

  if (features.length === 0) {
    return null
  }

  // Group features by kind, preserving detection order within each group.
  const grouped: Record<FeatureKind, Feature[]> = { bend: [], hole: [], 'end-cut': [] }
  for (const f of features) grouped[f.kind].push(f)

  const configuredCount = Object.keys(configs).length

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Detected features
        </div>
        {configuredCount > 0 && (
          <button
            type="button"
            onClick={onResetAll}
            className="text-[10px] font-medium uppercase tracking-wider text-slate-400 transition hover:text-rose-600"
          >
            Reset all
          </button>
        )}
      </div>

      <div className="space-y-3">
        {GROUP_ORDER.map(kind => {
          const items = grouped[kind]
          if (items.length === 0) return null
          const { label, Icon } = KIND_META[kind]
          return (
            <section
              key={kind}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                <Icon className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">{label}</span>
                <span className="rounded-full bg-slate-200/70 px-1.5 py-px text-[10px] font-semibold text-slate-600">
                  {items.length}
                </span>
              </header>
              <ul className="divide-y divide-slate-100">
                {items.map((feature, idx) => {
                  const cfg = configs[feature.id]
                  const isSelected = selectedFeatureId === feature.id
                  return (
                    <li key={feature.id}>
                      <FeatureRow
                        feature={feature}
                        index={idx}
                        config={cfg}
                        selected={isSelected}
                        unit={unit}
                        onConfigure={() => onConfigure(feature.id)}
                        onClearConfig={() => onClearConfig(feature.id)}
                        onHover={() => onSelect(feature.id)}
                        onLeave={() => onSelect(null)}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

interface FeatureRowProps {
  feature: Feature
  index: number
  config: FeatureConfigMap[string] | undefined
  selected: boolean
  unit: 'mm' | 'in'
  onConfigure: () => void
  onClearConfig: () => void
  onHover: () => void
  onLeave: () => void
}

function FeatureRow({
  feature,
  index,
  config,
  selected,
  unit,
  onConfigure,
  onClearConfig,
  onHover,
  onLeave,
}: FeatureRowProps) {
  const configured = Boolean(config)
  const dims = describeFeatureDims(feature, unit)
  const title = featureTitle(feature, index)

  return (
    <motion.div
      onHoverStart={onHover}
      onHoverEnd={onLeave}
      animate={{
        backgroundColor: selected ? 'rgb(241 245 249)' : 'rgb(255 255 255)',
      }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 px-3 py-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-900">{title}</span>
          {feature.estimated && (
            <span
              title="Dimension inferred — confirm with shop"
              className="rounded-full bg-amber-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-700"
            >
              est.
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-slate-500">{dims}</div>
        {configured && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" strokeWidth={3} />
            {config!.summary}
            {config!.costDeltaPerPart > 0 && (
              <span className="text-emerald-600/80">
                +${config!.costDeltaPerPart.toFixed(2)}/ea
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {configured && (
          <button
            type="button"
            onClick={onClearConfig}
            aria-label="Remove configuration"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onConfigure}
          className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition ${
            configured
              ? 'text-slate-700 hover:bg-slate-100'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <Settings2 className="h-3 w-3" />
          {configured ? 'Edit' : 'Configure'}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}
