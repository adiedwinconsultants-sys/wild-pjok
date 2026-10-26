import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Platform } from 'react-native'
import StudentFormScreen from '../app/(app)/student-form'

const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockBack = jest.fn()
let mockEdit = false

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({
    classId: 'class-1',
    ...(mockEdit ? { studentId: 'student-1' } : {}),
  }),
}))

jest.mock('../src/features/classes/hooks', () => ({
  useClassStudents: () => ({
    data: {
      data: [
        { id: 'student-1', fullName: 'Siswa Uji', nis: '00123', sex: 'L', birthDate: '2012-01-31' },
      ],
    },
  }),
  useCreateStudent: () => ({ mutateAsync: mockCreate }),
  useUpdateStudent: () => ({ mutateAsync: mockUpdate }),
}))

describe('form siswa', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEdit = false
    mockCreate.mockResolvedValue(undefined)
    mockUpdate.mockResolvedValue(undefined)
    jest.replaceProperty(Platform, 'OS', 'android')
  })
  afterEach(() => jest.restoreAllMocks())

  it('menambahkan siswa dengan tanggal dari date picker', async () => {
    await render(<StudentFormScreen />)
    await fireEvent.changeText(screen.getByLabelText('Nama lengkap'), 'Siswa Uji')
    await fireEvent.changeText(screen.getByLabelText('NIS'), '00123')
    await fireEvent.press(screen.getByRole('button', { name: 'Tanggal lahir' }))
    const options = jest.mocked(DateTimePickerAndroid.open).mock.calls[0]?.[0]
    const selected = new Date(2012, 1, 29, 12)
    await act(async () => {
      options?.onValueChange?.(
        { nativeEvent: { timestamp: selected.getTime(), utcOffset: 420 } },
        selected,
      )
    })
    await fireEvent.press(screen.getByText('Tambah siswa'))
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        fullName: 'Siswa Uji',
        nis: '00123',
        sex: 'L',
        birthDate: '2012-02-29',
      }),
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('mempertahankan tanggal lahir dan NIS saat mengubah siswa', async () => {
    mockEdit = true
    await render(<StudentFormScreen />)
    expect(screen.getByText('31 Januari 2012')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Nama lengkap'), 'Siswa Uji Baru')
    await fireEvent.press(screen.getByText('Simpan perubahan'))
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        studentId: 'student-1',
        input: { fullName: 'Siswa Uji Baru', nis: '00123', sex: 'L', birthDate: '2012-01-31' },
      }),
    )
  })

  it('menolak form yang belum memilih tanggal lahir', async () => {
    await render(<StudentFormScreen />)
    await fireEvent.changeText(screen.getByLabelText('Nama lengkap'), 'Siswa Uji')
    await fireEvent.changeText(screen.getByLabelText('NIS'), '00123')
    await fireEvent.press(screen.getByText('Tambah siswa'))
    await waitFor(() => expect(screen.getByText('Tanggal harus berformat YYYY-MM-DD')).toBeTruthy())
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
