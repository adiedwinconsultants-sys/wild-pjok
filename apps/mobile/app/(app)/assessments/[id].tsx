import { type RawScoreInput, ScoringError, type Sex, computeAssessment } from '@pjok/shared'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  ErrorState,
  LoadingState,
  Screen,
  SectionLabel,
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
  const statusColor =
    status === 'error'
      ? colors.danger
      : status === 'saved'
        ? colors.highlight
        : status === 'saving'
          ? colors.accent
          : 'rgba(250, 246, 234, 0.45)'
  const statusText =
    status === 'saving'
      ? 'Menyimpan draf...'
      : status === 'saved'
        ? 'Draf tersimpan di server'
        : status === 'error'
          ? 'Gagal menyimpan draf'
          : 'Perubahan tersimpan otomatis'

  return (
    <Screen>
      <Card variant="ink" style={styles.board}>
        <SectionLabel tone="inverse">Lembar nilai</SectionLabel>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>{instrument.name}</Text>
            <Text style={styles.metaInverse}>
              {formatDate(assessment.data.date)} · {participants.length} peserta
            </Text>
          </View>
          <StatusBadge status={assessment.data.status} />
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.saveStatus}>{statusText}</Text>
        </View>
        {!editable ? (
          <Button
            title="Lihat hasil"
            variant="secondary"
            onPress={() => router.push(`/assessments/${assessmentId}/results`)}
          />
        ) : null}
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.studentTabs}
      >
        {participants.map((student) => {
          const total = instrument.indicators.length
          const filled = filledFor(student.id)
          const active = student.id === selectedStudentId
          const complete = filled === total
          return (
            <Pressable
              key={student.id}
              accessibilityRole="tab"
              accessibilityLabel={`${student.fullName}, ${filled} dari ${total} indikator terisi`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedStudentId(student.id)}
              style={[styles.studentTab, active && styles.studentTabActive]}
            >
              <Text
                style={[styles.studentTabName, active && styles.studentTabNameActive]}
                numberOfLines={1}
              >
                {student.fullName}
              </Text>
              <Text
                style={[
                  styles.studentTabProgress,
                  complete && styles.studentTabProgressDone,
                  active && styles.studentTabNameActive,
                ]}
              >
                {filled}/{total}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {selectedStudent ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.flex}>
              <SectionLabel>Indikator</SectionLabel>
              <Text style={styles.sectionMeta}>{selectedStudent.fullName}</Text>
            </View>
            <Badge
              label={`${filledFor(selectedStudent.id)}/${instrument.indicators.length} terisi`}
              tone={
                filledFor(selectedStudent.id) === instrument.indicators.length
                  ? 'success'
                  : 'warning'
              }
            />
          </View>

          <Card style={styles.sheet}>
            {instrument.indicators.map((indicator, index) => {
              const value = draft[scoreKey(selectedStudent.id, indicator.id)] ?? ''
              const missing = indicator.required && value.trim() === ''
              return (
                <View
                  key={indicator.id}
                  style={[
                    styles.sheetRow,
                    index > 0 && styles.sheetDivider,
                    missing && styles.sheetRowMissing,
                  ]}
                >
                  <View style={styles.row}>
                    <Text style={[styles.indicatorIndex, missing && styles.indicatorIndexMissing]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <Text style={styles.indicatorName}>{indicator.name}</Text>
                    <Badge label={indicator.kind === 'process' ? 'Proses' : 'Produk'} />
                  </View>
                  <Text style={styles.indicatorDescription}>{indicator.description}</Text>
                  <TextField
                    label={`Nilai (${indicator.unit})`}
                    keyboardType="decimal-pad"
                    value={value}
                    editable={editable}
                    onChangeText={(next) => onChangeValue(selectedStudent.id, indicator.id, next)}
                    error={missing ? 'Wajib diisi' : undefined}
                  />
                </View>
              )
            })}
          </Card>

          <Card variant="ink" style={styles.previewCard}>
            <SectionLabel tone="inverse">Perkiraan nilai</SectionLabel>
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
                <Text style={styles.previewMeta}>
                  Nilai proses {formatScore(preview.computed.processScore)} · nilai produk{' '}
                  {formatScore(preview.computed.productScore)}. Angka final dihitung ulang server
                  saat finalisasi.
                </Text>
              </>
            ) : (
              <Text style={styles.previewMeta}>
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

const styles = StyleSheet.create({
  board: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xs },
  title: { ...typography.heading, color: colors.textInverse },
  metaInverse: { ...typography.small, color: 'rgba(255, 255, 255, 0.72)', lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 7, height: 7, borderRadius: radius.pill },
  saveStatus: { ...typography.label, color: 'rgba(250, 246, 234, 0.62)' },
  studentTabs: { gap: spacing.sm, marginTop: spacing.lg, paddingRight: spacing.lg },
  studentTab: {
    minWidth: 132,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    gap: 2,
  },
  studentTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  studentTabName: { ...typography.small, color: colors.text, maxWidth: 156 },
  studentTabNameActive: { color: colors.textInverse },
  studentTabProgress: { ...typography.label, color: colors.textMuted },
  studentTabProgressDone: { color: colors.success },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionMeta: { ...typography.small, color: colors.textMuted },
  sheet: { marginTop: spacing.sm, padding: 0, gap: 0, overflow: 'hidden' },
  sheetRow: { padding: spacing.lg, gap: spacing.sm },
  sheetDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sheetRowMissing: { backgroundColor: colors.dangerSoft },
  indicatorIndex: { ...typography.monoStrong, color: colors.accent },
  indicatorIndexMissing: { color: colors.danger },
  indicatorName: { ...typography.subheading, color: colors.text, flex: 1 },
  indicatorDescription: { ...typography.small, color: colors.textMuted, lineHeight: 20 },
  previewCard: { marginTop: spacing.lg, gap: spacing.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewScore: { ...typography.display, color: colors.highlight, fontSize: 62, lineHeight: 60 },
  previewMeta: { ...typography.small, color: 'rgba(250, 246, 234, 0.68)' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.md },
})
