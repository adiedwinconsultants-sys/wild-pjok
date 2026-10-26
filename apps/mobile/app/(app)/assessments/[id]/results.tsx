import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  StatusBadge,
  TextField,
} from '../../../../src/components'
import { ExportActions } from '../../../../src/features/assessments/ExportActions'
import {
  type ResultItem,
  useAssessment,
  useAssessmentResults,
  useReopenAssessment,
  useSaveFeedback,
} from '../../../../src/features/assessments/hooks'
import { errorMessage } from '../../../../src/lib/api'
import { formatDate, formatScore } from '../../../../src/lib/format'
import { colors, radius, spacing, typography } from '../../../../src/theme/tokens'

const TEMPLATES = [
  'Pertahankan konsistensi latihan dan tingkatkan intensitas secara bertahap.',
  'Perbaiki teknik dasar agar hasil pengukuran lebih optimal.',
  'Latihan rutin 3 kali seminggu akan membantu peningkatan capaian.',
]

export default function AssessmentResultsScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const assessmentId = typeof params.id === 'string' ? params.id : ''
  const assessment = useAssessment(assessmentId)
  const results = useAssessmentResults(assessmentId)
  const reopen = useReopenAssessment(assessmentId)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showReopen, setShowReopen] = useState(false)
  const [reason, setReason] = useState('')

  const average = useMemo(() => {
    const rows = results.data?.results ?? []
    if (rows.length === 0) return null
    return rows.reduce((sum, row) => sum + row.finalScore, 0) / rows.length
  }, [results.data])

  const onReopen = async () => {
    setActionError(null)
    if (reason.trim().length < 5) {
      setActionError('Alasan minimal 5 karakter.')
      return
    }
    try {
      await reopen.mutateAsync(reason.trim())
      setShowReopen(false)
      setReason('')
      router.replace(`/assessments/${assessmentId}`)
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  if (results.isLoading || assessment.isLoading) {
    return (
      <Screen>
        <LoadingState message="Memuat hasil..." />
      </Screen>
    )
  }

  if (results.isError || assessment.isError || !results.data || !assessment.data) {
    return (
      <Screen>
        <ErrorState
          message={errorMessage(results.error ?? assessment.error)}
          onRetry={() => {
            void results.refetch()
            void assessment.refetch()
          }}
        />
      </Screen>
    )
  }

  if (assessment.data.status === 'draft') {
    return (
      <Screen>
        <EmptyState
          title="Asesmen belum final"
          message="Lengkapi nilai lalu finalisasi untuk melihat hasil dan menulis umpan balik."
          actionLabel="Lanjutkan pengisian"
          onAction={() => router.replace(`/assessments/${assessmentId}`)}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>{results.data.instrument.name}</Text>
            <Text style={styles.meta}>
              {formatDate(assessment.data.date)} · {results.data.results.length} siswa
            </Text>
          </View>
          <StatusBadge status={assessment.data.status} />
        </View>
        <View style={styles.summary}>
          <View>
            <Text style={styles.average}>{formatScore(average)}</Text>
            <Text style={styles.meta}>Rata-rata kelas</Text>
          </View>
          <Badge label="Nilai dihitung server" tone="info" />
        </View>
        <ExportActions assessmentId={assessmentId} />
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      </Card>

      <View style={styles.list}>
        {results.data.results.map((result) => (
          <ResultCard
            key={result.resultId}
            assessmentId={assessmentId}
            result={result}
            onError={setActionError}
          />
        ))}
      </View>

      {assessment.data.status === 'finalized' ? (
        <Card style={styles.reopen}>
          <Text style={styles.sectionTitle}>Buka ulang asesmen</Text>
          <Text style={styles.meta}>
            Gunakan bila ada koreksi data. Tindakan ini dicatat pada audit log beserta alasannya.
          </Text>
          {showReopen ? (
            <>
              <TextField
                label="Alasan pembukaan ulang"
                placeholder="Contoh: koreksi hasil pengukuran ulang"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />
              <View style={styles.actions}>
                <Button
                  title="Batal"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => setShowReopen(false)}
                  style={styles.flex}
                />
                <Button
                  title={reopen.isPending ? 'Membuka...' : 'Buka ulang'}
                  variant="danger"
                  fullWidth={false}
                  loading={reopen.isPending}
                  onPress={() => void onReopen()}
                  style={styles.flex}
                />
              </View>
            </>
          ) : (
            <Button
              title="Buka ulang asesmen"
              variant="secondary"
              onPress={() => setShowReopen(true)}
            />
          )}
        </Card>
      ) : null}
    </Screen>
  )
}

function ResultCard({
  assessmentId,
  result,
  onError,
}: {
  assessmentId: string
  result: ResultItem
  onError: (message: string) => void
}) {
  const saveFeedback = useSaveFeedback(assessmentId)
  const [note, setNote] = useState(result.feedback ?? '')
  const [saved, setSaved] = useState(false)

  const onSave = async () => {
    onError('')
    try {
      await saveFeedback.mutateAsync({ resultId: result.resultId, note: note.trim() })
      setSaved(true)
    } catch (error) {
      onError(errorMessage(error))
    }
  }

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.studentName}>{result.fullName}</Text>
          <Text style={styles.meta}>NIS {result.nis}</Text>
        </View>
        <Text style={styles.score}>{formatScore(result.finalScore)}</Text>
      </View>
      <CategoryBadge category={result.category} label={result.categoryLabel} />
      <Text style={styles.meta}>
        Proses {formatScore(result.processScore)} · Produk {formatScore(result.productScore)}
      </Text>

      <View style={styles.indicatorList}>
        {result.scores.map((score) => (
          <View key={score.indicatorId} style={styles.indicatorRow}>
            <Text style={styles.indicatorName}>{score.indicatorName}</Text>
            <Text style={styles.meta}>
              {score.rawValue} {score.unit} · {formatScore(score.normalizedValue)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.label}>Umpan balik</Text>
      <View style={styles.templates}>
        {TEMPLATES.map((template) => (
          <Pressable
            key={template}
            accessibilityRole="button"
            accessibilityLabel={`Gunakan template: ${template}`}
            onPress={() => {
              setNote(template)
              setSaved(false)
            }}
            style={({ pressed }) => [styles.template, pressed && styles.templatePressed]}
          >
            <Text style={styles.templateText}>{template}</Text>
          </Pressable>
        ))}
      </View>
      <TextField
        accessibilityLabel="Umpan balik untuk siswa"
        placeholder="Tulis umpan balik untuk siswa"
        value={note}
        onChangeText={(value) => {
          setNote(value)
          setSaved(false)
        }}
        multiline
        numberOfLines={3}
        hint={`${note.length}/2000 karakter`}
      />
      <Button
        title={saveFeedback.isPending ? 'Menyimpan...' : saved ? 'Tersimpan' : 'Simpan umpan balik'}
        variant="secondary"
        loading={saveFeedback.isPending}
        onPress={() => void onSave()}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  title: { ...typography.heading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted, lineHeight: 20 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  average: { ...typography.title, color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.sm },
  list: { gap: spacing.md, marginTop: spacing.lg },
  studentName: { ...typography.heading, color: colors.text },
  score: { ...typography.title, color: colors.primary },
  indicatorList: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  indicatorRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  indicatorName: { ...typography.small, color: colors.text, flex: 1 },
  label: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  templates: { gap: spacing.xs },
  template: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  templatePressed: { opacity: 0.8 },
  templateText: { ...typography.small, color: colors.primary },
  reopen: { marginTop: spacing.xl },
  sectionTitle: { ...typography.heading, color: colors.text },
})
