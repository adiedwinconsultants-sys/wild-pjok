import type { LoginInput, ProfileUpdateInput, Teacher } from '@pjok/shared'
import { create } from 'zustand'
import { apiRequest, clearSession, getRefreshToken, hydrateTokens, persistSession } from './api'
import { clearOfflineCache } from './offline-cache'
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
  signOut: () => Promise<void>
  updateProfile: (input: ProfileUpdateInput) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  hydrate: async () => {
    try {
      const hasTokens = await hydrateTokens()
      if (!hasTokens) {
        set({ status: 'unauthenticated', user: null })
        return
      }
      const user = await apiRequest<Teacher>('/auth/me')
      set({ status: 'authenticated', user })
    } catch {
      await clearSession()
      set({ status: 'unauthenticated', user: null })
    }
  },

  signIn: async (input) => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    await persistSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    })
    await clearOfflineCache()
    queryClient.clear()
    set({ status: 'authenticated', user: response.user })
  },

  signOut: async () => {
    const token = getRefreshToken()
    try {
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify(token ? { refreshToken: token } : {}),
      })
    } catch {
      // Sesi lokal tetap dibersihkan meski server tidak dapat dihubungi.
    } finally {
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
