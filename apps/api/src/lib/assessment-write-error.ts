import { conflict } from './errors'

export function mapAssessmentWriteError(error: unknown): never {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    if (current.message.includes('ASSESSMENT_FINALIZED')) {
      throw conflict(
        'ASSESSMENT_FINALIZED',
        'Nilai asesmen final tidak dapat diubah. Muat ulang asesmen.',
      )
    }
    if (current.message.includes('CLASS_HAS_ASSESSMENTS')) {
      throw conflict(
        'CLASS_HAS_ASSESSMENTS',
        'Kelas memiliki riwayat asesmen dan tidak dapat dihapus',
      )
    }
    if (current.message.includes('STUDENT_HAS_RESULTS')) {
      throw conflict(
        'STUDENT_HAS_RESULTS',
        'Peserta didik telah digunakan dalam asesmen dan tidak dapat dihapus',
      )
    }
    current = current.cause
  }
  throw error
}
