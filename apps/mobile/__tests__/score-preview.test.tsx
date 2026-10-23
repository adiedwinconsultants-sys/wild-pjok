import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'assessment-1' }),
}))

jest.mock('../src/features/assessments/hooks', () => {
  const { INSTRUMENTS } = require('@pjok/shared')
  const instrument = INSTRUMENTS.find((item: { slug: string }) => item.slug === 'tksi-kekuatan')
  const assessment = {
    id: 'assessment-1',
    teacherId: 'teacher-1',
    classId: 'class-1',
    instrumentId: instrument.id,
    date: '2026-10-01',
    status: 'draft',
    finalizedAt: null,
    reopenedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    instrument,
    participantIds: ['student-1'],
    participants: [
      {
        id: 'student-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        fullName: 'Siswa Uji',
        nis: '1234',
        sex: 'L',
        birthDate: '2012-01-31',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    scores: [],
    results: [],
  }
  return {
    useAssessment: () => ({
      data: assessment,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    }),
    useSaveScores: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useFinalizeAssessment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  }
})

import AssessmentInputScreen from '../app/(app)/assessments/[id]'

describe('Input nilai', () => {
  it('menampilkan perkiraan nilai dan kategori dari input mentah', async () => {
    await render(<AssessmentInputScreen />)

    const field = await screen.findByLabelText('Nilai (repetisi)')
    expect(screen.getByText('Wajib diisi')).toBeTruthy()
    expect(
      screen.getByText('Lengkapi seluruh indikator wajib untuk melihat perkiraan nilai.'),
    ).toBeTruthy()

    await fireEvent.changeText(field, '55')

    await waitFor(() => {
      expect(screen.getByText('100')).toBeTruthy()
      expect(screen.getByText('Sangat Baik')).toBeTruthy()
    })
  })
})
