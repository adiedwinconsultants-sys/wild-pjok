import type { Teacher, WorkosAuthResult } from '@pjok/shared'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { apiRequest } from './api'

type AuthorizeResponse = {
  url: string
  state: string
}

type WorkosStatus = {
  enabled: boolean
  clientId: string | null
}

function queryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export async function fetchWorkosStatus(): Promise<WorkosStatus> {
  return apiRequest<WorkosStatus>('/auth/workos/status')
}

export async function startWorkosSignIn(): Promise<WorkosAuthResult | null> {
  const redirectUri = Linking.createURL('auth/callback')
  const authorize = await apiRequest<AuthorizeResponse>('/auth/workos/authorize', {
    method: 'POST',
    body: JSON.stringify({ redirectUri }),
  })

  const result = await WebBrowser.openAuthSessionAsync(authorize.url, redirectUri)
  if (result.type !== 'success' || !result.url) return null

  const parsed = Linking.parse(result.url)
  const error = queryValue(parsed.queryParams?.error)
  if (error) {
    const description = queryValue(parsed.queryParams?.error_description)
    throw new Error(description ?? 'Login WorkOS dibatalkan atau gagal.')
  }

  const code = queryValue(parsed.queryParams?.code)
  const state = queryValue(parsed.queryParams?.state)
  if (!code || !state) {
    throw new Error('Callback WorkOS tidak lengkap. Silakan coba lagi.')
  }

  return apiRequest<WorkosAuthResult>('/auth/workos/exchange', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  })
}

export type { WorkosStatus, WorkosAuthResult, Teacher }
