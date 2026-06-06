/**
 * Client-side cache for a CAD file an anonymous user configured before signing in.
 *
 * The order intent (material, quantity, quote, file metadata) is small and rides
 * along in sessionStorage as JSON. The file BINARY cannot be JSON-serialized, so
 * we stash it here — IndexedDB structured-clones Blob/File natively — keyed by the
 * order's idempotencyKey. After the user authenticates, PendingOrderClaimer reads
 * it back, uploads it to Supabase Storage (now that storage RLS will accept the
 * owner-prefixed path), and deletes the cached copy.
 *
 * Everything is best-effort: any failure resolves to null/no-op rather than
 * throwing, so a browser without IndexedDB simply degrades to "re-upload your file".
 */

const DB_NAME = 'tubebend'
const STORE = 'pendingFiles'
const DB_VERSION = 1
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // prune entries older than 7 days

interface CachedRecord {
  name: string
  type: string
  lastModified: number
  blob: Blob
  savedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

/** Best-effort prune of entries older than MAX_AGE_MS so the store can't grow unbounded. */
async function pruneOldEntries(db: IDBDatabase): Promise<void> {
  await new Promise<void>(resolve => {
    try {
      const cutoff = Date.now() - MAX_AGE_MS
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (!cursor) return
        const rec = cursor.value as CachedRecord | undefined
        if (!rec || typeof rec.savedAt !== 'number' || rec.savedAt < cutoff) {
          cursor.delete()
        }
        cursor.continue()
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}

export async function savePendingFile(key: string, file: File): Promise<boolean> {
  if (!key) return false
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    return false
  }
  try {
    await pruneOldEntries(db)
    const record: CachedRecord = {
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      blob: file,
      savedAt: Date.now(),
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(record, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    return true
  } catch {
    return false
  } finally {
    db.close()
  }
}

export async function loadPendingFile(key: string): Promise<File | null> {
  if (!key) return null
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    return null
  }
  try {
    const rec = await new Promise<CachedRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as CachedRecord | undefined)
      req.onerror = () => reject(req.error)
    })
    if (!rec || !rec.blob) return null
    return new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.lastModified })
  } catch {
    return null
  } finally {
    db.close()
  }
}

export async function deletePendingFile(key: string): Promise<void> {
  if (!key) return
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    return
  }
  try {
    await new Promise<void>(resolve => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    })
  } finally {
    db.close()
  }
}
