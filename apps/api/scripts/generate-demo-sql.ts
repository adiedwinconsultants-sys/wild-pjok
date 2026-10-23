import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeAssessment } from '@pjok/shared'
import type { Instrument, Sex } from '@pjok/shared'
import { normalizeRawValue, resolveCategory } from '@pjok/shared'
import { hashPassword } from '../src/lib/password'

const here = dirname(fileURLToPath(import.meta.url))
const catalogPath = resolve(here, '../src/db/seed/instruments.json')
const outPath = resolve(here, '../src/db/seed/demo.sql')

const instruments = JSON.parse(readFileSync(catalogPath, 'utf8')) as Instrument[]
const instrument = instruments.find((item) => item.slug === 'tksi-kekuatan')
if (!instrument) {
  throw new Error('Instrumen tksi-kekuatan tidak ditemukan')
}

const teacherId = 'demo-teacher'
const classA = 'demo-class-7a'
const classB = 'demo-class-8b'
const assessmentId = 'demo-assessment-1'
const assessmentDate = '2026-10-01'
const timestamp = '2026-10-01T08:00:00.000Z'

const firstNamePool = [
  'Aisyah',
  'Bagas',
  'Citra',
  'Dimas',
  'Eka',
  'Fajar',
  'Gita',
  'Hendra',
  'Indah',
  'Joko',
  'Kartika',
  'Lutfi',
  'Maya',
  'Nanda',
  'Oka',
  'Putri',
  'Rizky',
  'Sinta',
  'Taufik',
  'Umi',
]
const lastNamePool = [
  'Pratama',
  'Wijaya',
  'Sari',
  'Nugroho',
  'Lestari',
  'Ramadhan',
  'Mulia',
  'Saputra',
  'Anggraini',
  'Hidayat',
]

const lines: string[] = [
  '-- Seed demo (idempoten).',
  'DELETE FROM assessment_feedback;',
  'DELETE FROM assessment_results;',
  'DELETE FROM assessment_scores;',
  'DELETE FROM assessments;',
  'DELETE FROM students;',
  'DELETE FROM classes;',
  "DELETE FROM users WHERE id = 'demo-teacher';",
]

const passwordHash = await hashPassword('password123')
lines.push(
  `INSERT INTO users (id, email, password_hash, name, nip, school, role, created_at, updated_at) VALUES (${q(
    teacherId,
  )}, ${q('guru@demo.pjok.id')}, ${q(passwordHash)}, ${q('Budi Santoso')}, ${q(
    '198001012005011001',
  )}, ${q('SMP Negeri 1 Demo')}, ${q('teacher')}, ${q(timestamp)}, ${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash, name = excluded.name, nip = excluded.nip, school = excluded.school;`,
)

lines.push(
  `INSERT INTO classes (id, teacher_id, name, grade_level, academic_year, notes, created_at, updated_at) VALUES (${q(
    classA,
  )}, ${q(teacherId)}, ${q('VII A')}, 7, ${q('2025/2026')}, ${q('Kelas demo untuk asesmen TKSI')}, ${q(
    timestamp,
  )}, ${q(timestamp)}), (${q(classB)}, ${q(teacherId)}, ${q('VIII B')}, 8, ${q(
    '2025/2026',
  )}, NULL, ${q(timestamp)}, ${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET name = excluded.name;`,
)

const participantIds: string[] = []
for (let index = 0; index < 20; index += 1) {
  const number = String(index + 1).padStart(2, '0')
  const id = `demo-student-${number}`
  participantIds.push(id)
  const sex: Sex = index % 2 === 0 ? 'P' : 'L'
  const firstName = firstNamePool[index % firstNamePool.length] ?? 'Siswa'
  const lastName = lastNamePool[index % lastNamePool.length] ?? 'Demo'
  const birthYear = 2012 - (index % 2)
  const birthDate = `${birthYear}-${String((index % 12) + 1).padStart(2, '0')}-${String(
    (index % 27) + 1,
  ).padStart(2, '0')}`
  const nis = `2026${number}`
  lines.push(
    `INSERT INTO students (id, teacher_id, class_id, full_name, nis, sex, birth_date, created_at, updated_at) VALUES (${q(
      id,
    )}, ${q(teacherId)}, ${q(classA)}, ${q(`${firstName} ${lastName}`)}, ${q(nis)}, ${q(
      sex,
    )}, ${q(birthDate)}, ${q(timestamp)}, ${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name;`,
  )
}

for (let index = 0; index < 5; index += 1) {
  const number = String(index + 1).padStart(2, '0')
  const id = `demo-classb-student-${number}`
  const sex: Sex = index % 2 === 0 ? 'L' : 'P'
  const firstName = firstNamePool[(index + 5) % firstNamePool.length] ?? 'Siswa'
  const lastName = lastNamePool[(index + 3) % lastNamePool.length] ?? 'Demo'
  lines.push(
    `INSERT INTO students (id, teacher_id, class_id, full_name, nis, sex, birth_date, created_at, updated_at) VALUES (${q(
      id,
    )}, ${q(teacherId)}, ${q(classB)}, ${q(`${firstName} ${lastName}`)}, ${q(
      `8B${number}`,
    )}, ${q(sex)}, ${q('2011-05-12')}, ${q(timestamp)}, ${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name;`,
  )
}

lines.push(
  `INSERT INTO assessments (id, teacher_id, class_id, instrument_id, instrument_snapshot_json, participant_ids_json, date, status, finalized_at, reopened_at, created_at, updated_at) VALUES (${q(
    assessmentId,
  )}, ${q(teacherId)}, ${q(classA)}, ${q(instrument.id)}, ${q(
    JSON.stringify(instrument),
  )}, ${q(JSON.stringify(participantIds))}, ${q(assessmentDate)}, ${q('finalized')}, ${q(
    timestamp,
  )}, NULL, ${q(timestamp)}, ${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, instrument_snapshot_json = excluded.instrument_snapshot_json;`,
)

const indicator = instrument.indicators[0]
if (!indicator) throw new Error('Instrumen tidak memiliki indikator')

const students = participantIds.map((id, index) => {
  const sex: Sex = index % 2 === 0 ? 'P' : 'L'
  const birthYear = 2012 - (index % 2)
  const birthDate = `${birthYear}-${String((index % 12) + 1).padStart(2, '0')}-${String(
    (index % 27) + 1,
  ).padStart(2, '0')}`
  const age = 2026 - birthYear - (10 < Number(birthDate.slice(5, 7)) ? 1 : 0)
  const rawValue = 12 + ((index * 3) % 40)
  const normalized = normalizeRawValue(indicator, rawValue, sex, age)
  return { id, sex, age, rawValue, normalized: normalized.value }
})

for (const student of students) {
  const normalized = student.normalized
  const category = resolveCategory(instrument, normalized)
  lines.push(
    `INSERT INTO assessment_scores (id, assessment_id, student_id, indicator_id, raw_value, normalized_value, kind, updated_at) VALUES (${q(
      `demo-score-${student.id}`,
    )}, ${q(assessmentId)}, ${q(student.id)}, ${q(indicator.id)}, ${student.rawValue}, ${normalized}, ${q(
      indicator.kind,
    )}, ${q(timestamp)}) ON CONFLICT(assessment_id, student_id, indicator_id) DO UPDATE SET raw_value = excluded.raw_value, normalized_value = excluded.normalized_value;`,
  )
  const computed = computeAssessment(instrument, [
    { indicatorId: indicator.id, rawValue: student.rawValue, sex: student.sex, age: student.age },
  ])
  lines.push(
    `INSERT INTO assessment_results (id, assessment_id, student_id, process_score, product_score, final_score, category, computed_at) VALUES (${q(
      `demo-result-${student.id}`,
    )}, ${q(assessmentId)}, ${q(student.id)}, ${num(computed.processScore)}, ${num(
      computed.productScore,
    )}, ${computed.finalScore}, ${q(category.category)}, ${q(timestamp)}) ON CONFLICT(assessment_id, student_id) DO UPDATE SET final_score = excluded.final_score, category = excluded.category;`,
  )
}

lines.push(
  `INSERT INTO assessment_feedback (id, result_id, note, updated_at) VALUES (${q(
    'demo-feedback-1',
  )}, ${q('demo-result-demo-student-01')}, ${q(
    'Pertahankan kebiasaan latihan rutin dan perbaiki teknik agar hasil semakin baik.',
  )}, ${q(timestamp)}) ON CONFLICT(result_id) DO UPDATE SET note = excluded.note;`,
)
lines.push('')

writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log(`Seed demo ditulis -> ${outPath}`)

function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function num(value: number | null): string {
  return value === null ? 'NULL' : String(value)
}
