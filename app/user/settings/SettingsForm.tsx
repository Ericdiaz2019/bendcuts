'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Check, Loader2, Settings as SettingsIcon, Sliders } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import { updatePreferencesAction, type UserPreferences } from './actions'
import { easeOut } from '@/app/configure/components/motion'

const DEFAULT: UserPreferences = {
  notifications: {
    email: true,
    sms: false,
    orderUpdates: true,
    marketing: false,
    quotes: true,
  },
  defaults: {
    rushOrder: false,
    finishing: 'none',
    quantity: 1,
  },
  ui: {
    theme: 'system',
    language: 'en',
    currency: 'USD',
  },
}

export function SettingsForm({ initial }: { initial: Partial<UserPreferences> }) {
  const merged: UserPreferences = {
    notifications: { ...DEFAULT.notifications, ...(initial.notifications ?? {}) },
    defaults: { ...DEFAULT.defaults, ...(initial.defaults ?? {}) },
    ui: { ...DEFAULT.ui, ...(initial.ui ?? {}) },
  }

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setIsPending(true)
    const result = await updatePreferencesAction(new FormData(event.currentTarget))
    setIsPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="space-y-8"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Preferences saved.
          </AlertDescription>
        </Alert>
      )}

      <Section
        eyebrow="Notifications"
        title="What we email you"
        icon={<Bell className="h-4 w-4" />}
      >
        <ToggleRow
          name="notifications.orderUpdates"
          label="Order updates"
          description="Production status, shipping, and delivery."
          defaultChecked={merged.notifications.orderUpdates}
        />
        <ToggleRow
          name="notifications.quotes"
          label="Quote activity"
          description="When a saved quote nears expiry or pricing changes."
          defaultChecked={merged.notifications.quotes}
        />
        <ToggleRow
          name="notifications.email"
          label="Account email"
          description="Security alerts, password changes, and billing."
          defaultChecked={merged.notifications.email}
        />
        <ToggleRow
          name="notifications.sms"
          label="SMS alerts"
          description="Text messages for shipped orders (premium only)."
          defaultChecked={merged.notifications.sms}
        />
        <ToggleRow
          name="notifications.marketing"
          label="Marketing"
          description="Product news and material launches."
          defaultChecked={merged.notifications.marketing}
        />
      </Section>

      <Section
        eyebrow="Defaults"
        title="Pre-fill your quotes"
        icon={<Sliders className="h-4 w-4" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="quantity">Default quantity</Label>
            <Input
              id="quantity"
              name="defaults.quantity"
              type="number"
              min={1}
              max={10000}
              defaultValue={merged.defaults.quantity}
              className="mt-1.5 h-10"
            />
          </div>
          <div>
            <Label>Default finishing</Label>
            <Select name="defaults.finishing" defaultValue={merged.defaults.finishing}>
              <SelectTrigger className="mt-1.5 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="deburr">Deburr</SelectItem>
                <SelectItem value="polish">Polish</SelectItem>
                <SelectItem value="paint">Paint</SelectItem>
                <SelectItem value="powder_coat">Powder coat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ToggleRow
          name="defaults.rushOrder"
          label="Rush order by default"
          description="Mark new orders as rush unless explicitly disabled."
          defaultChecked={merged.defaults.rushOrder}
        />
      </Section>

      <Section
        eyebrow="Display"
        title="Interface preferences"
        icon={<SettingsIcon className="h-4 w-4" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Theme</Label>
            <Select name="ui.theme" defaultValue={merged.ui.theme}>
              <SelectTrigger className="mt-1.5 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language</Label>
            <Select name="ui.language" defaultValue={merged.ui.language}>
              <SelectTrigger className="mt-1.5 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Currency</Label>
            <Select name="ui.currency" defaultValue={merged.ui.currency}>
              <SelectTrigger className="mt-1.5 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save preferences'
          )}
        </Button>
      </div>
    </motion.form>
  )
}

function Section({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            {eyebrow}
          </div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        </div>
      </div>
      <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {children}
      </div>
    </section>
  )
}

function ToggleRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string
  label: string
  description: string
  defaultChecked: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Switch name={name} defaultChecked={defaultChecked} />
    </div>
  )
}
