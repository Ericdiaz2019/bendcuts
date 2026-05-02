'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'

import { addAdminNoteAction, deleteAdminNoteAction } from '@/app/admin/actions'
import { formatRelative } from '@/app/admin/lib/format'

interface Note {
  id: string
  body: string
  created_at: string
  author_id: string
  profiles?:
    | { first_name: string | null; last_name: string | null; email: string }
    | { first_name: string | null; last_name: string | null; email: string }[]
    | null
}

export function NotesPanel({ orderId, notes }: { orderId: string; notes: Note[] }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addAdminNoteAction(orderId, body)
      if (!result.ok) setError(result.error)
      else {
        setBody('')
        router.refresh()
      }
    })
  }

  function remove(noteId: string) {
    if (!confirm('Delete this note?')) return
    startTransition(async () => {
      const result = await deleteAdminNoteAction(noteId, orderId)
      if (!result.ok) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add an internal note (only admins see this)…"
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Add note
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">No internal notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map(note => {
            const author = Array.isArray(note.profiles) ? note.profiles[0] : note.profiles
            const who =
              [author?.first_name, author?.last_name].filter(Boolean).join(' ') ||
              author?.email ||
              'Admin'
            return (
              <li key={note.id} className="rounded-lg border border-amber-200/60 bg-amber-50/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                      {who} · {formatRelative(note.created_at)}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(note.id)}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-amber-100 hover:text-rose-600"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
