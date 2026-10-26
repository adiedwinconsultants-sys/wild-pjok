import { useRef, useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components'
import { errorMessage } from '../../lib/api'
import { saveExport, shareExport } from '../../lib/export-file'
import { colors, spacing, typography } from '../../theme/tokens'
import { useCreateExport } from './hooks'

type Format = 'xlsx' | 'pdf'
type Action = 'save' | 'share'

export function ExportActions({ assessmentId }: { assessmentId: string }) {
  const createExport = useCreateExport()
  const busyRef = useRef(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(action: Action, format: Format) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(`${action}-${format}`)
    setMessage(null)
    setError(null)
    try {
      const job = await createExport.mutateAsync({ assessmentId, format })
      if (action === 'share') {
        await shareExport(job)
      } else {
        const result = await saveExport(job)
        if (result === 'saved') setMessage('Laporan disimpan ke folder yang Anda pilih.')
        if (result === 'cancelled') setMessage('Penyimpanan dibatalkan.')
      }
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const saveLabel = Platform.OS === 'ios' ? 'Ekspor' : 'Unduh'
  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <Button
          title={`${saveLabel} Excel`}
          variant="secondary"
          style={styles.flex}
          disabled={busy !== null}
          loading={busy === 'save-xlsx'}
          onPress={() => void run('save', 'xlsx')}
        />
        <Button
          title={`${saveLabel} PDF`}
          variant="secondary"
          style={styles.flex}
          disabled={busy !== null}
          loading={busy === 'save-pdf'}
          onPress={() => void run('save', 'pdf')}
        />
      </View>
      <Text style={styles.hint}>
        {Platform.OS === 'ios'
          ? 'Pilih Simpan ke File pada menu ekspor untuk menyimpan laporan.'
          : 'Pilih atau buat folder penyimpanan saat diminta.'}
      </Text>
      <Button
        title="Bagikan laporan"
        variant="ghost"
        disabled={busy !== null}
        loading={busy?.startsWith('share-') ?? false}
        onPress={() =>
          Alert.alert('Bagikan laporan', 'Pilih format laporan.', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Excel', onPress: () => void run('share', 'xlsx') },
            { text: 'PDF', onPress: () => void run('share', 'pdf') },
          ])
        }
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.hint}>
          {message}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  hint: { ...typography.small, color: colors.textMuted },
  error: { ...typography.small, color: colors.danger },
})
