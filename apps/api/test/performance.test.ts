import { INSTRUMENTS } from '@pjok/shared'
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { api, createTeacher, insertClass } from './helpers'

const INSTRUMENT = INSTRUMENTS.find((item) => item.slug === 'kebugaran-kekuatan')
const STUDENT_COUNT = 100
const ITERATIONS = 20
const P95_BUDGET_MS = 300

describe('kinerja endpoint kelas', () => {
  it('list 100 siswa dan rekap kelas tetap di bawah p95 300 ms', async () => {
    if (!INSTRUMENT) throw new Error('Instrumen kebugaran-kekuatan tidak ditemukan')

    const teacher = await createTeacher({
      id: crypto.randomUUID(),
      email: `perf-${crypto.randomUUID()}@example.com`,
    })
    const classId = crypto.randomUUID()
    await insertClass(teacher.id, classId, 'Kelas Benchmark')

    const timestamp = new Date().toISOString()
    const studentIds: string[] = []
    const studentStatements = Array.from({ length: STUDENT_COUNT }, (_, index) => {
      const id = crypto.randomUUID()
      studentIds.push(id)
      return env.DB.prepare(
        `INSERT INTO students (id, teacher_id, class_id, full_name, nis, sex, birth_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        teacher.id,
        classId,
        `Siswa Benchmark ${String(index + 1).padStart(3, '0')}`,
        `BENCH${String(index + 1).padStart(3, '0')}`,
        index % 2 === 0 ? 'P' : 'L',
        '2012-01-31',
        timestamp,
        timestamp,
      )
    })
    await runBatches(studentStatements)

    const assessmentId = crypto.randomUUID()
    await env.DB.prepare(
      `INSERT INTO assessments (id, teacher_id, class_id, instrument_id, instrument_snapshot_json,
         participant_ids_json, date, status, finalized_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'finalized', ?, ?, ?)`,
    )
      .bind(
        assessmentId,
        teacher.id,
        classId,
        INSTRUMENT.id,
        JSON.stringify(INSTRUMENT),
        JSON.stringify(studentIds),
        '2026-10-01',
        timestamp,
        timestamp,
        timestamp,
      )
      .run()

    const resultStatements = studentIds.map((studentId) =>
      env.DB.prepare(
        `INSERT INTO assessment_results (id, assessment_id, student_id, process_score, product_score,
           final_score, category, computed_at)
         VALUES (?, ?, ?, NULL, ?, ?, 'baik', ?)`,
      ).bind(crypto.randomUUID(), assessmentId, studentId, 80, 80, timestamp),
    )
    await runBatches(resultStatements)

    const listP95 = await measureP95(`/classes/${classId}/students?perPage=100`, teacher.token)
    const recapP95 = await measureP95(`/classes/${classId}/recap`, teacher.token)

    console.log(`p95 list=${listP95.toFixed(1)} ms, rekap=${recapP95.toFixed(1)} ms`)
    expect(listP95).toBeLessThan(P95_BUDGET_MS)
    expect(recapP95).toBeLessThan(P95_BUDGET_MS)
  })
})

async function measureP95(path: string, token: string): Promise<number> {
  const warmup = await api(path, token)
  expect(warmup.status).toBe(200)

  const samples: number[] = []
  for (let index = 0; index < ITERATIONS; index += 1) {
    const startedAt = performance.now()
    const response = await api(path, token)
    samples.push(performance.now() - startedAt)
    expect(response.status).toBe(200)
  }

  samples.sort((left, right) => left - right)
  return samples[Math.ceil((ITERATIONS * 95) / 100) - 1] ?? Number.POSITIVE_INFINITY
}

async function runBatches(statements: D1PreparedStatement[]): Promise<void> {
  const chunkSize = 50
  for (let index = 0; index < statements.length; index += chunkSize) {
    await env.DB.batch(statements.slice(index, index + chunkSize))
  }
}
