'use client'

import { useEffect, useState } from 'react'

export type DisplayUnit = 'mm' | 'in'

const STORAGE_KEY = 'tubebend.displayUnit.v1'
const EVENT_NAME = 'tubebend:display-unit-change'

function readStored(): DisplayUnit {
  if (typeof window === 'undefined') return 'mm'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'in' ? 'in' : 'mm'
}

/**
 * Shared display-unit hook backed by localStorage. Toggling from any subscriber
 * dispatches a custom event that re-renders every other subscriber, so the 3D
 * viewer toolbar, stats panel, feature list, and measurement overlay all stay
 * in lockstep without prop-drilling a context boundary through five layers.
 */
export function useDisplayUnit(): [DisplayUnit, (unit: DisplayUnit) => void] {
  const [unit, setUnitState] = useState<DisplayUnit>('mm')

  useEffect(() => {
    setUnitState(readStored())

    const onChange = () => setUnitState(readStored())
    window.addEventListener(EVENT_NAME, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(EVENT_NAME, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const setUnit = (next: DisplayUnit) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(new Event(EVENT_NAME))
  }

  return [unit, setUnit]
}

const MM_PER_INCH = 25.4

/** Format a mm scalar in the active unit. Compact, decimals match shop expectations. */
export function formatLength(mm: number, unit: DisplayUnit): string {
  if (unit === 'in') {
    const inches = mm / MM_PER_INCH
    if (inches >= 12) return `${(inches / 12).toFixed(2)} ft`
    return `${inches.toFixed(3)}″`
  }
  if (mm >= 1000) return `${(mm / 1000).toFixed(2)} m`
  if (mm >= 100) return `${(mm / 10).toFixed(1)} cm`
  return `${mm.toFixed(1)} mm`
}

/** Compact diameter formatter — pairs better with "Ø" prefix. */
export function formatDiameter(mm: number, unit: DisplayUnit): string {
  if (unit === 'in') return `${(mm / MM_PER_INCH).toFixed(3)}″`
  return `${mm.toFixed(2)} mm`
}
