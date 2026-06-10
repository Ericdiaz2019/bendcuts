'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { formatLength, type DisplayUnit } from '@/lib/configure/displayUnit'
import type { SourceUnits } from '@/lib/cad/rescaleAnalysis'
import type { CADAnalysis } from '@/lib/types/configuration'

interface UnitConfirmOverlayProps {
  analysis: CADAnalysis
  unit: DisplayUnit
  onUnitChange: (unit: DisplayUnit) => void
  /** Called with the user-confirmed DRAWING units — rescales the analysis. */
  onConfirmSourceUnits?: (units: SourceUnits) => void
}

const MM_PER_INCH = 25.4

/**
 * SendCutSend-style "Confirm drawing units" panel, shown for DXF / DWG-derived
 * previews where file metadata is unreliable and units are guessed from size.
 *
 * Unlike a display-unit toggle, confirming here changes what the numbers MEAN:
 * picking a unit different from the parser's guess rescales the entire
 * analysis (dimensions, quote length) by 25.4×. Because that affects pricing,
 * the prompt shows once per uploaded file rather than once per browser.
 */
export default function UnitConfirmOverlay({
  analysis,
  unit,
  onUnitChange,
  onConfirmSourceUnits,
}: UnitConfirmOverlayProps) {
  const detected: DisplayUnit = analysis.originalUnits === 'inch' ? 'in' : 'mm'
  const [visible, setVisible] = useState(false)
  const [choice, setChoice] = useState<DisplayUnit>(detected)

  // Only meaningful for low-confidence sources (DXF / DWG-converted-to-DXF).
  const eligible =
    (analysis.sourceFormat === 'dxf' || analysis.sourceFormat === 'dwg') &&
    analysis.previewKind === 'mesh3d' &&
    // Once units are user-confirmed (or otherwise certain), stop asking.
    (analysis.unitConfidence ?? 0) < 1

  useEffect(() => {
    if (!eligible) {
      setVisible(false)
      return
    }
    setVisible(true)
    setChoice(analysis.originalUnits === 'inch' ? 'in' : 'mm')
    // Re-arm per file: a new upload gets its own confirmation.
  }, [eligible, analysis.fileHash, analysis.originalUnits])

  if (!eligible || !visible) return null

  const bbox = analysis.boundingBox
  // Preview the dimensions under the selected hypothesis. Stored values are mm
  // under the parser's assumption; flipping the assumption scales by 25.4.
  const factor =
    choice === detected ? 1 : choice === 'in' ? MM_PER_INCH : 1 / MM_PER_INCH
  const widthMm = (bbox?.size?.x ?? 0) * factor
  const heightMm = (bbox?.size?.y ?? 0) * factor

  const confirm = () => {
    if (choice !== detected) {
      onConfirmSourceUnits?.(choice === 'in' ? 'inch' : 'millimeter')
    } else {
      onConfirmSourceUnits?.(detected === 'in' ? 'inch' : 'millimeter')
    }
    onUnitChange(choice)
    setVisible(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto absolute right-4 top-1/2 z-20 w-64 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-xl shadow-neutral-900/10 backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute right-2 top-2 rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="Close unit confirmation"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="text-sm font-semibold text-neutral-900">Confirm drawing units</div>
      <div className="mt-1 text-xs text-neutral-500">
        Your part would measure{' '}
        <span className="font-medium text-neutral-900">
          {formatLength(widthMm, choice)} × {formatLength(heightMm, choice)}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <UnitRadio
          label="INCH"
          checked={choice === 'in'}
          onChange={() => setChoice('in')}
        />
        <UnitRadio
          label="MM"
          checked={choice === 'mm'}
          onChange={() => setChoice('mm')}
        />
      </div>

      <button
        type="button"
        onClick={confirm}
        className="mt-4 w-full rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-700"
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
    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold tracking-wide text-neutral-700">
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
          checked ? 'border-neutral-900' : 'border-neutral-300'
        } transition`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-neutral-900" />}
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
