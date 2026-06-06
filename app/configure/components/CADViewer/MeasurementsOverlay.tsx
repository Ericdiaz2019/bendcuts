'use client'

import { useMemo } from 'react'
import { Ruler } from 'lucide-react'

import type { CADAnalysis } from '@/lib/types/configuration'
import { formatLength, type DisplayUnit } from '@/lib/configure/displayUnit'

interface MeasurementsOverlayProps {
  analysis: CADAnalysis
  unit: DisplayUnit
}

/**
 * Pinned bottom-left dimension card inside the 3D canvas.
 *
 * Why a card instead of dim-arrow callouts on the model: arrows fight the
 * camera at every angle and need re-rendering on every orbit. A corner card
 * gives the engineer the same three numbers (L × W × H) at a glance and
 * stays legible regardless of the part's orientation in the viewport.
 *
 * Dimensions are sorted longest→shortest so the "length" label is always
 * the part's defining dimension regardless of which axis the file used.
 */
export default function MeasurementsOverlay({ analysis, unit }: MeasurementsOverlayProps) {
  const dims = useMemo(() => {
    const sizeMm = [
      analysis.boundingBox.size.x,
      analysis.boundingBox.size.y,
      analysis.boundingBox.size.z,
    ].sort((a, b) => b - a)
    const [length, width, thickness] = sizeMm
    return { length, width, thickness }
  }, [analysis.boundingBox.size.x, analysis.boundingBox.size.y, analysis.boundingBox.size.z])

  if (dims.length <= 0) return null

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20 sm:bottom-4 sm:left-4">
      <div className="pointer-events-auto inline-flex flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <Ruler className="h-3 w-3" />
          Bounding box
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DimReadout label="Length" value={formatLength(dims.length, unit)} />
          <DimReadout label="Width" value={formatLength(dims.width, unit)} />
          <DimReadout label="Thickness" value={formatLength(dims.thickness, unit)} />
        </div>
      </div>
    </div>
  )
}

function DimReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[60px] flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  )
}
