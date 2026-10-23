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
  const fileName = job.fileName ?? `laporan-${job.id}.${job.format === 'xlsx' ? 'xlsx' : 'pdf'}`
  const target = `${FileSystem.cacheDirectory ?? ''}${fileName}`
  const result = await FileSystem.downloadAsync(`${env.apiUrl}${job.downloadUrl}`, target, {
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
