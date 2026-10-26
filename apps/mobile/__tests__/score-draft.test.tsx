import { INSTRUMENTS } from '@pjok/shared'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { AssessmentDetail } from '../src/features/assessments/hooks'
import { restoreScoreDraft } from '../src/features/assessments/score-draft'
import { useScoreDraft } from '../src/features/assessments/use-score-draft'
import {
  clearOfflineCache,
  setOfflineCacheOwner,
  writeOfflineCache,
} from '../src/lib/offline-cache'

const instrument = INSTRUMENTS.find((item) => item.slug === 'tksi-kekuatan')
if (!instrument) throw new Error('Instrumen tidak tersedia')
const assessment: AssessmentDetail = {
  id: 'assessment-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  instrumentId: instrument.id,
  date: '2026-10-01',
  status: 'draft',
  finalizedAt: null,
  reopenedAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  instrument,
  participantIds: ['student-1'],
  participants: [
    {
      id: 'student-1',
      teacherId: 'teacher-1',
      classId: 'class-1',
      fullName: 'Siswa Uji',
      nis: '1',
      sex: 'L',
      birthDate: '2012-01-31',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ],
  scores: [],
  results: [],
}

describe('pemulihan dan sinkronisasi draf', () => {
  beforeEach(async () => {
    setOfflineCacheOwner('teacher-1')
    await clearOfflineCache()
  })

  it('memakai nilai server saat konflik dan mengabaikan peserta atau indikator asing', () => {
    const detail: AssessmentDetail = {
      ...assessment,
      scores: [
        {
          id: 'score-1',
          assessmentId: assessment.id,
          studentId: 'student-1',
          indicatorId: 'situp-60s',
          rawValue: 30,
          normalizedValue: 60,
          kind: 'product',
          updatedAt: '2026-10-01T00:00:00Z',
        },
      ],
    }
    const restored = restoreScoreDraft(detail, {
      'student-1:situp-60s': '55',
      'foreign:foreign': '100',
    })
    expect(restored.values).toEqual({ 'student-1:situp-60s': '30' })
    expect(restored.conflict).toBe(true)
    expect(restored.dirty).toBe(false)
  })

  it('mengabaikan draf rusak dan draf lokal pada asesmen final', () => {
    expect(restoreScoreDraft(assessment, { 'student-1:situp-60s': 55 }).values).toEqual({})
    expect(
      restoreScoreDraft({ ...assessment, status: 'finalized' }, { 'student-1:situp-60s': '55' })
        .values,
    ).toEqual({})
  })

  it('mengirim draf lokal yang dipulihkan meski belum ada perubahan baru', async () => {
    await writeOfflineCache('draft:assessment-1', { 'student-1:situp-60s': '55' })
    const save = jest.fn(async () => undefined)
    const { result } = await renderHook(() => useScoreDraft(assessment.id, assessment, save))
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => {
      await result.current.persistDraft()
    })
    expect(save).toHaveBeenCalledWith([
      { studentId: 'student-1', indicatorId: 'situp-60s', rawValue: 55 },
    ])
    expect(result.current.status).toBe('saved')
  })

  it('mengirim perubahan yang dibuat saat permintaan simpan sebelumnya masih berjalan', async () => {
    let finish: (() => void) | undefined
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const save = jest.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined)
    const { result } = await renderHook(() => useScoreDraft(assessment.id, assessment, save))
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => {
      result.current.onChangeValue('student-1', 'situp-60s', '30')
    })
    let saving: Promise<void> | undefined
    await act(async () => {
      saving = result.current.persistDraft()
    })
    await act(async () => {
      result.current.onChangeValue('student-1', 'situp-60s', '55')
    })
    await act(async () => {
      finish?.()
      await saving
    })
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1]?.[0]).toEqual([
      { studentId: 'student-1', indicatorId: 'situp-60s', rawValue: 55 },
    ])
    expect(result.current.status).toBe('saved')
  })
})
