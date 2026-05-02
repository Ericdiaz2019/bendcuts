import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/lib/types/supabase'

const PROTECTED_PREFIXES = ['/user', '/admin']
const ADMIN_PREFIX = '/admin'
const AUTH_ONLY_PATHS = ['/auth/login', '/auth/register']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAdminPath = pathname.startsWith(ADMIN_PREFIX)
  const isAuthOnly = AUTH_ONLY_PATHS.includes(pathname)

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/auth/login'
    redirect.searchParams.set('next', pathname)
    return NextResponse.redirect(redirect)
  }

  if (user && isAdminPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      // Don't reveal that /admin exists; bounce to user dashboard.
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/user/dashboard'
      redirect.search = ''
      return NextResponse.redirect(redirect)
    }
  }

  if (user && isAuthOnly) {
    const redirect = request.nextUrl.clone()
    const next = searchParams.get('next')
    redirect.pathname = next && next.startsWith('/') ? next : '/user/dashboard'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }

  return response
}
