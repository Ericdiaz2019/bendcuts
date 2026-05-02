'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircle2,
  FileUp,
  FolderKanban,
  Package,
  Quote,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

import { easeOut } from '@/app/configure/components/motion'
import type { Tables } from '@/lib/types/supabase'

type Activity = Tables<'activity_log'>

const ICON: Record<Activity['type'], { icon: LucideIcon; gradient: string }> = {
  project_created: { icon: FolderKanban, gradient: 'from-violet-600 to-fuchsia-500' },
  project_updated: { icon: FolderKanban, gradient: 'from-violet-600 to-fuchsia-500' },
  order_placed: { icon: Package, gradient: 'from-blue-600 to-cyan-500' },
  order_saved: { icon: Quote, gradient: 'from-slate-700 to-slate-900' },
  order_shipped: { icon: Truck, gradient: 'from-emerald-500 to-teal-500' },
  quote_generated: { icon: Quote, gradient: 'from-cyan-500 to-teal-500' },
  payment_succeeded: { icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500' },
  payment_failed: { icon: XCircle, gradient: 'from-rose-500 to-orange-500' },
  file_uploaded: { icon: FileUp, gradient: 'from-blue-600 to-cyan-500' },
  file_deleted: { icon: FileUp, gradient: 'from-slate-500 to-slate-700' },
}

export function ActivityFeed({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-medium text-slate-700">No activity yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Upload a file or save a quote to see updates here.
        </p>
      </div>
    )
  }

  return (
    <motion.ul
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-3"
    >
      {activity.map(item => {
        const config = ICON[item.type]
        const Icon = config.icon
        return (
          <motion.li
            key={item.id}
            variants={{
              initial: { opacity: 0, x: -8 },
              animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: easeOut } },
            }}
            className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${config.gradient}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
              {item.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.description}</p>
              )}
            </div>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
