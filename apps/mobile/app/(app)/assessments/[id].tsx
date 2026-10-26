import { type RawScoreInput, ScoringError, type Sex, computeAssessment } from '@pjok/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
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
import { assessmentInputStyles as styles } from '../../../src/features/assessments/assessment-input-styles'
import {
  useAssessment,
  useFinalizeAssessment,
  useSaveScores,
} from '../../../src/features/assessments/hooks'
import { scoreKey } from '../../../src/features/assessments/score-draft'
import { useScoreDraft } from '../../../src/features/assessments/use-score-draft'
import { errorMessage } from '../../../src/lib/api'
import { formatDate, formatScore } from '../../../src/lib/format'
import { removeOfflineCache } from '../../../src/lib/offline-cache'
import { colors } from '../../../src/theme/tokens'

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

  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const {
    draft,
    status,
    error: saveError,
    warning,
    ready,
    onChangeValue,
    persistDraft,
  } = useScoreDraft(assessmentId, assessment.data, saveScores.mutateAsync)

  const editable = assessment.data?.status !== 'finalized'
  const instrument = assessment.data?.instrument
  const participants = assessment.data?.participants ?? []

  useEffect(() => {
    if (!selectedStudentId && assessment.data?.participants[0])
      setSelectedStudentId(assessment.data.participants[0].id)
  }, [assessment.data, selectedStudentId])

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
              await removeOfflineCache(`draft:${assessmentId}`)
              router.replace(`/assessments/${assessmentId}/results`)
            } catch (error) {
              setActionError(errorMessage(error))
            }
          },
        },
      ],
    )
  }

  if (assessment.isLoading || (assessment.data && !ready)) {
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

      {warning ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {warning}
        </Text>
      ) : null}
      {saveError || actionError ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {saveError ?? actionError}
        </Text>
      ) : null}

      {editable ? (
        <View style={styles.actions}>
          <Button
            title={saveScores.isPending ? 'Menyimpan...' : 'Simpan draf'}
            variant="secondary"
            fullWidth={false}
            loading={saveScores.isPending}
            onPress={() => void persistDraft().catch(() => undefined)}
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
