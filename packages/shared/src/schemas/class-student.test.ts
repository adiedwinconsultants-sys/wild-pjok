import { afterEach, describe, expect, it, vi } from 'vitest'
import { studentCreateSchema } from './class-student'

const student = { fullName: 'Siswa Uji', nis: '1', sex: 'L', birthDate: '2012-02-29' }

describe('tanggal lahir siswa', () => {
  afterEach(() => vi.useRealTimers())

  it('menerima tanggal kabisat dan menolak tanggal kalender tidak valid', () => {
    expect(studentCreateSchema.safeParse(student).success).toBe(true)
    expect(studentCreateSchema.safeParse({ ...student, birthDate: '2011-02-29' }).success).toBe(
      false,
    )
  })

  it('memakai hari Asia/Jakarta sebagai batas tanggal lahir', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T20:00:00Z'))
    expect(studentCreateSchema.safeParse({ ...student, birthDate: '2026-10-27' }).success).toBe(
      true,
    )
    expect(studentCreateSchema.safeParse({ ...student, birthDate: '2026-10-28' }).success).toBe(
      false,
    )
  })
})
