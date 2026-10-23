import type { ScoreCategory } from '@pjok/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineNotice,
  PageHeader,
  Screen,
  SectionLabel,
  Stat,
  TextField,
} from '../../../src/components'
import { useCreateExport } from '../../../src/features/assessments/hooks'
import {
  useClass,
  useClassRecap,
  useClassStudents,
  useDeleteClass,
  useDeleteStudent,
} from '../../../src/features/classes/hooks'
import { errorMessage } from '../../../src/lib/api'
import { downloadAndShareExport } from '../../../src/lib/export-file'
import { categoryLabel, formatDate, formatScore } from '../../../src/lib/format'
import { offlineInfo } from '../../../src/lib/offline-cache'
import { colors, spacing, typography } from '../../../src/theme/tokens'

export default function ClassDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const classId = typeof params.id === 'string' ? params.id : ''
  const detail = useClass(classId)
  const students = useClassStudents(classId)
  const recap = useClassRecap(classId)
  const deleteClass = useDeleteClass()
  const deleteStudent = useDeleteStudent(classId)
  const createExport = useCreateExport()
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = students.data?.data ?? []
    if (!term) return rows
    return rows.filter(
      (student) => student.fullName.toLowerCase().includes(term) || student.nis.includes(term),
    )
  }, [students.data, search])

  const sortedRecap = useMemo(
    () => [...(recap.data?.students ?? [])].sort((a, b) => b.finalScore - a.finalScore),
    [recap.data],
  )

  const onDeleteClass = () => {
    Alert.alert(
      'Hapus kelas?',
      'Kelas hanya dapat dihapus bila belum memiliki asesmen final. Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass.mutateAsync(classId)
              router.back()
            } catch (error) {
              setActionError(errorMessage(error))
            }
          },
        },
      ],
    )
  }

  const onDeleteStudent = (studentId: string, name: string) => {
    Alert.alert('Hapus siswa?', `${name} akan dihapus dari kelas ini.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudent.mutateAsync(studentId)
          } catch (error) {
            setActionError(errorMessage(error))
          }
        },
      },
    ])
  }

  const onExport = async (format: 'xlsx' | 'pdf') => {
    const assessmentId = recap.data?.assessmentId
    if (!assessmentId) return
    setActionError(null)
    try {
      const job = await createExport.mutateAsync({ assessmentId, format })
      await downloadAndShareExport(job)
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  if (detail.isLoading) {
    return (
      <Screen>
        <LoadingState message="Memuat kelas..." />
      </Screen>
    )
  }

  if (detail.isError || !detail.data) {
    return (
      <Screen>
        <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />
      </Screen>
    )
  }

  const klass = detail.data
  const offline = offlineInfo(detail.data, students.data, recap.data)

  return (
    <Screen>
      {offline ? <OfflineNotice cachedAt={offline.cachedAt} /> : null}

      <PageHeader
        eyebrow="Detail kelas"
        title={klass.name}
        subtitle={`Tingkat ${klass.gradeLevel} · Tahun ajaran ${klass.academicYear}`}
      />

      <View style={styles.headerActions}>
        <Button
          title="Ubah data"
          variant="secondary"
          fullWidth={false}
          onPress={() => router.push(`/class-form?id=${classId}`)}
          style={styles.headerAction}
        />
        <Button
          title="Hapus kelas"
          variant="ghost"
          fullWidth={false}
          onPress={onDeleteClass}
          loading={deleteClass.isPending}
        />
      </View>
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      <Card variant="ink" style={styles.summary}>
        <SectionLabel tone="inverse">Ringkasan kelas</SectionLabel>
        <View style={styles.summaryRow}>
          <Stat value={String(klass.studentCount)} label="Peserta didik" tone="inverse" size="lg" />
          <View style={styles.summaryDivider} />
          <Stat
            value={recap.data?.assessmentId ? formatScore(recap.data.average) : '—'}
            label="Rata-rata terakhir"
            tone="inverse"
            size="lg"
          />
        </View>
        {klass.notes ? <Text style={styles.summaryNote}>{klass.notes}</Text> : null}
      </Card>

      <View style={styles.sectionHeader}>
        <View style={styles.flex}>
          <SectionLabel>Peserta didik</SectionLabel>
          <Text style={styles.sectionMeta}>{klass.studentCount} terdaftar</Text>
        </View>
        <View style={styles.actions}>
          <Button
            title="Impor Excel"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push(`/import-students?classId=${classId}`)}
          />
          <Button
            title="Tambah siswa"
            fullWidth={false}
            onPress={() => router.push(`/student-form?classId=${classId}`)}
          />
        </View>
      </View>

      <TextField
        placeholder="Cari nama atau NIS"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      {students.isLoading ? <LoadingState message="Memuat siswa..." /> : null}
      {students.isError ? (
        <ErrorState message={errorMessage(students.error)} onRetry={() => students.refetch()} />
      ) : null}
      {students.isSuccess && filteredStudents.length === 0 ? (
        <EmptyState
          title={search ? 'Siswa tidak ditemukan' : 'Belum ada siswa'}
          message={
            search
              ? 'Coba kata kunci lain.'
              : 'Tambahkan siswa satu per satu atau impor dari Excel.'
          }
          actionLabel={search ? undefined : 'Tambah siswa'}
          onAction={search ? undefined : () => router.push(`/student-form?classId=${classId}`)}
        />
      ) : null}

      <View style={styles.list}>
        {filteredStudents.map((student, index) => (
          <Card key={student.id} style={styles.studentCard}>
            <View style={styles.row}>
              <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.flex}>
                <Text style={styles.studentName}>{student.fullName}</Text>
                <Text style={styles.meta}>
                  NIS {student.nis} · {student.sex === 'L' ? 'Laki-laki' : 'Perempuan'} · Lahir{' '}
                  {formatDate(student.birthDate)}
                </Text>
              </View>
            </View>
            <View style={styles.studentActions}>
              <Button
                title="Ubah"
                variant="ghost"
                fullWidth={false}
                style={styles.smallAction}
                onPress={() =>
                  router.push(`/student-form?classId=${classId}&studentId=${student.id}`)
                }
              />
              <Button
                title="Hapus"
                variant="ghost"
                fullWidth={false}
                style={styles.smallAction}
                onPress={() => onDeleteStudent(student.id, student.fullName)}
              />
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.flex}>
          <SectionLabel>Rekap asesmen terakhir</SectionLabel>
          <Text style={styles.sectionMeta}>Hasil final kelas ini</Text>
        </View>
        {recap.data?.assessmentId ? (
          <View style={styles.actions}>
            <Button
              title="Excel"
              variant="secondary"
              fullWidth={false}
              loading={createExport.isPending}
              onPress={() => void onExport('xlsx')}
            />
            <Button
              title="PDF"
              variant="secondary"
              fullWidth={false}
              loading={createExport.isPending}
              onPress={() => void onExport('pdf')}
            />
          </View>
        ) : null}
      </View>

      {recap.isLoading ? <LoadingState message="Memuat rekap..." /> : null}
      {recap.isError ? (
        <ErrorState message={errorMessage(recap.error)} onRetry={() => recap.refetch()} />
      ) : null}
      {recap.isSuccess && !recap.data?.assessmentId ? (
        <EmptyState
          title="Belum ada hasil final"
          message="Rekap akan muncul setelah asesmen kelas ini difinalisasi."
        />
      ) : null}

      {recap.data?.assessmentId ? (
        <Card>
          <View style={styles.recapSummary}>
            <Stat value={formatScore(recap.data.average)} label="Rata-rata" />
            <Stat value={formatScore(recap.data.min)} label="Terendah" />
            <Stat value={formatScore(recap.data.max)} label="Tertinggi" />
          </View>
          <View style={styles.distribution}>
            {(Object.entries(recap.data.distribution) as [ScoreCategory, number][]).map(
              ([category, total]) => (
                <Badge
                  key={category}
                  label={`${categoryLabel(category)}: ${total}`}
                  tone={category === 'perlu_bimbingan' ? 'danger' : 'neutral'}
                />
              ),
            )}
          </View>
          <View style={styles.recapList}>
            {sortedRecap.map((row, index) => (
              <View key={row.studentId} style={styles.recapRow}>
                <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.flex}>
                  <Text style={styles.studentName}>{row.fullName}</Text>
                  <Text style={styles.meta}>NIS {row.nis}</Text>
                </View>
                <Text style={styles.score}>{formatScore(row.finalScore)}</Text>
                <CategoryBadge category={row.category} label={categoryLabel(row.category)} />
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka hasil lengkap asesmen terakhir"
            onPress={() => router.push(`/assessments/${recap.data?.assessmentId}/results`)}
            style={styles.linkButton}
          >
            <Text style={styles.link}>Buka hasil lengkap →</Text>
          </Pressable>
        </Card>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  headerAction: { flex: 1 },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  summary: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg },
  summaryDivider: { width: 1, height: 54, backgroundColor: 'rgba(250, 246, 234, 0.25)' },
  summaryNote: { ...typography.small, color: 'rgba(250, 246, 234, 0.68)' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  sectionMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  list: { gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  index: { ...typography.monoStrong, color: colors.accent, width: 26 },
  studentCard: { paddingVertical: spacing.md, gap: spacing.xs },
  studentName: { ...typography.subheading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  studentActions: { flexDirection: 'row', gap: spacing.sm, marginLeft: 38 },
  smallAction: { minHeight: 40, paddingHorizontal: spacing.sm },
  recapSummary: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  distribution: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  recapList: { gap: spacing.sm, marginTop: spacing.md },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  score: { ...typography.subheading, color: colors.text },
  linkButton: { minHeight: 44, justifyContent: 'center' },
  link: { ...typography.label, color: colors.primary },
})
