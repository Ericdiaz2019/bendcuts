export async function computeFileHash(file: File): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return undefined

  try {
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return undefined
  }
}
