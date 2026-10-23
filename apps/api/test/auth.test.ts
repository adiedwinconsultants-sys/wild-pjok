import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createTeacher, json } from './helpers'

const BASE = 'http://example.com/v1'

async function post(path: string, body: unknown): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type LoginResponse = {
  data: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: { id: string; email: string; name: string }
  }
}

type ErrorResponse = { error: { code: string; message: string } }

describe('auth', () => {
  it('health memeriksa D1', async () => {
    const response = await SELF.fetch(`${BASE}/health`)
    expect(response.status).toBe(200)
    const payload = await json<{ data: { status: string } }>(response)
    expect(payload.data.status).toBe('ok')
  })

  it('login sukses dan password salah ditolak', async () => {
    const teacher = await createTeacher({ id: 'auth-teacher', email: 'auth@test.local' })
    expect(teacher.token.length).toBeGreaterThan(20)

    const wrong = await post('/auth/login', {
      email: 'auth@test.local',
      password: 'salah-password',
    })
    expect(wrong.status).toBe(401)
    const error = await json<ErrorResponse>(wrong)
    expect(error.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('me mengembalikan profil guru', async () => {
    const teacher = await createTeacher({ id: 'me-teacher', email: 'me@test.local' })
    const response = await SELF.fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
    })
    expect(response.status).toBe(200)
    const payload = await json<{ data: { email: string } }>(response)
    expect(payload.data.email).toBe('me@test.local')
  })

  it('refresh merotasi token dan mendeteksi reuse', async () => {
    await createTeacher({ id: 'refresh-teacher', email: 'refresh@test.local' })
    const login = await post('/auth/login', {
      email: 'refresh@test.local',
      password: 'password123',
    })
    const first = await json<LoginResponse>(login)

    const rotated = await post('/auth/refresh', { refreshToken: first.data.refreshToken })
    expect(rotated.status).toBe(200)
    const second = await json<LoginResponse>(rotated)
    expect(second.data.refreshToken).not.toBe(first.data.refreshToken)
    expect(second.data.accessToken.length).toBeGreaterThan(20)

    const reuse = await post('/auth/refresh', { refreshToken: first.data.refreshToken })
    expect(reuse.status).toBe(401)
    const error = await json<ErrorResponse>(reuse)
    expect(error.error.code).toBe('INVALID_REFRESH_TOKEN')

    const revoked = await post('/auth/refresh', { refreshToken: second.data.refreshToken })
    expect(revoked.status).toBe(401)
  })

  it('logout mencabut sesi', async () => {
    await createTeacher({ id: 'logout-teacher', email: 'logout@test.local' })
    const login = await post('/auth/login', {
      email: 'logout@test.local',
      password: 'password123',
    })
    const payload = await json<LoginResponse>(login)
    const response = await SELF.fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${payload.data.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: payload.data.refreshToken }),
    })
    expect(response.status).toBe(204)

    const refresh = await post('/auth/refresh', { refreshToken: payload.data.refreshToken })
    expect(refresh.status).toBe(401)
  })

  it('reset password memakai token sekali pakai dan mencabut sesi', async () => {
    const teacher = await createTeacher({ id: 'reset-teacher', email: 'reset@test.local' })
    const login = await post('/auth/login', {
      email: 'reset@test.local',
      password: 'password123',
    })
    const session = await json<LoginResponse>(login)

    const forgot = await post('/auth/forgot-password', { email: 'reset@test.local' })
    expect(forgot.status).toBe(202)
    const forgotPayload = await json<{ data: { devToken?: string } }>(forgot)
    const token = forgotPayload.data.devToken
    expect(token).toBeTruthy()
    if (!token) throw new Error('devToken tidak tersedia')

    const reset = await post('/auth/reset-password', { token, password: 'passwordBaru123' })
    expect(reset.status).toBe(200)

    const reuse = await post('/auth/reset-password', { token, password: 'passwordBaru456' })
    expect(reuse.status).toBe(400)

    const oldSession = await post('/auth/refresh', { refreshToken: session.data.refreshToken })
    expect(oldSession.status).toBe(401)

    const newLogin = await post('/auth/login', {
      email: 'reset@test.local',
      password: 'passwordBaru123',
    })
    expect(newLogin.status).toBe(200)

    const rows = await env.DB.prepare('SELECT COUNT(*) AS total FROM sessions WHERE user_id = ?')
      .bind(teacher.id)
      .first<{ total: number }>()
    expect(rows?.total).toBeGreaterThanOrEqual(1)
  })

  it('rate limit memblokir percobaan login ke-11', async () => {
    let lastStatus = 0
    for (let attempt = 1; attempt <= 11; attempt += 1) {
      const response = await post('/auth/login', {
        email: 'ratelimit@test.local',
        password: 'salah-password',
      })
      lastStatus = response.status
    }
    expect(lastStatus).toBe(429)
  })
})
