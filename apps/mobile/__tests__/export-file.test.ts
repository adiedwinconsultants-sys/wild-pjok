import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import type { ExportJob } from '../src/features/assessments/hooks'
import { persistSession } from '../src/lib/api'
import { downloadAndShareExport } from '../src/lib/export-file'

jest.mock('../src/lib/env', () => ({
  env: { apiUrl: 'https://api.example.test/v1' },
}))

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
}))

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}))

const job: ExportJob = {
  id: 'export-1',
  format: 'pdf',
  status: 'completed',
  fileName: 'laporan.pdf',
  downloadUrl: '/v1/exports/export-1/download',
  errorMessage: null,
  createdAt: '2026-10-23T00:00:00.000Z',
  completedAt: '2026-10-23T00:00:00.000Z',
}

describe('Unduhan ekspor', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await persistSession({ accessToken: 'test-access-token', refreshToken: 'test-refresh-token' })
    jest.mocked(FileSystem.downloadAsync).mockResolvedValue({
      uri: 'file:///cache/laporan.pdf',
      status: 200,
      headers: {},
      mimeType: 'application/pdf',
    })
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true)
  })

  it.each(['pdf', 'xlsx'] as const)(
    'mengunduh %s tanpa menggandakan prefix /v1 dan membagikan berkas',
    async (format) => {
      const fileName = `laporan.${format}`
      const uri = `file:///cache/${fileName}`
      jest.mocked(FileSystem.downloadAsync).mockResolvedValue({
        uri,
        status: 200,
        headers: {},
        mimeType:
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      await downloadAndShareExport({ ...job, format, fileName })

      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        'https://api.example.test/v1/exports/export-1/download',
        uri,
        { headers: { Authorization: 'Bearer test-access-token' } },
      )
      expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, {
        mimeType:
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Bagikan laporan',
      })
    },
  )

  it('menolak unduhan gagal tanpa membagikan berkas', async () => {
    jest.mocked(FileSystem.downloadAsync).mockResolvedValue({
      uri: 'file:///cache/laporan.pdf',
      status: 404,
      headers: {},
      mimeType: 'application/json',
    })

    await expect(downloadAndShareExport(job)).rejects.toMatchObject({
      status: 404,
      code: 'EXPORT_DOWNLOAD_FAILED',
    })
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('menolak ekspor yang belum memiliki URL unduhan', async () => {
    await expect(
      downloadAndShareExport({ ...job, status: 'processing', downloadUrl: null }),
    ).rejects.toMatchObject({ status: 409, code: 'EXPORT_NOT_READY' })
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('menolak URL unduhan di luar endpoint API sebelum mengirim token', async () => {
    await expect(
      downloadAndShareExport({ ...job, downloadUrl: 'https://attacker.example/collect' }),
    ).rejects.toMatchObject({ status: 400, code: 'EXPORT_DOWNLOAD_URL_INVALID' })

    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('menolak nama berkas yang dapat keluar dari direktori cache', async () => {
    await expect(
      downloadAndShareExport({ ...job, fileName: '../laporan.pdf' }),
    ).rejects.toMatchObject({ status: 400, code: 'EXPORT_FILE_NAME_INVALID' })

    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })
})
