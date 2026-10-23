import { SELF, env } from 'cloudflare:test'
import { hashPassword } from '../src/lib/password'

export type TestTeacher = {
  id: string
  email: string
  password: string
  token: string
}

export async function createTeacher(options: {
  id: string
  email: string
  name?: string
  password?: string
  role?: 'teacher' | 'admin' | 'superadmin'
}): Promise<TestTeacher> {
  const password = options.password ?? 'password123'
  const passwordHash = await hashPassword(password)
  const timestamp = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, name, nip, school, role, auth_provider, workos_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'password', NULL, ?, ?)`,
  )
    .bind(
      options.id,
      options.email,
      passwordHash,
      options.name ?? 'Guru Uji',
      null,
      'Sekolah Uji',
      options.role ?? 'teacher',
      timestamp,
      timestamp,
    )
    .run()

  const response = await SELF.fetch('http://example.com/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: options.email, password }),
  })
  if (!response.ok) {
    throw new Error(`login gagal: ${response.status} ${await response.text()}`)
  }
  const payload = (await response.json()) as {
    data: { accessToken: string; refreshToken: string }
  }
  return { id: options.id, email: options.email, password, token: payload.data.accessToken }
}

export function authHeaders(token: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${token}`, ...extra }
}

export async function api(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  return SELF.fetch(`http://example.com/v1${path}`, {
    ...init,
    headers: authHeaders(token, {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined),
    }),
  })
}

export async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function insertClass(teacherId: string, id: string, name = 'VII A'): Promise<void> {
  const timestamp = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO classes (id, teacher_id, name, grade_level, academic_year, notes, created_at, updated_at)
     VALUES (?, ?, ?, 7, '2025/2026', NULL, ?, ?)`,
  )
    .bind(id, teacherId, name, timestamp, timestamp)
    .run()
}

export async function insertStudent(options: {
  id: string
  teacherId: string
  classId: string
  nis: string
  sex?: 'L' | 'P'
  birthDate?: string
  fullName?: string
}): Promise<void> {
  const timestamp = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO students (id, teacher_id, class_id, full_name, nis, sex, birth_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      options.id,
      options.teacherId,
      options.classId,
      options.fullName ?? 'Siswa Uji',
      options.nis,
      options.sex ?? 'L',
      options.birthDate ?? '2012-01-31',
      timestamp,
      timestamp,
    )
    .run()
}

export async function insertInstrument(instrument: unknown, slug: string): Promise<string> {
  const record = instrument as { id: string; name: string; group: string; version: number }
  await env.DB.prepare(
    `INSERT OR IGNORE INTO instruments (id, slug, version, "group", name, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      record.id,
      slug,
      record.version,
      record.group,
      record.name,
      JSON.stringify(instrument),
      new Date().toISOString(),
    )
    .run()
  return record.id
}
