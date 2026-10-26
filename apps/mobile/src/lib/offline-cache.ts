import AsyncStorage from '@react-native-async-storage/async-storage'
import { ApiError } from './api'

const PREFIX = 'pjok.offline.'
let cacheOwner: string | null = null
let cacheVersion = 0

export function setOfflineCacheOwner(owner: string | null): void {
  cacheOwner = owner
  cacheVersion += 1
}

export type OfflineInfo = { cachedAt: string }
export type OfflineCapable<T> = T & { offline: OfflineInfo | null }

type CacheRecord<T> = { savedAt: string; data: T }

function cacheKey(key: string): string {
  return `${PREFIX}${cacheOwner ?? 'public'}:${key}`
}

export async function readOfflineCache<T>(key: string): Promise<CacheRecord<T> | null> {
  if (!cacheOwner && !key.startsWith('instruments')) return null
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheRecord<T>
    if (!parsed || typeof parsed.savedAt !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export async function writeOfflineCache<T>(key: string, data: T): Promise<void> {
  if (!cacheOwner && !key.startsWith('instruments')) return
  try {
    const record: CacheRecord<T> = { savedAt: new Date().toISOString(), data }
    await AsyncStorage.setItem(cacheKey(key), JSON.stringify(record))
  } catch {
    // Cache lokal bersifat best-effort; kegagalan menulis tidak boleh menggagalkan permintaan.
  }
}

export async function removeOfflineCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(key))
}

export async function clearOfflineCache(): Promise<void> {
  cacheVersion += 1
  try {
    const keys = await AsyncStorage.getAllKeys()
    const cacheKeys = keys.filter((key) => key.startsWith(PREFIX) || key.startsWith('pjok.draft.'))
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys)
  } catch {
    // Mengabaikan kegagalan pembersihan cache lokal.
  }
}

export async function fetchWithOfflineCache<T extends object>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<OfflineCapable<T>> {
  const version = cacheVersion
  try {
    const data = await fetcher()
    if (version === cacheVersion) await writeOfflineCache(key, data)
    return { ...data, offline: null }
  } catch (error) {
    const isOffline = error instanceof ApiError && error.status === 0
    if (!isOffline) throw error
    const cached = version === cacheVersion ? await readOfflineCache<T>(key) : null
    if (!cached) throw error
    return { ...cached.data, offline: { cachedAt: cached.savedAt } }
  }
}

export function offlineInfo(...values: Array<{ offline: OfflineInfo | null } | undefined>) {
  for (const value of values) {
    if (value?.offline) return value.offline
  }
  return null
}
