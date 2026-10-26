import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import type { ExportJob } from '../features/assessments/hooks'
import { ApiError, getAccessToken } from './api'
import { env } from './env'

export async function downloadAndShareExport(job: ExportJob): Promise<void> {
  if (!job.downloadUrl) {
    throw new ApiError(409, 'EXPORT_NOT_READY', 'Berkas ekspor belum tersedia')
  }
  if (Platform.OS === 'web') {
    throw new ApiError(
      400,
      'EXPORT_WEB_UNSUPPORTED',
      'Unduhan berkas tersedia melalui aplikasi mobile.',
    )
  }

  const token = getAccessToken()
  const fileName = safeFileName(job)
  const target = `${FileSystem.cacheDirectory ?? ''}${fileName}`
  const downloadUrl = validatedDownloadUrl(job)
  const result = await FileSystem.downloadAsync(downloadUrl, target, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (result.status !== 200) {
    throw new ApiError(result.status, 'EXPORT_DOWNLOAD_FAILED', 'Gagal mengunduh berkas ekspor')
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType:
        job.format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      dialogTitle: 'Bagikan laporan',
    })
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
