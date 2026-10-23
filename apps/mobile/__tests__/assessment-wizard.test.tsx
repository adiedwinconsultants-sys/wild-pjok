import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

const mockCreateAssessment = jest.fn()
const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  router: { replace: mockReplace, push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}))

jest.mock('../src/features/classes/hooks', () => ({
  useClasses: () => ({
    data: {
      data: [
        {
          id: 'class-1',
          name: 'VII A',
          gradeLevel: 7,
          studentCount: 1,
          academicYear: '2025/2026',
          teacherId: 'teacher-1',
          notes: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useClassStudents: () => ({
    data: {
      data: [
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
      meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}))

jest.mock('../src/features/instruments/hooks', () => {
  const { INSTRUMENTS } = require('@pjok/shared')
  const instrument = INSTRUMENTS.find((item: { slug: string }) => item.slug === 'tksi-kekuatan')
  return {
    useInstruments: () => ({
      data: {
        data: [
          {
            id: instrument.id,
            slug: instrument.slug,
            version: instrument.version,
            group: instrument.group,
            name: instrument.name,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    }),
    useInstrument: () => ({
      data: instrument,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    }),
  }
})

jest.mock('../src/features/assessments/hooks', () => ({
  useCreateAssessment: () => ({
    mutateAsync: mockCreateAssessment,
    isPending: false,
  }),
}))

import NewAssessmentScreen from '../app/(app)/assessments/new'

describe('Wizard asesmen', () => {
  it('mengirim payload draf sesuai pilihan pengguna', async () => {
    mockCreateAssessment.mockResolvedValue({ id: 'assessment-1' })
    await render(<NewAssessmentScreen />)

    await fireEvent.press(screen.getByText('VII A'))
    await fireEvent.press(screen.getByText('Lanjut'))

    await fireEvent.press(screen.getByText(/Kekuatan/))
    await fireEvent.press(screen.getByText('Lanjut'))

    await screen.findByText('Buat draf asesmen')
    await fireEvent.press(screen.getByText('Buat draf asesmen'))

    await waitFor(() => {
      expect(mockCreateAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: 'class-1',
          instrumentId: 'tksi-kekuatan',
          participantIds: ['student-1'],
        }),
      )
    })
  })
})
