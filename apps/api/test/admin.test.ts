import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { api, createTeacher, json } from './helpers'

const BASE = 'http://example.com/v1'

async function post(path: string, body: unknown): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type AuthResponse = {
  data: {
    accessToken: string
    refreshToken: string
    user: { id: string; email: string; role: string }
  }
}

type ErrorResponse = { error: { code: string } }

type UsersResponse = {
  data: Array<{ id: string; email: string; role: string; classCount: number }>
  meta: { total: number }
}

describe('registrasi dan admin', () => {
  it('registrasi membuat akun guru dan dapat dipakai login', async () => {
    const email = `daftar-${crypto.randomUUID()}@test.local`
    const register = await post('/auth/register', {
      name: 'Guru Baru',
      email,
      password: 'password123',
      school: 'SMP Baru',
    })
    expect(register.status).toBe(200)
    const payload = await json<AuthResponse>(register)
    expect(payload.data.user.role).toBe('teacher')
    expect(payload.data.accessToken.length).toBeGreaterThan(20)

    const login = await post('/auth/login', { email, password: 'password123' })
    expect(login.status).toBe(200)
  })

  it('registrasi menolak email duplikat', async () => {
    const email = `duplikat-${crypto.randomUUID()}@test.local`
    const body = { name: 'Guru Duplikat', email, password: 'password123' }
    const first = await post('/auth/register', body)
    expect(first.status).toBe(200)
    const second = await post('/auth/register', body)
    expect(second.status).toBe(409)
    const error = await json<ErrorResponse>(second)
    expect(error.error.code).toBe('EMAIL_ALREADY_REGISTERED')
  })

  it('guru biasa tidak boleh membuka daftar pengguna', async () => {
    const teacher = await createTeacher({
      id: crypto.randomUUID(),
      email: `guru-${crypto.randomUUID()}@test.local`,
    })
    const response = await api('/admin/users', teacher.token)
    expect(response.status).toBe(403)
  })

  it('superadmin dapat mencari pengguna dan mengubah role', async () => {
    const admin = await createTeacher({
      id: crypto.randomUUID(),
      email: `super-${crypto.randomUUID()}@test.local`,
      role: 'superadmin',
    })
    const teacher = await createTeacher({
      id: crypto.randomUUID(),
      email: `calon-admin-${crypto.randomUUID()}@test.local`,
    })

    const list = await api(`/admin/users?q=${encodeURIComponent(teacher.email)}`, admin.token)
    expect(list.status).toBe(200)
    const payload = await json<UsersResponse>(list)
    expect(payload.data[0]?.id).toBe(teacher.id)
    expect(payload.data[0]?.classCount).toBe(0)

    const update = await api(`/admin/users/${teacher.id}`, admin.token, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(update.status).toBe(200)
    const updated = await json<{ data: { role: string } }>(update)
    expect(updated.data.role).toBe('admin')
  })

  it('superadmin terakhir tidak dapat diturunkan', async () => {
    const admin = await createTeacher({
      id: crypto.randomUUID(),
      email: `last-super-${crypto.randomUUID()}@test.local`,
      role: 'superadmin',
    })
    await env.DB.prepare("UPDATE users SET role = 'teacher' WHERE role = 'superadmin' AND id != ?")
      .bind(admin.id)
      .run()

    const response = await api(`/admin/users/${admin.id}`, admin.token, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'teacher' }),
    })
    expect(response.status).toBe(409)
    const error = await json<ErrorResponse>(response)
    expect(error.error.code).toBe('LAST_SUPERADMIN')
  })
})
