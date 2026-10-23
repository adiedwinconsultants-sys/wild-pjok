import * as DocumentPicker from 'expo-document-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Badge, Button, Card, Screen } from '../../src/components'
import { type StudentImportResult, useImportStudents } from '../../src/features/classes/hooks'
import { errorMessage } from '../../src/lib/api'
import { colors, spacing, typography } from '../../src/theme/tokens'

type PickedAsset = { uri: string; name: string; mimeType?: string; file?: File }

export default function ImportStudentsScreen() {
  const params = useLocalSearchParams<{ classId?: string }>()
  const classId = typeof params.classId === 'string' ? params.classId : ''
  const importStudents = useImportStudents(classId)
  const [asset, setAsset] = useState<PickedAsset | null>(null)
  const [preview, setPreview] = useState<StudentImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pickFile = async () => {
    setError(null)
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (result.canceled) return
    const selected = result.assets[0]
    if (!selected) return
    const picked: PickedAsset = {
      uri: selected.uri,
      name: selected.name,
      ...(selected.mimeType ? { mimeType: selected.mimeType } : {}),
      ...('file' in selected && selected.file ? { file: selected.file } : {}),
    }
    setAsset(picked)
    setPreview(null)
    try {
      const summary = await importStudents.mutateAsync({ asset: picked, dryRun: true })
      setPreview(summary)
    } catch (previewError) {
      setError(errorMessage(previewError))
    }
  }

  const commit = async () => {
    if (!asset) return
    setError(null)
    try {
      const summary = await importStudents.mutateAsync({ asset, dryRun: false })
      setPreview(summary)
      Alert.alert(
        'Impor selesai',
        `${summary.inserted} siswa ditambahkan. ${summary.duplicates.length} duplikat dan ${summary.errors.length} baris gagal dilewati.`,
        [{ text: 'Selesai', onPress: () => router.back() }],
      )
    } catch (commitError) {
      setError(errorMessage(commitError))
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Impor dari Excel</Text>
        <Text style={styles.subtitle}>
          Gunakan kolom Nama, NIS, Jenis Kelamin (L/P), dan Tanggal Lahir (YYYY-MM-DD). Maksimal 2
          MB.
        </Text>
      </View>

      <Card>
        <Button
          title={asset ? 'Pilih file lain' : 'Pilih file .xlsx'}
          variant="secondary"
          onPress={() => void pickFile()}
          loading={importStudents.isPending && !preview}
        />
        {asset ? <Text style={styles.fileName}>{asset.name}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      {preview ? (
        <Card style={styles.preview}>
          <Text style={styles.cardTitle}>Pratinjau</Text>
          <View style={styles.badges}>
            <Badge label={`${preview.valid.length} valid`} tone="success" />
            <Badge label={`${preview.duplicates.length} duplikat`} tone="warning" />
            <Badge label={`${preview.errors.length} gagal`} tone="danger" />
          </View>

          {preview.duplicates.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duplikat NIS</Text>
              {preview.duplicates.map((row) => (
                <Text key={`dup-${row.rowNumber}`} style={styles.rowText}>
                  Baris {row.rowNumber}: {row.fullName} ({row.nis})
                </Text>
              ))}
            </View>
          ) : null}

          {preview.errors.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Baris bermasalah</Text>
              {preview.errors.map((row) => (
                <Text key={`err-${row.rowNumber}`} style={styles.rowText}>
                  Baris {row.rowNumber}: {row.message}
                </Text>
              ))}
            </View>
          ) : null}

          {preview.valid.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Siap disimpan</Text>
              {preview.valid.map((row) => (
                <Text key={`ok-${row.rowNumber}`} style={styles.rowText}>
                  Baris {row.rowNumber}: {row.fullName} ({row.nis})
                </Text>
              ))}
            </View>
          ) : null}

          {!preview.dryRun ? (
            <Text style={styles.success}>{preview.inserted} siswa berhasil ditambahkan.</Text>
          ) : (
            <Button
              title="Simpan yang valid"
              onPress={() => void commit()}
              loading={importStudents.isPending}
              disabled={preview.valid.length === 0}
            />
          )}
        </Card>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  fileName: { ...typography.small, color: colors.textMuted },
  error: { ...typography.small, color: colors.danger },
  preview: { marginTop: spacing.lg },
  cardTitle: { ...typography.heading, color: colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  sectionTitle: { ...typography.subheading, color: colors.text },
  rowText: { ...typography.small, color: colors.textMuted },
  success: { ...typography.small, color: colors.success },
})
