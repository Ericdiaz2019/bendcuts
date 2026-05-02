'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, FileUp, FolderKanban, ShoppingBag } from 'lucide-react'

import { easeOut } from '@/app/configure/components/motion'

const ACTIONS = [
  {
    href: '/configure',
    title: 'Upload a CAD file',
    description: 'Drop a STEP, IGES, or DXF file and get an instant quote.',
    icon: FileUp,
    accent: 'from-blue-600 to-cyan-500',
  },
  {
    href: '/user/projects',
    title: 'Browse projects',
    description: 'Pick up where you left off — drafts, quotes, and ordered parts.',
    icon: FolderKanban,
    accent: 'from-violet-600 to-fuchsia-500',
  },
  {
    href: '/user/orders',
    title: 'View orders',
    description: 'Track production status and download invoices.',
    icon: ShoppingBag,
    accent: 'from-emerald-500 to-teal-500',
  },
]

export function QuickActions() {
  return (
    <motion.div
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.07 } } }}
      className="grid gap-3 sm:grid-cols-3"
    >
      {ACTIONS.map(action => {
        const Icon = action.icon
        return (
          <motion.div
            key={action.href}
            variants={{
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
            }}
            whileHover={{ y: -3 }}
            className="group"
          >
            <Link
              href={action.href}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${action.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-slate-900">
                {action.title}
                <ArrowRight className="h-3.5 w-3.5 translate-x-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
              </div>
              <p className="mt-1 text-xs text-slate-500">{action.description}</p>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
