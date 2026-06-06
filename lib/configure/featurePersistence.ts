import type { FeatureConfigMap } from '@/lib/types/configuration'

const KEY_PREFIX = 'tubebend.featureConfigs.v1'

function storageKey(fileHash: string): string {
  return `${KEY_PREFIX}:${fileHash}`
}

export function loadConfigsForFile(fileHash: string | undefined | null): FeatureConfigMap {
  if (!fileHash) return {}
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(storageKey(fileHash))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as FeatureConfigMap
  } catch {
    return {}
  }
}

export function saveConfigsForFile(
  fileHash: string | undefined | null,
  configs: FeatureConfigMap,
): void {
  if (!fileHash) return
  if (typeof window === 'undefined') return
  try {
    if (!configs || Object.keys(configs).length === 0) {
      window.localStorage.removeItem(storageKey(fileHash))
      return
    }
    window.localStorage.setItem(storageKey(fileHash), JSON.stringify(configs))
  } catch {
    // Quota/availability errors are non-fatal — persistence is best-effort.
  }
}

export async function hashFile(file: File): Promise<string> {
  // Use Web Crypto for SHA-256. Fast even on 50MB inputs; runs in a worker context too.
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
