import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import ClassFormScreen from '../app/(app)/class-form'
import { shiftAcademicYear } from '../src/features/classes/class-form-options'
import { academicYearNow } from '../src/lib/format'

const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockBack = jest.fn()
let mockEdit = false

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => (mockEdit ? { id: 'class-1' } : {}),
}))

jest.mock('../src/features/classes/hooks', () => ({
  useClass: () => ({
    data: mockEdit
      ? {
          id: 'class-1',
          name: 'Kelas Olahraga',
          gradeLevel: 12,
          academicYear: '2009/2010',
          notes: 'Catatan lama',
        }
      : undefined,
  }),
  useCreateClass: () => ({ mutateAsync: mockCreate }),
  useUpdateClass: () => ({ mutateAsync: mockUpdate }),
}))

describe('input kelas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEdit = false
    mockCreate.mockResolvedValue(undefined)
    mockUpdate.mockResolvedValue(undefined)
  })

  it('membuat kelas dengan pilihan tingkat, nama cepat, dan tahun ajaran tanpa mengetik format', async () => {
    await render(<ClassFormScreen />)
    expect(screen.getByText(academicYearNow())).toBeTruthy()
    await fireEvent.press(screen.getByRole('radio', { name: '8' }))
    await fireEvent.press(screen.getByRole('radio', { name: 'VIII B' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Tahun ajaran sebelumnya' }))
    await fireEvent.press(screen.getByText('Tambah kelas'))
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'VIII B',
        gradeLevel: 8,
        academicYear: shiftAcademicYear(academicYearNow(), -1),
        notes: '',
      }),
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('mempertahankan nama khusus dan tahun ajaran lama saat tingkat diubah', async () => {
    mockEdit = true
    await render(<ClassFormScreen />)
    expect(screen.getByText('2009/2010')).toBeTruthy()
    await fireEvent.press(screen.getByRole('radio', { name: '11' }))
    await fireEvent.press(screen.getByText('Simpan perubahan'))
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Kelas Olahraga',
        gradeLevel: 11,
        academicYear: '2009/2010',
        notes: 'Catatan lama',
      }),
    )
  })

  it('tidak menimpa isian pengguna ketika data kelas dimuat ulang', async () => {
    mockEdit = true
    const { rerender } = await render(<ClassFormScreen />)
    await fireEvent.changeText(screen.getByLabelText('Nama kelas'), 'Nama yang sedang diubah')
    await rerender(<ClassFormScreen />)
    expect(screen.getByLabelText('Nama kelas').props.value).toBe('Nama yang sedang diubah')
  })

  it('menolak nama kosong dan menampilkan kegagalan penyimpanan', async () => {
    mockCreate.mockRejectedValue(new Error('Kelas sudah terdaftar.'))
    await render(<ClassFormScreen />)
    await fireEvent.press(screen.getByText('Tambah kelas'))
    await waitFor(() => expect(screen.getByText('Nama kelas wajib diisi')).toBeTruthy())
    expect(mockCreate).not.toHaveBeenCalled()
    await fireEvent.changeText(screen.getByLabelText('Nama kelas'), 'VII D')
    await fireEvent.press(screen.getByText('Tambah kelas'))
    await waitFor(() => expect(screen.getByText('Kelas sudah terdaftar.')).toBeTruthy())
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('menjaga format tahun ajaran di batas kalender', () => {
    expect(shiftAcademicYear('0000/0001', -1)).toBe('0000/0001')
    expect(shiftAcademicYear('9998/9999', 1)).toBe('9998/9999')
    expect(shiftAcademicYear('2009/2010', 1)).toBe('2010/2011')
  })
})
