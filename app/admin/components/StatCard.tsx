'use client'

import { useEffect, useRef, useState } from 'react'
import { animate as motionAnimate, motion, useInView, useMotionValue } from 'framer-motion'
import {
  DollarSign,
  FolderKanban,
  Hammer,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

import { easeOut } from '@/app/configure/components/motion'

const ICONS = {
  folder: FolderKanban,
  shoppingBag: ShoppingBag,
  dollar: DollarSign,
  hammer: Hammer,
} as const

export type StatIconKey = keyof typeof ICONS

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  hint?: string
  icon: StatIconKey
  accent?: 'blue' | 'cyan' | 'emerald' | 'violet'
  delay?: number
}

const ACCENT: Record<NonNullable<StatCardProps['accent']>, { gradient: string; iconBg: string }> = {
  blue: {
    gradient: 'from-blue-600 to-cyan-500',
    iconBg: 'bg-gradient-to-br from-blue-600 to-cyan-500',
  },
  cyan: {
    gradient: 'from-cyan-500 to-teal-500',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-500',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
  },
  violet: {
    gradient: 'from-violet-600 to-fuchsia-500',
    iconBg: 'bg-gradient-to-br from-violet-600 to-fuchsia-500',
  },
}

export function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  hint,
  icon,
  accent = 'blue',
  delay = 0,
}: StatCardProps) {
  const Icon: LucideIcon = ICONS[icon]
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const motionValue = useMotionValue(0)
  const [text, setText] = useState(decimals > 0 ? (0).toFixed(decimals) : '0')
  const accentTheme = ACCENT[accent]

  useEffect(() => {
    if (!inView) return
    const controls = motionAnimate(motionValue, value, {
      duration: 1.2,
      ease: easeOut,
      delay,
      onUpdate: latest => {
        if (decimals > 0) setText(latest.toFixed(decimals))
        else setText(Math.floor(latest).toLocaleString())
      },
    })
    return () => controls.stop()
  }, [inView, value, decimals, delay, motionValue])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: easeOut, delay }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${accentTheme.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        {prefix && <span className="text-xl font-semibold text-slate-400">{prefix}</span>}
        <span
          className={`bg-gradient-to-r bg-clip-text text-3xl font-semibold tracking-tight text-transparent ${accentTheme.gradient}`}
        >
          {text}
        </span>
        {suffix && <span className="text-xl font-semibold text-slate-400">{suffix}</span>}
      </div>

      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}

      <div
        aria-hidden
        className={`pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity group-hover:opacity-30 ${accentTheme.gradient}`}
      />
    </motion.div>
  )
}
