import type { MaterialGroup } from '@pjok/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  SectionLabel,
  Select,
  TextField,
} from '../../../src/components'
import { type AssessmentDetail, useCreateAssessment } from '../../../src/features/assessments/hooks'
import { useClassStudents, useClasses } from '../../../src/features/classes/hooks'
import { useInstrument, useInstruments } from '../../../src/features/instruments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { formatDate, groupLabel, todayIso } from '../../../src/lib/format'
import { colors, spacing, typography } from '../../../src/theme/tokens'

type GroupFilter = 'all' | MaterialGroup

const stepTitles = ['Pilih kelas', 'Pilih instrumen', 'Tanggal dan peserta']

export default function NewAssessmentScreen() {
  const params = useLocalSearchParams<{ instrumentSlug?: string }>()
  const [step, setStep] = useState(1)
  const [classId, setClassId] = useState('')
  const [instrumentSlug, setInstrumentSlug] = useState(
    typeof params.instrumentSlug === 'string' ? params.instrumentSlug : '',
  )
  const [date, setDate] = useState(todayIso())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GroupFilter>('all')
  const [error, setError] = useState<string | null>(null)

  const classes = useClasses()
  const students = useClassStudents(classId)
  const instruments = useInstruments({
    q: search.trim() || undefined,
    ...(group === 'all' ? {} : { group }),
  })
  const instrument = useInstrument(instrumentSlug)
  const createAssessment = useCreateAssessment()

  const selectedClass = classes.data?.data.find((item) => item.id === classId)
  const studentRows = students.data?.data ?? []

  useEffect(() => {
    if (step === 3 && selected.size === 0 && studentRows.length > 0) {
      setSelected(new Set(studentRows.map((student) => student.id)))
    }
  }, [step, selected.size, studentRows])

  const progress = useMemo(() => `${step} dari 3`, [step])

  const toggleStudent = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async () => {
    setError(null)
    if (!classId || !instrumentSlug) {
      setError('Lengkapi pilihan kelas dan instrumen.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Tanggal harus berformat YYYY-MM-DD.')
      return
    }
    if (selected.size === 0) {
      setError('Pilih minimal satu peserta didik.')
      return
    }
    try {
      const created = await createAssessment.mutateAsync({
        classId,
        instrumentId: instrumentSlug,
        date,
        participantIds: Array.from(selected),
      })
      const detail = created as AssessmentDetail
      router.replace(`/assessments/${detail.id}`)
    } catch (submitError) {
      setError(errorMessage(submitError))
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <SectionLabel>Langkah {progress}</SectionLabel>
          <Text style={styles.stepIndex}>0{step}</Text>
        </View>
        <Text style={styles.title}>{stepTitles[step - 1]}</Text>
        <View style={styles.progress}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.progressItem}>
              <View style={[styles.progressBar, item <= step && styles.progressBarActive]} />
              <Text style={[styles.progressLabel, item <= step && styles.progressLabelActive]}>
                {String(item).padStart(2, '0')}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {step === 1 ? (
        <>
          {classes.isLoading ? <LoadingState message="Memuat kelas..." /> : null}
          {classes.isError ? (
            <ErrorState message={errorMessage(classes.error)} onRetry={() => classes.refetch()} />
          ) : null}
          <View style={styles.list}>
            {(classes.data?.data ?? []).map((item, index) => {
              const active = classId === item.id
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`Kelas ${item.name}, tingkat ${item.gradeLevel}, ${item.studentCount} siswa`}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setClassId(item.id)
                    setSelected(new Set())
                  }}
                >
                  <Card rail={active} style={active ? styles.selectedCard : undefined}>
                    <View style={styles.row}>
                      <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
                      <View style={styles.flex}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.meta}>
                          Tingkat {item.gradeLevel} · {item.studentCount} siswa ·{' '}
                          {item.academicYear}
                        </Text>
                      </View>
                      {active ? <Badge label="Dipilih" tone="success" /> : null}
                    </View>
                  </Card>
                </Pressable>
              )
            })}
          </View>
          {classes.isSuccess && (classes.data?.data.length ?? 0) === 0 ? (
            <EmptyState
              title="Belum ada kelas"
              message="Tambahkan kelas terlebih dahulu sebelum membuat asesmen."
            />
          ) : null}
          <Button
            title="Lanjut"
            onPress={() => setStep(2)}
            disabled={!classId}
            style={styles.next}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <TextField
            placeholder="Cari instrumen"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <Select<GroupFilter>
            value={group}
            onChange={setGroup}
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'bola_besar', label: 'Bola besar' },
              { value: 'atletik', label: 'Atletik' },
              { value: 'kebugaran_jasmani', label: 'Kebugaran' },
              { value: 'tksi', label: 'TKSI' },
            ]}
          />
          {instruments.isLoading ? <LoadingState message="Memuat instrumen..." /> : null}
          {instruments.isError ? (
            <ErrorState
              message={errorMessage(instruments.error)}
              onRetry={() => instruments.refetch()}
            />
          ) : null}
          <View style={styles.list}>
            {(instruments.data?.data ?? []).map((item, index) => {
              const active = instrumentSlug === item.slug
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`Instrumen ${item.name}, ${groupLabel(item.group)}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setInstrumentSlug(item.slug)}
                >
                  <Card rail={active} style={active ? styles.selectedCard : undefined}>
                    <View style={styles.row}>
                      <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
                      <View style={styles.flex}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.meta}>{groupLabel(item.group)}</Text>
                      </View>
                      {active ? <Badge label="Dipilih" tone="success" /> : null}
                    </View>
                  </Card>
                </Pressable>
              )
            })}
          </View>
          <View style={styles.actions}>
            <Button title="Kembali" variant="ghost" fullWidth={false} onPress={() => setStep(1)} />
            <Button
              title="Lanjut"
              fullWidth={false}
              onPress={() => setStep(3)}
              disabled={!instrumentSlug}
              style={styles.flex}
            />
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <TextField
            label="Tanggal asesmen"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            hint="Tanggal menentukan kelompok usia norma."
          />
          {instrument.data ? (
            <Card variant="ink">
              <SectionLabel tone="inverse">Ringkasan</SectionLabel>
              <Text style={styles.summaryTitle}>{instrument.data.name}</Text>
              <Text style={styles.summaryMeta}>
                {selectedClass?.name ?? 'Kelas'} · {instrument.data.indicators.length} indikator ·{' '}
                {formatDate(date)}
              </Text>
            </Card>
          ) : null}

          <View style={styles.sectionHeader}>
            <View style={styles.flex}>
              <SectionLabel>Peserta didik</SectionLabel>
              <Text style={styles.sectionMeta}>Semua siswa dipilih secara default.</Text>
            </View>
            <Badge label={`${selected.size}/${studentRows.length} dipilih`} tone="info" />
          </View>
          {students.isLoading ? <LoadingState message="Memuat siswa..." /> : null}
          {students.isError ? (
            <ErrorState message={errorMessage(students.error)} onRetry={() => students.refetch()} />
          ) : null}
          <View style={styles.list}>
            {studentRows.map((student, index) => {
              const checked = selected.has(student.id)
              return (
                <Pressable
                  key={student.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${student.fullName}, NIS ${student.nis}`}
                  accessibilityState={{ checked }}
                  onPress={() => toggleStudent(student.id)}
                >
                  <Card style={checked ? styles.selectedCard : undefined}>
                    <View style={styles.row}>
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.itemTitle}>{student.fullName}</Text>
                        <Text style={styles.meta}>NIS {student.nis}</Text>
                      </View>
                      <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
                    </View>
                  </Card>
                </Pressable>
              )
            })}
          </View>
          {studentRows.length === 0 && students.isSuccess ? (
            <EmptyState
              title="Kelas belum memiliki siswa"
              message="Tambahkan siswa ke kelas ini, lalu buka kembali layar asesmen."
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button title="Kembali" variant="ghost" fullWidth={false} onPress={() => setStep(2)} />
            <Button
              title={createAssessment.isPending ? 'Membuat...' : 'Buat draf asesmen'}
              fullWidth={false}
              loading={createAssessment.isPending}
              onPress={() => void submit()}
              style={styles.flex}
            />
          </View>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.xl },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepIndex: { ...typography.title, color: colors.borderStrong, fontSize: 44, lineHeight: 38 },
  title: { ...typography.title, color: colors.text },
  progress: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  progressItem: { flex: 1, gap: spacing.xs },
  progressBar: { height: 4, backgroundColor: colors.surfaceMuted },
  progressBarActive: { backgroundColor: colors.accent },
  progressLabel: { ...typography.label, color: colors.textMuted },
  progressLabelActive: { color: colors.accent },
  list: { gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  index: { ...typography.monoStrong, color: colors.accent },
  itemTitle: { ...typography.subheading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  selectedCard: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  next: { marginTop: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionMeta: { ...typography.small, color: colors.textMuted },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkmark: { color: colors.highlight, fontSize: 14, lineHeight: 18 },
  summaryTitle: { ...typography.heading, color: colors.textInverse },
  summaryMeta: { ...typography.small, color: 'rgba(250, 246, 234, 0.7)' },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.sm },
})
