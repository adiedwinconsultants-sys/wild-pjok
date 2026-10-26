import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import type { ExportJob } from '../src/features/assessments/hooks'
import { clearSession, persistSession } from '../src/lib/api'
import { saveExport, shareExport } from '../src/lib/export-file'

jest.mock('../src/lib/env', () => ({
  env: { apiUrl: 'https://api.example.test/v1' },
}))

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
  },
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
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
    jest.replaceProperty(Platform, 'OS', 'android')
    jest
      .mocked(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync)
      .mockResolvedValue({ granted: true, directoryUri: 'content://documents/tree/reports' })
    jest
      .mocked(FileSystem.StorageAccessFramework.createFileAsync)
      .mockResolvedValue('content://documents/report')
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue('JVBERi0xLjc=')
    jest.mocked(FileSystem.writeAsStringAsync).mockResolvedValue(undefined)
    jest.mocked(FileSystem.deleteAsync).mockResolvedValue(undefined)
    await persistSession({ accessToken: 'test-access-token', refreshToken: 'test-refresh-token' })
    jest.mocked(FileSystem.downloadAsync).mockResolvedValue({
      uri: 'file:///cache/laporan.pdf',
      status: 200,
      headers: {},
      mimeType: 'application/pdf',
    })
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true)
  })

  afterEach(() => jest.restoreAllMocks())

  it('pembatalan pemilih folder tidak mengunduh atau membuka menu berbagi', async () => {
    jest
      .mocked(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync)
      .mockResolvedValue({ granted: false })
    await expect(saveExport(job)).resolves.toBe('cancelled')
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
    expect(FileSystem.StorageAccessFramework.createFileAsync).not.toHaveBeenCalled()
  })

  it.each(['pdf', 'xlsx'] as const)(
    'menyimpan %s ke folder pilihan tanpa berbagi dan membersihkan cache',
    async (format) => {
      const fileName = `laporan.${format}`
      const mime =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      jest.mocked(FileSystem.downloadAsync).mockResolvedValue({
        uri: `file:///cache/${fileName}`,
        status: 200,
        headers: {},
        mimeType: mime,
      })
      await expect(saveExport({ ...job, format, fileName })).resolves.toBe('saved')
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(`file:///cache/${fileName}`, {
        encoding: 'base64',
      })
      expect(FileSystem.StorageAccessFramework.createFileAsync).toHaveBeenCalledWith(
        'content://documents/tree/reports',
        'laporan',
        mime,
      )
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        'content://documents/report',
        'JVBERi0xLjc=',
        { encoding: 'base64' },
      )
      expect(Sharing.shareAsync).not.toHaveBeenCalled()
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(`file:///cache/${fileName}`, {
        idempotent: true,
      })
      expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(
        'content://documents/report',
        expect.anything(),
      )
    },
  )

  it('kegagalan tulis tidak dianggap berhasil dan menghapus berkas kosong yang baru dibuat', async () => {
    jest.mocked(FileSystem.writeAsStringAsync).mockRejectedValue(new Error('Storage full'))
    await expect(saveExport(job)).rejects.toMatchObject({ code: 'EXPORT_SAVE_FAILED' })
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('content://documents/report', {
      idempotent: true,
    })
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/laporan.pdf', {
      idempotent: true,
    })
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('memeriksa ulang sesi setelah pengguna memilih folder', async () => {
    jest
      .mocked(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync)
      .mockImplementationOnce(async () => {
        await clearSession()
        return { granted: true, directoryUri: 'content://documents/tree/reports' }
      })
    await expect(saveExport(job)).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
  })

  it('kegagalan unduh tidak membuat berkas tujuan', async () => {
    jest.mocked(FileSystem.downloadAsync).mockResolvedValue({
      uri: 'file:///cache/laporan.pdf',
      status: 401,
      headers: {},
      mimeType: 'application/json',
    })
    await expect(saveExport(job)).rejects.toMatchObject({
      status: 401,
      code: 'EXPORT_DOWNLOAD_FAILED',
    })
    expect(FileSystem.StorageAccessFramework.createFileAsync).not.toHaveBeenCalled()
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled()
  })

  it('iOS membuka ekspor ke File tanpa mengklaim berkas sudah disimpan', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    await expect(saveExport(job)).resolves.toBe('presented')
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/laporan.pdf', {
      mimeType: 'application/pdf',
      dialogTitle: 'Simpan laporan ke File',
    })
  })

  it('menampilkan error saat menu berbagi tidak tersedia', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false)
    await expect(shareExport(job)).rejects.toMatchObject({ code: 'EXPORT_SHARING_UNAVAILABLE' })
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
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

      await shareExport({ ...job, format, fileName })

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

    await expect(shareExport(job)).rejects.toMatchObject({
      status: 404,
      code: 'EXPORT_DOWNLOAD_FAILED',
    })
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('menolak ekspor yang belum memiliki URL unduhan', async () => {
    await expect(
      shareExport({ ...job, status: 'processing', downloadUrl: null }),
    ).rejects.toMatchObject({ status: 409, code: 'EXPORT_NOT_READY' })
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('menolak URL unduhan di luar endpoint API sebelum mengirim token', async () => {
    await expect(
      shareExport({ ...job, downloadUrl: 'https://attacker.example/collect' }),
    ).rejects.toMatchObject({ status: 400, code: 'EXPORT_DOWNLOAD_URL_INVALID' })

    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('menolak nama berkas yang dapat keluar dari direktori cache', async () => {
    await expect(shareExport({ ...job, fileName: '../laporan.pdf' })).rejects.toMatchObject({
      status: 400,
      code: 'EXPORT_FILE_NAME_INVALID',
    })

    expect(FileSystem.downloadAsync).not.toHaveBeenCalled()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })
})
