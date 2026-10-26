import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Alert, Platform } from 'react-native'
import { ExportActions } from '../src/features/assessments/ExportActions'
import { saveExport, shareExport } from '../src/lib/export-file'

const mockCreate = jest.fn()
const job = { id: 'export-1', status: 'completed', format: 'pdf' }

jest.mock('../src/features/assessments/hooks', () => ({
  useCreateExport: () => ({ mutateAsync: mockCreate }),
}))
jest.mock('../src/lib/export-file', () => ({ saveExport: jest.fn(), shareExport: jest.fn() }))

describe('aksi laporan', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.replaceProperty(Platform, 'OS', 'android')
    mockCreate.mockResolvedValue(job)
    jest.mocked(saveExport).mockResolvedValue('saved')
  })
  afterEach(() => jest.restoreAllMocks())

  it.each(['Excel', 'PDF'])(
    'tombol Unduh %s menyimpan berkas tanpa membuka berbagi',
    async (label) => {
      await render(<ExportActions assessmentId="assessment-1" />)
      await fireEvent.press(screen.getByText(`Unduh ${label}`))
      await waitFor(() => expect(saveExport).toHaveBeenCalledWith(job))
      expect(mockCreate).toHaveBeenCalledWith({
        assessmentId: 'assessment-1',
        format: label === 'Excel' ? 'xlsx' : 'pdf',
      })
      expect(shareExport).not.toHaveBeenCalled()
      expect(screen.getByText('Laporan disimpan ke folder yang Anda pilih.')).toBeTruthy()
    },
  )

  it('pembatalan tidak menampilkan pesan berhasil', async () => {
    jest.mocked(saveExport).mockResolvedValue('cancelled')
    await render(<ExportActions assessmentId="assessment-1" />)
    await fireEvent.press(screen.getByText('Unduh PDF'))
    await waitFor(() => expect(screen.getByText('Penyimpanan dibatalkan.')).toBeTruthy())
    expect(screen.queryByText('Laporan disimpan ke folder yang Anda pilih.')).toBeNull()
  })

  it('berbagi hanya dijalankan setelah memilih aksi Bagikan dan format', async () => {
    const alert = jest.spyOn(Alert, 'alert')
    await render(<ExportActions assessmentId="assessment-1" />)
    await fireEvent.press(screen.getByText('Bagikan laporan'))
    expect(shareExport).not.toHaveBeenCalled()
    const pdf = alert.mock.calls[0]?.[2]?.find((button) => button.text === 'PDF')
    await act(async () => {
      pdf?.onPress?.()
    })
    await waitFor(() => expect(shareExport).toHaveBeenCalledWith(job))
    expect(saveExport).not.toHaveBeenCalled()
  })

  it('tetap menunggu penyimpanan dan menolak penekanan berulang', async () => {
    let finish: ((value: 'saved') => void) | undefined
    jest.mocked(saveExport).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await render(<ExportActions assessmentId="assessment-1" />)
    await fireEvent.press(screen.getByText('Unduh PDF'))
    await waitFor(() => expect(saveExport).toHaveBeenCalled())
    const button = screen.getByRole('button', { name: 'Unduh PDF' })
    expect(button.props.accessibilityState.disabled).toBe(true)
    await fireEvent.press(button)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    await act(async () => {
      finish?.('saved')
    })
  })

  it('meneruskan kegagalan simpan ke layar tanpa menampilkan sukses', async () => {
    jest.mocked(saveExport).mockRejectedValue(new Error('Penyimpanan penuh.'))
    await render(<ExportActions assessmentId="assessment-1" />)
    await fireEvent.press(screen.getByText('Unduh PDF'))
    await waitFor(() => expect(screen.getByText('Penyimpanan penuh.')).toBeTruthy())
    expect(screen.queryByText('Laporan disimpan ke folder yang Anda pilih.')).toBeNull()
  })
})
