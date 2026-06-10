'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Boxes, ChevronDown, CreditCard, FolderKanban, Settings, ShoppingBag, User as UserIcon } from 'lucide-react'

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
  { href: '/user/projects', label: 'Projects', icon: FolderKanban },
  { href: '/user/orders', label: 'Orders', icon: ShoppingBag },
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
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-neutral-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
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
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-2.5 text-neutral-900 transition hover:bg-neutral-100">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-neutral-900 text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3 w-3 text-neutral-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium text-neutral-900">
                {firstName || lastName ? `${firstName ?? ''} ${lastName ?? ''}`.trim() : 'Account'}
              </div>
              <div className="text-xs font-normal text-neutral-500">{email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/user/profile" className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/user/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/user/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutButton className="inline-flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-red-600 hover:bg-neutral-100" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
