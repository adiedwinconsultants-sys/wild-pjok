import {
  type Indicator,
  type RawScoreInput,
  ScoringError,
  type Sex,
  computeAssessment,
} from '@pjok/shared'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  ErrorState,
  LoadingState,
  Screen,
  StatusBadge,
  TextField,
} from '../../../src/components'
import {
  useAssessment,
  useFinalizeAssessment,
  useSaveScores,
} from '../../../src/features/assessments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { formatDate, formatScore } from '../../../src/lib/format'
import { colors, radius, spacing, typography } from '../../../src/theme/tokens'

type DraftValues = Record<string, string>
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function scoreKey(studentId: string, indicatorId: string): string {
  return `${studentId}:${indicatorId}`
}

function ageAt(birthDate: string, date: string): number {
  const birth = new Date(`${birthDate}T00:00:00Z`)
  const at = new Date(`${date}T00:00:00Z`)
  let age = at.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = at.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1
  return Math.max(age, 0)
}

export default function AssessmentInputScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const assessmentId = typeof params.id === 'string' ? params.id : ''
  const assessment = useAssessment(assessmentId)
  const saveScores = useSaveScores(assessmentId)
  const finalize = useFinalizeAssessment(assessmentId)

  const [draft, setDraft] = useState<DraftValues>({})
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const hydrated = useRef(false)
  const dirty = useRef(false)
  const draftRef = useRef<DraftValues>({})
  const saveRef = useRef(saveScores.mutateAsync)
  saveRef.current = saveScores.mutateAsync

  const editable = assessment.data?.status !== 'finalized'
  const instrument = assessment.data?.instrument
  const participants = assessment.data?.participants ?? []

  useEffect(() => {
    if (!assessment.data || hydrated.current) return
    const localKey = `pjok.draft.${assessmentId}`
    const serverDraft: DraftValues = {}
    for (const score of assessment.data.scores) {
      serverDraft[scoreKey(score.studentId, score.indicatorId)] = String(score.rawValue)
    }
    const load = async () => {
      const stored = await AsyncStorage.getItem(localKey)
      let merged = serverDraft
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as DraftValues
          merged = { ...serverDraft, ...parsed }
        } catch {
          merged = serverDraft
        }
      }
      setDraft(merged)
      draftRef.current = merged
      setSelectedStudentId(assessment.data?.participants[0]?.id ?? '')
      hydrated.current = true
    }
    void load()
  }, [assessment.data, assessmentId])

  useEffect(() => {
    if (!hydrated.current) return
    draftRef.current = draft
    void AsyncStorage.setItem(`pjok.draft.${assessmentId}`, JSON.stringify(draft))
    if (!dirty.current) return
    const timer = setTimeout(() => {
      void persistDraft()
    }, 800)
    return () => clearTimeout(timer)
  }, [draft, assessmentId])

  async function persistDraft(): Promise<void> {
    if (!instrument) return
    const scores = Object.entries(draftRef.current)
      .filter(([, value]) => value.trim() !== '' && !Number.isNaN(Number(value)))
      .map(([key, value]) => {
        const [studentId, indicatorId] = key.split(':')
        return {
          studentId: studentId ?? '',
          indicatorId: indicatorId ?? '',
          rawValue: Number(value),
        }
      })
      .filter((score) => score.studentId && score.indicatorId)
    if (scores.length === 0) return
    setStatus('saving')
    try {
      await saveRef.current(scores)
      dirty.current = false
      setStatus('saved')
    } catch (error) {
      setStatus('error')
      setActionError(errorMessage(error))
    }
  }

  const onChangeValue = (studentId: string, indicatorId: string, value: string) => {
    dirty.current = true
    setStatus('idle')
    setDraft((current) => ({ ...current, [scoreKey(studentId, indicatorId)]: value }))
  }

  const filledFor = (studentId: string): number => {
    if (!instrument) return 0
    return instrument.indicators.filter(
      (indicator) => (draft[scoreKey(studentId, indicator.id)] ?? '').trim() !== '',
    ).length
  }

  const preview = useMemo(() => {
    if (!instrument || !assessment.data || !selectedStudentId) return null
    const student = participants.find((item) => item.id === selectedStudentId)
    if (!student) return null
    const inputs: RawScoreInput[] = []
    for (const indicator of instrument.indicators) {
      const raw = draft[scoreKey(student.id, indicator.id)]
      if (raw === undefined || raw.trim() === '') continue
      const value = Number(raw)
      if (Number.isNaN(value)) continue
      inputs.push({
        indicatorId: indicator.id,
        rawValue: value,
        sex: student.sex as Sex,
        age: ageAt(student.birthDate, assessment.data.date),
      })
    }
    try {
      const computed = computeAssessment(instrument, inputs)
      return { computed, complete: true }
    } catch (error) {
      if (error instanceof ScoringError) return { computed: null, complete: false }
      throw error
    }
  }, [instrument, assessment.data, selectedStudentId, participants, draft])

  const onFinalize = () => {
    if (!instrument) return
    const incomplete = participants.filter(
      (student) => filledFor(student.id) < instrument.indicators.filter((i) => i.required).length,
    )
    if (incomplete.length > 0) {
      Alert.alert(
        'Nilai belum lengkap',
        `Masih ada ${incomplete.length} siswa dengan indikator kosong: ${incomplete
          .slice(0, 4)
          .map((student) => student.fullName)
          .join(', ')}${incomplete.length > 4 ? ', ...' : ''}.`,
      )
      return
    }
    Alert.alert(
      'Finalisasi asesmen?',
      'Setelah final, nilai tidak dapat diubah tanpa membuka ulang asesmen dan tercatat di audit.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Finalisasi',
          onPress: async () => {
            setActionError(null)
            try {
              await persistDraft()
              await finalize.mutateAsync()
              await AsyncStorage.removeItem(`pjok.draft.${assessmentId}`)
              router.replace(`/assessments/${assessmentId}/results`)
            } catch (error) {
              setActionError(errorMessage(error))
            }
          },
        },
      ],
    )
  }

  if (assessment.isLoading) {
    return (
      <Screen>
        <LoadingState message="Memuat asesmen..." />
      </Screen>
    )
  }

  if (assessment.isError || !assessment.data || !instrument) {
    return (
      <Screen>
        <ErrorState message={errorMessage(assessment.error)} onRetry={() => assessment.refetch()} />
      </Screen>
    )
  }

  const selectedStudent = participants.find((item) => item.id === selectedStudentId)

  return (
    <Screen>
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>{instrument.name}</Text>
            <Text style={styles.meta}>
              {formatDate(assessment.data.date)} · {participants.length} peserta
            </Text>
          </View>
          <StatusBadge status={assessment.data.status} />
        </View>
        <Text style={styles.saveStatus}>
          {status === 'saving'
            ? 'Menyimpan draf...'
            : status === 'saved'
              ? 'Draf tersimpan di server'
              : status === 'error'
                ? 'Gagal menyimpan draf'
                : 'Perubahan tersimpan otomatis'}
        </Text>
        {!editable ? (
          <Button
            title="Lihat hasil"
            variant="secondary"
            onPress={() => router.push(`/assessments/${assessmentId}/results`)}
          />
        ) : null}
      </Card>

      <View style={styles.studentTabs}>
        {participants.map((student) => {
          const total = instrument.indicators.length
          const filled = filledFor(student.id)
          const active = student.id === selectedStudentId
          return (
            <Pressable
              key={student.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedStudentId(student.id)}
              style={[styles.studentTab, active && styles.studentTabActive]}
            >
              <Text style={[styles.studentTabName, active && styles.studentTabNameActive]}>
                {student.fullName}
              </Text>
              <Text style={[styles.studentTabProgress, active && styles.studentTabNameActive]}>
                {filled}/{total}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {selectedStudent ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedStudent.fullName}</Text>
            <Badge
              label={`${filledFor(selectedStudent.id)}/${instrument.indicators.length} indikator`}
              tone={
                filledFor(selectedStudent.id) === instrument.indicators.length
                  ? 'success'
                  : 'warning'
              }
            />
          </View>

          <View style={styles.list}>
            {instrument.indicators.map((indicator) => {
              const value = draft[scoreKey(selectedStudent.id, indicator.id)] ?? ''
              const missing = indicator.required && value.trim() === ''
              return (
                <IndicatorField
                  key={indicator.id}
                  indicator={indicator}
                  value={value}
                  missing={missing}
                  editable={editable}
                  onChange={(next) => onChangeValue(selectedStudent.id, indicator.id, next)}
                />
              )
            })}
          </View>

          <Card style={styles.previewCard}>
            <Text style={styles.sectionTitle}>Perkiraan nilai</Text>
            {preview?.computed ? (
              <>
                <View style={styles.previewRow}>
                  <Text style={styles.previewScore}>
                    {formatScore(preview.computed.finalScore)}
                  </Text>
                  <CategoryBadge
                    category={preview.computed.category.category}
                    label={preview.computed.category.label}
                  />
                </View>
                <Text style={styles.meta}>
                  Nilai proses {formatScore(preview.computed.processScore)} · nilai produk{' '}
                  {formatScore(preview.computed.productScore)}. Angka final dihitung ulang server
                  saat finalisasi.
                </Text>
              </>
            ) : (
              <Text style={styles.meta}>
                Lengkapi seluruh indikator wajib untuk melihat perkiraan nilai.
              </Text>
            )}
          </Card>
        </>
      ) : null}

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {editable ? (
        <View style={styles.actions}>
          <Button
            title={saveScores.isPending ? 'Menyimpan...' : 'Simpan draf'}
            variant="secondary"
            fullWidth={false}
            loading={saveScores.isPending}
            onPress={() => void persistDraft()}
            style={styles.flex}
          />
          <Button
            title={finalize.isPending ? 'Memfinalisasi...' : 'Finalisasi'}
            fullWidth={false}
            loading={finalize.isPending}
            onPress={onFinalize}
            style={styles.flex}
          />
        </View>
      ) : null}
    </Screen>
  )
}

function IndicatorField({
  indicator,
  value,
  missing,
  editable,
  onChange,
}: {
  indicator: Indicator
  value: string
  missing: boolean
  editable: boolean
  onChange: (value: string) => void
}) {
  return (
    <Card style={missing ? styles.missingCard : undefined}>
      <View style={styles.row}>
        <Text style={styles.indicatorName}>{indicator.name}</Text>
        <Badge label={indicator.kind === 'process' ? 'Proses' : 'Produk'} />
      </View>
      <Text style={styles.meta}>
        {indicator.description} · {indicator.unit} ·{' '}
        {indicator.higherIsBetter ? 'semakin besar lebih baik' : 'semakin kecil lebih baik'}
      </Text>
      <TextField
        label={`Nilai (${indicator.unit})`}
        keyboardType="decimal-pad"
        value={value}
        editable={editable}
        onChangeText={onChange}
        error={missing ? 'Wajib diisi' : undefined}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xs },
  title: { ...typography.heading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted, lineHeight: 20 },
  saveStatus: { ...typography.small, color: colors.textMuted },
  studentTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  studentTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  studentTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  studentTabName: { ...typography.small, color: colors.text, fontWeight: '600' },
  studentTabNameActive: { color: colors.textInverse },
  studentTabProgress: { ...typography.small, color: colors.textMuted },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  list: { gap: spacing.md, marginTop: spacing.md },
  missingCard: { borderColor: colors.accent },
  indicatorName: { ...typography.subheading, color: colors.text, flex: 1 },
  previewCard: { marginTop: spacing.lg },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewScore: { ...typography.title, color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.md },
})
