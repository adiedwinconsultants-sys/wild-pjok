import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeAssessment, computeIndicatorScores } from '@pjok/shared'
import type { Instrument, Sex } from '@pjok/shared'
import { hashPassword } from '../src/lib/password'

const here = dirname(fileURLToPath(import.meta.url))
const catalogPath = resolve(here, '../src/db/seed/instruments.json')
const outPath = resolve(here, '../src/db/seed/demo.sql')

const instruments = JSON.parse(readFileSync(catalogPath, 'utf8')) as Instrument[]

const teacherId = 'demo-teacher'
const superadminId = 'demo-superadmin'
const timestamp = '2026-10-01T08:00:00.000Z'

type DemoClass = {
  id: string
  name: string
  gradeLevel: number
  academicYear: string
  notes: string | null
  nisPrefix: string
  birthYear: number
}

type DemoAssessment = {
  id: string
  classId: string
  instrumentSlug: string
  date: string
  status: 'finalized' | 'draft'
  scoredStudents: number
}

const demoClasses: DemoClass[] = [
  {
    id: 'demo-class-7a',
    name: 'VII A',
    gradeLevel: 7,
    academicYear: '2025/2026',
    notes: 'Kelas demo untuk asesmen TKSI terpadu',
    nisPrefix: '7A',
    birthYear: 2012,
  },
  {
    id: 'demo-class-8b',
    name: 'VIII B',
    gradeLevel: 8,
    academicYear: '2025/2026',
    notes: 'Kelas demo untuk penilaian proses bola besar',
    nisPrefix: '8B',
    birthYear: 2011,
  },
  {
    id: 'demo-class-9c',
    name: 'IX C',
    gradeLevel: 9,
    academicYear: '2025/2026',
    notes: 'Kelas demo untuk asesmen produk atletik',
    nisPrefix: '9C',
    birthYear: 2010,
  },
]

const demoAssessments: DemoAssessment[] = [
  {
    id: 'demo-assessment-1',
    classId: 'demo-class-7a',
    instrumentSlug: 'tksi-terpadu',
    date: '2026-10-01',
    status: 'finalized',
    scoredStudents: 30,
  },
  {
    id: 'demo-assessment-2',
    classId: 'demo-class-8b',
    instrumentSlug: 'sepak-bola',
    date: '2026-10-05',
    status: 'finalized',
    scoredStudents: 30,
  },
  {
    id: 'demo-assessment-3',
    classId: 'demo-class-9c',
    instrumentSlug: 'atletik-lompat-jauh',
    date: '2026-10-08',
    status: 'finalized',
    scoredStudents: 30,
  },
  {
    id: 'demo-assessment-draft',
    classId: 'demo-class-7a',
    instrumentSlug: 'kebugaran-kekuatan',
    date: '2026-10-12',
    status: 'draft',
    scoredStudents: 5,
  },
]

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
const feedbackPool = [
  'Pertahankan kebiasaan latihan rutin dan perbaiki teknik agar hasil semakin baik.',
  'Tingkatkan konsistensi gerak dan perhatikan posisi tubuh saat melakukan tes.',
  'Capaian sudah baik; lanjutkan latihan terprogram tiga kali seminggu.',
  'Perbanyak latihan dasar sebelum meningkatkan intensitas agar teknik tetap aman.',
]

type DemoStudent = {
  id: string
  classId: string
  fullName: string
  nis: string
  sex: Sex
  birthDate: string
}

const students: DemoStudent[] = []

for (const [classIndex, demoClass] of demoClasses.entries()) {
  for (let index = 0; index < 30; index += 1) {
    const number = String(index + 1).padStart(2, '0')
    const globalIndex = classIndex * 30 + index
    const firstName = firstNamePool[(globalIndex + classIndex * 3) % firstNamePool.length]
    const lastName = lastNamePool[(globalIndex * 3 + classIndex) % lastNamePool.length]
    const month = String(((index + classIndex * 3) % 12) + 1).padStart(2, '0')
    const day = String(((index * 2 + classIndex) % 27) + 1).padStart(2, '0')
    students.push({
      id: `demo-student-${demoClass.gradeLevel}-${number}`,
      classId: demoClass.id,
      fullName: `${firstName ?? 'Siswa'} ${lastName ?? 'Demo'}`,
      nis: `${demoClass.nisPrefix}${number}`,
      sex: index % 2 === 0 ? 'P' : 'L',
      birthDate: `${demoClass.birthYear}-${month}-${day}`,
    })
  }
}

const lines: string[] = [
  '-- Seed demo (idempoten).',
  '-- Cakupan: 1 superadmin, 1 guru, 3 kelas x 30 siswa, 4 grup materi, 3 asesmen final + 1 draf.',
  "DELETE FROM assessment_feedback WHERE result_id IN (SELECT r.id FROM assessment_results r JOIN assessments a ON a.id = r.assessment_id WHERE a.teacher_id = 'demo-teacher');",
  "DELETE FROM assessment_results WHERE assessment_id IN (SELECT id FROM assessments WHERE teacher_id = 'demo-teacher');",
  "DELETE FROM assessment_scores WHERE assessment_id IN (SELECT id FROM assessments WHERE teacher_id = 'demo-teacher');",
  "DELETE FROM assessments WHERE teacher_id = 'demo-teacher';",
  "DELETE FROM students WHERE teacher_id = 'demo-teacher';",
  "DELETE FROM classes WHERE teacher_id = 'demo-teacher';",
  "DELETE FROM users WHERE id = 'demo-teacher';",
  "DELETE FROM users WHERE id = 'demo-superadmin';",
]

const passwordHash = await hashPassword('password123')
lines.push(
  `INSERT INTO users (id, email, password_hash, name, nip, school, role, auth_provider, workos_user_id, created_at, updated_at) VALUES (${q(
    teacherId,
  )}, ${q('guru@demo.pjok.id')}, ${q(passwordHash)}, ${q('Budi Santoso')}, ${q(
    '198001012005011001',
  )}, ${q('SMP Negeri 1 Demo')}, ${q('teacher')}, ${q('password')}, NULL, ${q(
    timestamp,
  )}, ${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash, name = excluded.name, nip = excluded.nip, school = excluded.school, role = excluded.role;`,
)
lines.push(
  `INSERT INTO users (id, email, password_hash, name, nip, school, role, auth_provider, workos_user_id, created_at, updated_at) VALUES (${q(
    superadminId,
  )}, ${q('superadmin@demo.pjok.id')}, ${q(passwordHash)}, ${q('Superadmin Demo')}, NULL, ${q(
    'SMP Negeri 1 Demo',
  )}, ${q('superadmin')}, ${q('password')}, NULL, ${q(timestamp)}, ${q(
    timestamp,
  )}) ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash, name = excluded.name, role = excluded.role;`,
)

for (const demoClass of demoClasses) {
  lines.push(
    `INSERT INTO classes (id, teacher_id, name, grade_level, academic_year, notes, created_at, updated_at) VALUES (${q(
      demoClass.id,
    )}, ${q(teacherId)}, ${q(demoClass.name)}, ${demoClass.gradeLevel}, ${q(
      demoClass.academicYear,
    )}, ${demoClass.notes === null ? 'NULL' : q(demoClass.notes)}, ${q(timestamp)}, ${q(
      timestamp,
    )}) ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes;`,
  )
}

for (const student of students) {
  lines.push(
    `INSERT INTO students (id, teacher_id, class_id, full_name, nis, sex, birth_date, created_at, updated_at) VALUES (${q(
      student.id,
    )}, ${q(teacherId)}, ${q(student.classId)}, ${q(student.fullName)}, ${q(student.nis)}, ${q(
      student.sex,
    )}, ${q(student.birthDate)}, ${q(timestamp)}, ${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, nis = excluded.nis, sex = excluded.sex, birth_date = excluded.birth_date;`,
  )
}

for (const demoAssessment of demoAssessments) {
  const instrument = getInstrument(demoAssessment.instrumentSlug)
  const classStudents = students.filter((student) => student.classId === demoAssessment.classId)
  const participantIds = classStudents.map((student) => student.id)
  const finalizedAt =
    demoAssessment.status === 'finalized' ? `${demoAssessment.date}T08:00:00.000Z` : null
  const updatedAt = `${demoAssessment.date}T08:00:00.000Z`

  lines.push(
    `INSERT INTO assessments (id, teacher_id, class_id, instrument_id, instrument_snapshot_json, participant_ids_json, date, status, finalized_at, reopened_at, created_at, updated_at) VALUES (${q(
      demoAssessment.id,
    )}, ${q(teacherId)}, ${q(demoAssessment.classId)}, ${q(instrument.id)}, ${q(
      JSON.stringify(instrument),
    )}, ${q(JSON.stringify(participantIds))}, ${q(demoAssessment.date)}, ${q(
      demoAssessment.status,
    )}, ${finalizedAt === null ? 'NULL' : q(finalizedAt)}, NULL, ${q(updatedAt)}, ${q(
      updatedAt,
    )}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, instrument_snapshot_json = excluded.instrument_snapshot_json, participant_ids_json = excluded.participant_ids_json;`,
  )

  for (const [studentIndex, student] of classStudents.entries()) {
    if (studentIndex >= demoAssessment.scoredStudents) continue
    const age = ageAt(student.birthDate, demoAssessment.date)
    const inputs = instrument.indicators.map((indicator, indicatorIndex) => ({
      indicatorId: indicator.id,
      rawValue: pickRawValue(indicator, studentIndex, indicatorIndex, student.sex, age),
      sex: student.sex,
      age,
    }))

    if (demoAssessment.status === 'draft') {
      for (const score of computeIndicatorScores(instrument, inputs)) {
        lines.push(
          `INSERT INTO assessment_scores (id, assessment_id, student_id, indicator_id, raw_value, normalized_value, kind, updated_at) VALUES (${q(
            `demo-score-${demoAssessment.id}-${student.id}-${score.indicatorId}`,
          )}, ${q(demoAssessment.id)}, ${q(student.id)}, ${q(
            score.indicatorId,
          )}, ${score.rawValue}, ${score.normalizedValue}, ${q(score.kind)}, ${q(
            updatedAt,
          )}) ON CONFLICT(assessment_id, student_id, indicator_id) DO UPDATE SET raw_value = excluded.raw_value, normalized_value = excluded.normalized_value;`,
        )
      }
      continue
    }

    const computed = computeAssessment(instrument, inputs)
    for (const score of computed.scores) {
      lines.push(
        `INSERT INTO assessment_scores (id, assessment_id, student_id, indicator_id, raw_value, normalized_value, kind, updated_at) VALUES (${q(
          `demo-score-${demoAssessment.id}-${student.id}-${score.indicatorId}`,
        )}, ${q(demoAssessment.id)}, ${q(student.id)}, ${q(
          score.indicatorId,
        )}, ${score.rawValue}, ${score.normalizedValue}, ${q(score.kind)}, ${q(
          updatedAt,
        )}) ON CONFLICT(assessment_id, student_id, indicator_id) DO UPDATE SET raw_value = excluded.raw_value, normalized_value = excluded.normalized_value;`,
      )
    }

    lines.push(
      `INSERT INTO assessment_results (id, assessment_id, student_id, process_score, product_score, final_score, category, computed_at) VALUES (${q(
        `demo-result-${demoAssessment.id}-${student.id}`,
      )}, ${q(demoAssessment.id)}, ${q(student.id)}, ${num(
        computed.processScore,
      )}, ${num(computed.productScore)}, ${computed.finalScore}, ${q(
        computed.category.category,
      )}, ${q(updatedAt)}) ON CONFLICT(assessment_id, student_id) DO UPDATE SET final_score = excluded.final_score, category = excluded.category;`,
    )

    if (studentIndex < feedbackPool.length) {
      lines.push(
        `INSERT INTO assessment_feedback (id, result_id, note, updated_at) VALUES (${q(
          `demo-feedback-${demoAssessment.id}-${student.id}`,
        )}, ${q(`demo-result-${demoAssessment.id}-${student.id}`)}, ${q(
          feedbackPool[studentIndex] ?? feedbackPool[0] ?? '',
        )}, ${q(updatedAt)}) ON CONFLICT(result_id) DO UPDATE SET note = excluded.note;`,
      )
    }
  }
}

lines.push('')

writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log(`Seed demo ditulis -> ${outPath}`)
console.log(
  `Ringkasan: ${demoClasses.length} kelas, ${students.length} siswa, ${
    demoAssessments.filter((item) => item.status === 'finalized').length
  } asesmen final, ${demoAssessments.filter((item) => item.status === 'draft').length} draf.`,
)

function getInstrument(slug: string): Instrument {
  const instrument = instruments.find((item) => item.slug === slug)
  if (!instrument) throw new Error(`Instrumen ${slug} tidak ditemukan`)
  return instrument
}

function pickRawValue(
  indicator: Instrument['indicators'][number],
  studentIndex: number,
  indicatorIndex: number,
  sex: Sex,
  age: number,
): number {
  if (indicator.rubricBands && indicator.rubricBands.length > 0) {
    const band =
      indicator.rubricBands[(studentIndex + indicatorIndex) % indicator.rubricBands.length]
    if (!band) throw new Error(`Rubrik ${indicator.id} kosong`)
    return (band.min + band.max) / 2
  }

  const tables = indicator.normTable ?? []
  const matchingSex = tables.filter((table) => table.sex === sex)
  const table =
    matchingSex.find((candidate) => age >= candidate.ageMin && age <= candidate.ageMax) ??
    matchingSex[0] ??
    tables[0]
  const points = table?.points
  if (!points || points.length === 0) {
    throw new Error(`Norma ${indicator.id} kosong`)
  }
  const point = points[(studentIndex + indicatorIndex) % points.length]
  if (!point) throw new Error(`Titik norma ${indicator.id} kosong`)
  return point.raw
}

function ageAt(birthDate: string, date: string): number {
  const birth = new Date(`${birthDate}T00:00:00Z`)
  const at = new Date(`${date}T00:00:00Z`)
  let age = at.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = at.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1
  return Math.max(age, 0)
}

function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function num(value: number | null): string {
  return value === null ? 'NULL' : String(value)
}
