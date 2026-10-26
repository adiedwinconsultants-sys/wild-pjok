import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import type { ExportJob } from '../features/assessments/hooks'
import { ApiError, getAccessToken } from './api'
import { env } from './env'

export type ExportSaveResult = 'saved' | 'cancelled' | 'presented'

export async function saveExport(job: ExportJob): Promise<ExportSaveResult> {
  const metadata = exportMetadata(job)
  if (Platform.OS !== 'android') {
    await shareExport(job, 'Simpan laporan ke File')
    return 'presented'
  }
  const permission =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync().catch(() => {
      throw new ApiError(
        500,
        'EXPORT_FOLDER_PICKER_FAILED',
        'Pemilih folder tidak dapat dibuka. Coba lagi.',
      )
    })
  if (!permission.granted) return 'cancelled'
  const target = `${FileSystem.cacheDirectory}${metadata.fileName}`
  let destination: string | null = null
  try {
    const uri = await downloadToCache(metadata)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    destination = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      metadata.fileName.slice(0, -(job.format.length + 1)),
      metadata.mimeType,
    )
    await FileSystem.writeAsStringAsync(destination, base64, {
      encoding: FileSystem.EncodingType.Base64,
    })
    return 'saved'
  } catch (error) {
    if (destination) await removeTemporaryFile(destination)
    if (error instanceof ApiError) throw error
    throw new ApiError(
      500,
      'EXPORT_SAVE_FAILED',
      'Berkas gagal disimpan. Periksa izin folder dan ruang penyimpanan, lalu coba lagi.',
    )
  } finally {
    await removeTemporaryFile(target)
  }
}

export async function shareExport(job: ExportJob, dialogTitle = 'Bagikan laporan'): Promise<void> {
  const metadata = exportMetadata(job)
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError(
      400,
      'EXPORT_SHARING_UNAVAILABLE',
      'Menu berbagi tidak tersedia pada perangkat ini.',
    )
  }
  const target = `${FileSystem.cacheDirectory}${metadata.fileName}`
  try {
    const uri = await downloadToCache(metadata)
    await Sharing.shareAsync(uri, { mimeType: metadata.mimeType, dialogTitle })
  } finally {
    await removeTemporaryFile(target)
  }
}

function exportMetadata(job: ExportJob) {
  if (job.status !== 'completed' || !job.downloadUrl) {
    throw new ApiError(409, 'EXPORT_NOT_READY', 'Berkas ekspor belum tersedia')
  }
  if (Platform.OS === 'web') {
    throw new ApiError(
      400,
      'EXPORT_WEB_UNSUPPORTED',
      'Unduhan berkas tersedia melalui aplikasi mobile.',
    )
  }
  if (!FileSystem.cacheDirectory) {
    throw new ApiError(
      500,
      'EXPORT_STORAGE_UNAVAILABLE',
      'Penyimpanan sementara tidak tersedia. Mulai ulang aplikasi dan coba lagi.',
    )
  }
  const token = getAccessToken()
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Sesi telah berakhir. Silakan masuk kembali.')
  return {
    fileName: safeFileName(job),
    downloadUrl: validatedDownloadUrl(job),
    mimeType:
      job.format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf',
  }
}

async function downloadToCache(metadata: ReturnType<typeof exportMetadata>): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Sesi telah berakhir. Silakan masuk kembali.')
  const target = `${FileSystem.cacheDirectory}${metadata.fileName}`
  const result = await FileSystem.downloadAsync(metadata.downloadUrl, target, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (result.status !== 200)
    throw new ApiError(result.status, 'EXPORT_DOWNLOAD_FAILED', 'Gagal mengunduh berkas ekspor')
  return result.uri
}

async function removeTemporaryFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true })
  } catch {
    // Kegagalan membersihkan salinan sementara tidak membatalkan penyimpanan yang sudah berhasil.
  }
}

function safeFileName(job: ExportJob): string {
  const fileName = job.fileName ?? `laporan-${job.id}.${job.format}`
  const validName = /^[A-Za-z0-9][A-Za-z0-9._-]{0,179}$/.test(fileName)
  if (!validName || !fileName.endsWith(`.${job.format}`)) {
    throw new ApiError(400, 'EXPORT_FILE_NAME_INVALID', 'Nama berkas ekspor tidak valid')
  }
  return fileName
}

function validatedDownloadUrl(job: ExportJob): string {
  const apiUrl = new URL(env.apiUrl)
  let downloadUrl: URL
  try {
    downloadUrl = new URL(job.downloadUrl ?? '', apiUrl)
  } catch {
    throw new ApiError(400, 'EXPORT_DOWNLOAD_URL_INVALID', 'Alamat unduhan ekspor tidak valid')
  }

  const apiPath = apiUrl.pathname.replace(/\/+$/, '')
  const expectedPath = `${apiPath}/exports/${encodeURIComponent(job.id)}/download`
  if (
    downloadUrl.origin !== apiUrl.origin ||
    downloadUrl.username.length > 0 ||
    downloadUrl.password.length > 0 ||
    downloadUrl.pathname !== expectedPath ||
    downloadUrl.search.length > 0 ||
    downloadUrl.hash.length > 0
  ) {
    throw new ApiError(400, 'EXPORT_DOWNLOAD_URL_INVALID', 'Alamat unduhan ekspor tidak valid')
  }

  return downloadUrl.toString()
}
