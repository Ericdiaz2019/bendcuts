'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Boxes, ChevronDown, CreditCard, FolderKanban, LayoutDashboard, ShoppingBag, User as UserIcon } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { SignOutButton } from './SignOutButton'

const NAV = [
  { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/projects', label: 'Projects', icon: FolderKanban },
  { href: '/user/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/user/billing', label: 'Billing', icon: CreditCard },
]

export function UserNav({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null
  lastName: string | null
  email: string
}) {
  const pathname = usePathname()
  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() ||
    email[0]?.toUpperCase() ||
    'U'

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md">
            <Boxes className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-base font-semibold tracking-tight">TubeBend</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-2.5 text-white transition hover:bg-white/10">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium text-slate-900">
                {firstName || lastName ? `${firstName ?? ''} ${lastName ?? ''}`.trim() : 'Account'}
              </div>
              <div className="text-xs font-normal text-slate-500">{email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/user/profile" className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/user/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutButton className="inline-flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-rose-600 hover:bg-slate-100" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
