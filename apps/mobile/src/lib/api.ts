import { env } from './env'
import { tokenStore } from './secure-store'

type ErrorEnvelope = {
  error?: { code?: string; message?: string; details?: unknown }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let accessToken: string | null = null
let refreshToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function getRefreshToken(): string | null {
  return refreshToken
}

export async function hydrateTokens(): Promise<boolean> {
  const tokens = await tokenStore.load()
  accessToken = tokens.accessToken
  refreshToken = tokens.refreshToken
  return Boolean(accessToken && refreshToken)
}

export async function persistSession(tokens: {
  accessToken: string
  refreshToken: string
}): Promise<void> {
  accessToken = tokens.accessToken
  refreshToken = tokens.refreshToken
  await tokenStore.save(tokens)
}

export async function clearSession(): Promise<void> {
  accessToken = null
  refreshToken = null
  await tokenStore.clear()
}

async function performRefresh(): Promise<boolean> {
  if (!refreshToken) return false
  try {
    const response = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) {
      await clearSession()
      return false
    }
    const payload = (await response.json()) as {
      data: { accessToken: string; refreshToken: string }
    }
    await persistSession(payload.data)
    return true
  } catch {
    return false
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const headers = new Headers(init.headers)
  if (!isFormData && init.body !== undefined) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'Permintaan melebihi batas waktu. Coba lagi.')
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Tidak dapat terhubung ke server. Periksa jaringan.')
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 401 && allowRefresh) {
    const refreshed = await refreshOnce()
    if (refreshed) return apiRequest<T>(path, init, false)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let body: unknown = null
  if (text.length > 0) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const envelope = (body ?? {}) as ErrorEnvelope
    throw new ApiError(
      response.status,
      envelope.error?.code ?? 'REQUEST_FAILED',
      envelope.error?.message ?? 'Permintaan gagal diproses.',
      envelope.error?.details,
    )
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

export type Paginated<T> = {
  data: T[]
  meta: { page: number; perPage: number; total: number; totalPages: number }
}

export async function apiRequestPaginated<T>(
  path: string,
  init: RequestInit = {},
): Promise<Paginated<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${env.apiUrl}${path}`, { ...init, headers, signal: controller.signal })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Tidak dapat terhubung ke server. Periksa jaringan.')
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 401) {
    const refreshed = await refreshOnce()
    if (refreshed) return apiRequestPaginated<T>(path, init)
  }

  const body = (await response.json().catch(() => null)) as {
    data?: T[]
    meta?: Paginated<T>['meta']
    error?: ErrorEnvelope['error']
  } | null

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? 'Permintaan gagal diproses.',
      body?.error?.details,
    )
  }

  return {
    data: body?.data ?? [],
    meta: body?.meta ?? { page: 1, perPage: 20, total: 0, totalPages: 0 },
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Terjadi kendala. Coba lagi.'
}
