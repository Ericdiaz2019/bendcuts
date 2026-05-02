import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const ALLOWED_REDIRECT_PREFIXES = ['/user', '/admin', '/configure', '/auth']

function safeRedirect(next: string | null, origin: string): string {
  const fallback = '/user/dashboard'
  if (!next) return fallback
  try {
    const candidate = new URL(next, origin)
    if (candidate.origin !== origin) return fallback
    const path = candidate.pathname
    if (!ALLOWED_REDIRECT_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))) {
      return fallback
    }
    return path + candidate.search + candidate.hash
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const safeNext = safeRedirect(searchParams.get('next'), origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  const error = searchParams.get('error_description') ?? 'Could not verify your link.'
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}`)
}
