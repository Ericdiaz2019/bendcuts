'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, FolderKanban } from 'lucide-react'

import { easeOut } from '@/app/configure/components/motion'
import type { Tables } from '@/lib/types/supabase'

type Project = Tables<'projects'>

const STATUS_STYLES: Record<Project['status'], { label: string; className: string }> = {
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

export function RecentProjects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <FolderKanban className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-900">No projects yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Upload a CAD file to start your first project.
        </p>
        <Link
          href="/configure"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Upload a file
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-3"
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
            whileHover={{ y: -2 }}
          >
            <Link
              href={`/user/projects`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {project.name}
                    </h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  {project.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {project.description}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-700" />
              </div>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
