import type {
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
  Teacher,
  WorkosAuthResult,
} from '@pjok/shared'
import { create } from 'zustand'
import { apiRequest, clearSession, getRefreshToken, hydrateTokens, persistSession } from './api'
import { clearOfflineCache } from './offline-cache'
import { queryClient } from './query-client'
import { fetchWorkosStatus, startWorkosSignIn } from './workos'

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
  workosEnabled: boolean
  hydrate: () => Promise<void>
  signIn: (input: LoginInput) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signInWithWorkos: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (input: ProfileUpdateInput) => Promise<void>
}

async function applySession(response: LoginResponse | WorkosAuthResult): Promise<Teacher> {
  await persistSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  })
  await clearOfflineCache()
  queryClient.clear()
  return response.user
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  workosEnabled: false,

  hydrate: async () => {
    let workosEnabled = false
    try {
      workosEnabled = (await fetchWorkosStatus()).enabled
    } catch {
      workosEnabled = false
    }

    try {
      const hasTokens = await hydrateTokens()
      if (!hasTokens) {
        set({ status: 'unauthenticated', user: null, workosEnabled })
        return
      }
      const user = await apiRequest<Teacher>('/auth/me')
      set({ status: 'authenticated', user, workosEnabled })
    } catch {
      await clearSession()
      set({ status: 'unauthenticated', user: null, workosEnabled })
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

  signInWithWorkos: async () => {
    const response = await startWorkosSignIn()
    if (!response) return
    const user = await applySession(response)
    set({ status: 'authenticated', user })
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
