'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, FileText, FolderKanban, Package } from 'lucide-react'

import { easeOut } from '@/app/configure/components/motion'
import type { Tables, Enums } from '@/lib/types/supabase'

type ProjectWithCounts = Tables<'projects'> & {
  fileCount: number
  orderCount: number
}

const STATUS_STYLES: Record<Enums<'project_status'>, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  ready: { label: 'Ready', className: 'bg-blue-100 text-blue-700' },
  quoted: { label: 'Quoted', className: 'bg-cyan-100 text-cyan-700' },
  ordered: { label: 'Ordered', className: 'bg-violet-100 text-violet-700' },
  in_production: { label: 'In production', className: 'bg-amber-100 text-amber-700' },
  shipped: { label: 'Shipped', className: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700' },
  archived: { label: 'Archived', className: 'bg-slate-100 text-slate-500' },
}

export function ProjectsGrid({ projects }: { projects: ProjectWithCounts[] }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {projects.map(project => {
        const status = STATUS_STYLES[project.status]
        return (
          <motion.div
            key={project.id}
            variants={{
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
            }}
            whileHover={{ y: -3 }}
          >
            <Link
              href="/user/projects"
              className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${status.className}`}
                >
                  {status.label}
                </span>
              </div>

              <h3 className="mt-4 truncate text-sm font-semibold text-slate-900">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.description}</p>
              )}

              <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {project.fileCount} file{project.fileCount === 1 ? '' : 's'}
                </span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {project.orderCount} order{project.orderCount === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
              </div>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
