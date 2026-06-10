'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Lock } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { detectCardBrand, type CardBrand, type NewCardInput } from '@/lib/payments/provider'

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  diners: 'Diners',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  unknown: '',
}

const BRAND_GRADIENT: Record<CardBrand, string> = {
  visa: 'from-blue-600 to-indigo-600',
  mastercard: 'from-orange-500 to-red-500',
  amex: 'from-cyan-500 to-blue-500',
  discover: 'from-amber-500 to-orange-500',
  diners: 'from-neutral-700 to-neutral-900',
  jcb: 'from-emerald-600 to-teal-600',
  unionpay: 'from-red-600 to-fuchsia-600',
  unknown: 'from-neutral-700 to-neutral-900',
}

function formatCardNumber(value: string, brand: CardBrand): string {
  const digits = value.replace(/\D/g, '').slice(0, brand === 'amex' ? 15 : 19)
  if (brand === 'amex') {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' '),
    )
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`
}

export interface EmulatedCardValue {
  card: NewCardInput | null
  isValid: boolean
}

export function EmulatedCardInput({
  onChange,
}: {
  onChange: (value: EmulatedCardValue) => void
}) {
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [zip, setZip] = useState('')
  const [name, setName] = useState('')

  const brand = useMemo(() => detectCardBrand(number), [number])

  useEffect(() => {
    const digits = number.replace(/\D/g, '')
    const expDigits = expiry.replace(/\D/g, '')
    const expMonth = expDigits.length >= 2 ? Number(expDigits.slice(0, 2)) : 0
    const expYearShort = expDigits.length === 4 ? Number(expDigits.slice(2)) : 0
    const expYear = expYearShort ? 2000 + expYearShort : 0

    // Emulator-friendly validation — length + plausible expiry, no Luhn.
    // (Stripe's PaymentElement does the real validation in production.)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const isValid =
      digits.length >= 13 &&
      digits.length <= 19 &&
      expMonth >= 1 &&
      expMonth <= 12 &&
      (expYear > currentYear || (expYear === currentYear && expMonth >= currentMonth)) &&
      cvc.length >= 3

    onChange({
      isValid,
      card: isValid
        ? { number: digits, expMonth, expYear, cvc, zip: zip || undefined, name: name || undefined }
        : null,
    })
  }, [number, expiry, cvc, zip, name, onChange])

  return (
    <div className="space-y-3">
      {/* Visual card preview */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md ${BRAND_GRADIENT[brand]}`}
      >
        <div className="flex items-start justify-between">
          <CreditCard className="h-6 w-6 opacity-80" />
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {BRAND_LABEL[brand] || 'CARD'}
          </span>
        </div>
        <div className="mt-6 font-mono text-base tracking-[0.2em]">
          {number.replace(/\d/g, '•').padEnd(19, '•').slice(0, 19) || '•••• •••• •••• ••••'}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wider opacity-80">
          <span className="truncate">{name || 'CARDHOLDER NAME'}</span>
          <span>{expiry || 'MM / YY'}</span>
        </div>
      </div>

      <div>
        <Label htmlFor="card-number" className="text-xs text-neutral-700">
          Card number
        </Label>
        <div className="relative mt-1">
          <Input
            id="card-number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={number}
            onChange={e => setNumber(formatCardNumber(e.target.value, detectCardBrand(e.target.value)))}
            className="h-10 pl-3 pr-9 font-mono"
          />
          <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="card-expiry" className="text-xs text-neutral-700">
            Expiry
          </Label>
          <Input
            id="card-expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={expiry}
            onChange={e => setExpiry(formatExpiry(e.target.value))}
            className="mt-1 h-10 font-mono"
          />
        </div>
        <div>
          <Label htmlFor="card-cvc" className="text-xs text-neutral-700">
            CVC
          </Label>
          <Input
            id="card-cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3))}
            className="mt-1 h-10 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="card-name" className="text-xs text-neutral-700">
            Cardholder name
          </Label>
          <Input
            id="card-name"
            autoComplete="cc-name"
            placeholder="Optional"
            value={name}
            onChange={e => setName(e.target.value.toUpperCase())}
            className="mt-1 h-10"
          />
        </div>
        <div>
          <Label htmlFor="card-zip" className="text-xs text-neutral-700">
            ZIP
          </Label>
          <Input
            id="card-zip"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Optional"
            value={zip}
            onChange={e => setZip(e.target.value.slice(0, 10))}
            className="mt-1 h-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500">
        <span>
          Test mode — any 13–19 digit number works. No real charges.
        </span>
        <button
          type="button"
          onClick={() => {
            setNumber(formatCardNumber('4242424242424242', 'visa'))
            const futureYear = String((new Date().getFullYear() + 4) % 100).padStart(2, '0')
            setExpiry(`12 / ${futureYear}`)
            setCvc('123')
            setName(prev => prev || 'TEST USER')
          }}
          className="shrink-0 rounded-md bg-white px-2 py-1 font-medium text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-100"
        >
          Use test card
        </button>
      </div>
    </div>
  )
}
