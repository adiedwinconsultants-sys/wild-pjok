import type { LoginInput, ProfileUpdateInput, RegisterInput, Teacher } from '@pjok/shared'
import { create } from 'zustand'
import { apiRequest, clearSession, getRefreshToken, hydrateTokens, persistSession } from './api'
import { clearOfflineCache, setOfflineCacheOwner } from './offline-cache'
import { queryClient } from './query-client'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type LoginResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: Teacher
}

type AuthState = {
  status: AuthStatus
  user: Teacher | null
  hydrate: () => Promise<void>
  signIn: (input: LoginInput) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (input: ProfileUpdateInput) => Promise<void>
}

async function applySession(response: LoginResponse): Promise<Teacher> {
  await persistSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  })
  await clearOfflineCache()
  setOfflineCacheOwner(response.user.id)
  queryClient.clear()
  return response.user
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  hydrate: async () => {
    try {
      const hasTokens = await hydrateTokens()
      if (!hasTokens) {
        setOfflineCacheOwner(null)
        await clearOfflineCache()
        set({ status: 'unauthenticated', user: null })
        return
      }
      const user = await apiRequest<Teacher>('/auth/me')
      setOfflineCacheOwner(user.id)
      set({ status: 'authenticated', user })
    } catch {
      setOfflineCacheOwner(null)
      await clearOfflineCache()
      await clearSession()
      set({ status: 'unauthenticated', user: null })
    }
  },

  signIn: async (input) => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const user = await applySession(response)
    set({ status: 'authenticated', user })
  },

  signUp: async (input) => {
    const response = await apiRequest<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const user = await applySession(response)
    set({ status: 'authenticated', user })
  },

  signOut: async () => {
    setOfflineCacheOwner(null)
    const token = getRefreshToken()
    try {
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify(token ? { refreshToken: token } : {}),
      })
    } catch {
      // Sesi lokal tetap dibersihkan meski server tidak dapat dihubungi.
    } finally {
      await queryClient.cancelQueries()
      await clearSession()
      await clearOfflineCache()
      queryClient.clear()
      set({ status: 'unauthenticated', user: null })
    }
  },

  updateProfile: async (input) => {
    const user = await apiRequest<Teacher>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    set({ user })
  },
}))
