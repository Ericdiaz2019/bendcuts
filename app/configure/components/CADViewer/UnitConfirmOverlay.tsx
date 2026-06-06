'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { formatLength, type DisplayUnit } from '@/lib/configure/displayUnit'
import type { CADAnalysis } from '@/lib/types/configuration'

interface UnitConfirmOverlayProps {
  analysis: CADAnalysis
  unit: DisplayUnit
  onUnitChange: (unit: DisplayUnit) => void
}

const DISMISS_KEY = 'tubebend.cadviewer.unitConfirmDismissed.v1'
const DEFAULT_KEY = 'tubebend.cadviewer.unitConfirmSetDefault.v1'

/**
 * SendCutSend-style "Confirm drawing units" panel. Shown for DXF / DWG-derived
 * previews where the file metadata is unreliable. Once the user confirms (or
 * dismisses), it stays hidden for subsequent uploads in this browser unless
 * they re-trigger by clearing storage.
 */
export default function UnitConfirmOverlay({
  analysis,
  unit,
  onUnitChange,
}: UnitConfirmOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [setAsDefault, setSetAsDefault] = useState(true)

  // Only meaningful for low-confidence sources (DXF / DWG-converted-to-DXF).
  const eligible =
    (analysis.sourceFormat === 'dxf' || analysis.sourceFormat === 'dwg') &&
    analysis.previewKind === 'mesh3d'

  useEffect(() => {
    if (!eligible) return
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return
    setVisible(true)
  }, [eligible, analysis.fileHash])

  if (!eligible || !visible) return null

  const bbox = analysis.boundingBox
  const widthMm = bbox?.size?.x ?? 0
  const heightMm = bbox?.size?.y ?? 0

  const dismiss = () => {
    if (setAsDefault && typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1')
      window.localStorage.setItem(DEFAULT_KEY, unit)
    }
    setVisible(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto absolute right-4 top-1/2 z-20 w-64 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label="Close unit confirmation"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="text-sm font-semibold text-slate-900">Confirm drawing units</div>
      <div className="mt-1 text-xs text-slate-500">
        {formatLength(widthMm, unit)} × {formatLength(heightMm, unit)}
      </div>

      <div className="mt-4 space-y-2">
        <UnitRadio
          label="INCH"
          checked={unit === 'in'}
          onChange={() => onUnitChange('in')}
        />
        <UnitRadio
          label="MM"
          checked={unit === 'mm'}
          onChange={() => onUnitChange('mm')}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <input
          type="checkbox"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        Set as default units
      </label>

      <button
        type="button"
        onClick={dismiss}
        className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
      >
        Confirm
      </button>
    </motion.div>
  )
}

function UnitRadio({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold tracking-wide text-slate-700">
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
          checked ? 'border-blue-600' : 'border-slate-300'
        } transition`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-blue-600" />}
      </span>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  )
}
