'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

type ActionResult = { ok: true; id: string } | { ok: false; error: string }

export async function createProjectAction(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null

  if (!name) return { ok: false, error: 'Name is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: user.id, name, description })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Could not create project.' }

  await supabase.from('activity_log').insert({
    user_id: user.id,
    type: 'project_created',
    title: `Project "${name}" created`,
    description: description ?? null,
    related_project_id: data.id,
  })

  revalidatePath('/user/projects')
  revalidatePath('/user/dashboard')
  return { ok: true, id: data.id }
}
