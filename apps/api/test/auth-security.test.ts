import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { api, createTeacher, json } from './helpers'

async function post(path: string, body: unknown, ip = '192.0.2.1') {
  return SELF.fetch(`http://example.com/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify(body),
  })
}

type SessionResponse = { data: { accessToken: string; refreshToken: string } }

describe('keamanan sesi dan akun', () => {
  it('logout langsung menolak akses dan tidak mencabut sesi pengguna lain', async () => {
    const first = await createTeacher({ id: 'logout-first', email: 'logout-first@test.local' })
    const second = await createTeacher({ id: 'logout-second', email: 'logout-second@test.local' })
    const login = await json<SessionResponse>(
      await post('login', {
        email: second.email,
        password: second.password,
      }),
    )
    expect(
      (
        await api('/auth/logout', first.token, {
          method: 'POST',
          body: JSON.stringify({ refreshToken: login.data.refreshToken }),
        })
      ).status,
    ).toBe(204)
    expect((await api('/auth/me', first.token)).status).toBe(401)
    expect((await api('/auth/me', second.token)).status).toBe(200)
    expect((await post('refresh', { refreshToken: login.data.refreshToken })).status).toBe(200)
  })

  it('perubahan role langsung berlaku pada token yang sudah terbit', async () => {
    const account = await createTeacher({
      id: 'demoted',
      email: 'demoted@test.local',
      role: 'superadmin',
    })
    expect((await api('/admin/users', account.token)).status).toBe(200)
    await env.DB.prepare("UPDATE users SET role = 'teacher' WHERE id = ?").bind(account.id).run()
    expect((await api('/admin/users', account.token)).status).toBe(403)
  })

  it('refresh serentak hanya menerbitkan satu penerus dan reuse mencabut akses', async () => {
    const account = await createTeacher({ id: 'refresh-race', email: 'refresh-race@test.local' })
    const login = await json<SessionResponse>(
      await post('login', {
        email: account.email,
        password: account.password,
      }),
    )
    const responses = await Promise.all([
      post('refresh', { refreshToken: login.data.refreshToken }),
      post('refresh', { refreshToken: login.data.refreshToken }),
    ])
    expect(responses.map((r) => r.status).sort()).toEqual([200, 401])
    expect((await api('/auth/me', login.data.accessToken)).status).toBe(401)
    const active = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM sessions WHERE user_id = ? AND revoked_at IS NULL',
    )
      .bind(account.id)
      .first<{ total: number }>()
    expect(active?.total).toBe(0)
  })

  it('reset serentak hanya berhasil sekali dan menonaktifkan semua token pemulihan', async () => {
    const account = await createTeacher({ id: 'reset-race', email: 'reset-race@test.local' })
    const first = await json<{ data: { devToken: string } }>(
      await post('forgot-password', { email: account.email }),
    )
    const second = await json<{ data: { devToken: string } }>(
      await post('forgot-password', { email: account.email }),
    )
    const responses = await Promise.all([
      post('reset-password', { token: first.data.devToken, password: 'new-password-123' }),
      post('reset-password', { token: first.data.devToken, password: 'other-password-123' }),
    ])
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400])
    expect((await api('/auth/me', account.token)).status).toBe(401)
    expect(
      (
        await post('reset-password', {
          token: second.data.devToken,
          password: 'another-password-123',
        })
      ).status,
    ).toBe(400)
  })

  it('rate limit akun tetap berlaku ketika alamat IP berubah', async () => {
    let response: Response | undefined
    for (let i = 0; i < 11; i += 1) {
      response = await post(
        'login',
        { email: 'distributed@test.local', password: 'invalid-password' },
        `192.0.2.${i}`,
      )
    }
    expect(response?.status).toBe(429)
  })

  it('registrasi serentak menyimpan satu akun dan mengabaikan role dari client', async () => {
    const body = {
      name: 'Guru Uji',
      email: 'registration-race@test.local',
      password: 'password123',
      role: 'superadmin',
    }
    const responses = await Promise.all([post('register', body), post('register', body)])
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
    const account = await env.DB.prepare('SELECT role FROM users WHERE email = ?')
      .bind(body.email)
      .first<{ role: string }>()
    expect(account?.role).toBe('teacher')
  })
})
