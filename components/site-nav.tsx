'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Menu, Wrench, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#capabilities', label: 'Capabilities' },
  { href: '/#materials', label: 'Materials' },
  { href: '/contact', label: 'Contact' },
] as const

function isActive(pathname: string, href: string) {
  if (href.startsWith('/#')) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function SiteNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled || mobileOpen
          ? 'border-b border-stone-200 bg-white/95 backdrop-blur'
          : 'border-b border-transparent bg-stone-50/80 backdrop-blur'
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-900">
              <Wrench className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-stone-900">
              TubeBend
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map(link => {
              const active = isActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium ${
                    active
                      ? 'text-amber-700 hover:text-amber-800'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Get a quote
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setMobileOpen(v => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className="border-t border-stone-200 bg-white md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV_LINKS.map(link => {
              const active = isActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-3 text-base font-medium hover:bg-stone-50 ${
                    active ? 'text-amber-700' : 'text-stone-700'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="my-2 h-px bg-stone-200" />
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-3 text-base font-medium text-stone-700 hover:bg-stone-50"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setMobileOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-900 px-4 py-3 text-base font-semibold text-white"
            >
              Get a quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
