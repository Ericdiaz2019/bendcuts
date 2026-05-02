const CARRIER_PATTERNS: Array<{ match: RegExp; build: (n: string) => string; label: string }> = [
  { match: /\bups\b/i, build: n => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`, label: 'UPS' },
  { match: /\bfedex\b/i, build: n => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`, label: 'FedEx' },
  { match: /\busps\b|postal/i, build: n => `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${encodeURIComponent(n)}`, label: 'USPS' },
  { match: /\bdhl\b/i, build: n => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(n)}`, label: 'DHL' },
  { match: /\bontrac\b/i, build: n => `https://www.ontrac.com/tracking?number=${encodeURIComponent(n)}`, label: 'OnTrac' },
]

export function carrierTrackingUrl(carrier: string | null | undefined, trackingNumber: string | null | undefined): string | null {
  if (!trackingNumber) return null
  const c = (carrier ?? '').trim()
  if (!c) return null
  const match = CARRIER_PATTERNS.find(p => p.match.test(c))
  if (!match) return null
  return match.build(trackingNumber.trim())
}

export function normalizeCarrierLabel(carrier: string | null | undefined): string {
  if (!carrier) return ''
  const c = carrier.trim()
  const match = CARRIER_PATTERNS.find(p => p.match.test(c))
  return match?.label ?? c
}
