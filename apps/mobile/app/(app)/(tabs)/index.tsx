import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  OfflineNotice,
  PageHeader,
  Screen,
  SectionLabel,
  Stat,
  TextField,
} from '../../../src/components'
import { useClasses } from '../../../src/features/classes/hooks'
import { errorMessage } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/lib/auth-store'
import { colors, spacing, typography } from '../../../src/theme/tokens'

export default function ClassesScreen() {
  const user = useAuthStore((state) => state.user)
  const [query, setQuery] = useState('')
  const classes = useClasses()

  const rows = classes.data?.data ?? []
  const totalStudents = useMemo(
    () => rows.reduce((sum, item) => sum + item.studentCount, 0),
    [rows],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(
      (item) => item.name.toLowerCase().includes(term) || item.academicYear.includes(term),
    )
  }, [rows, query])

  return (
    <Screen>
      <PageHeader
        eyebrow={user?.name ? `Halo, ${user.name.split(' ')[0]}` : undefined}
        title="Kelas"
        subtitle="Ringkasan kelas dan peserta didik yang Anda ampu."
      />

      {classes.data?.offline ? <OfflineNotice cachedAt={classes.data.offline.cachedAt} /> : null}

      <View style={styles.stats}>
        <Card variant="quiet" style={styles.statCard}>
          <Stat value={String(rows.length)} label="Kelas" />
        </Card>
        <Card variant="quiet" style={styles.statCard}>
          <Stat value={String(totalStudents)} label="Peserta didik" />
        </Card>
      </View>

      <Button
        title="Tambah kelas"
        onPress={() => router.push('/class-form')}
        style={styles.addButton}
      />

      <TextField
        placeholder="Cari kelas atau tahun ajaran"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        style={styles.search}
      />

      {classes.isLoading ? <LoadingState message="Memuat kelas..." /> : null}
      {classes.isError ? (
        <ErrorState message={errorMessage(classes.error)} onRetry={() => classes.refetch()} />
      ) : null}

      {classes.isSuccess && filtered.length === 0 ? (
        <EmptyState
          title={query ? 'Kelas tidak ditemukan' : 'Belum ada kelas'}
          message={
            query
              ? 'Coba kata kunci lain atau kosongkan pencarian.'
              : 'Tambahkan kelas pertama untuk mulai mengelola peserta didik.'
          }
          actionLabel={query ? undefined : 'Tambah kelas'}
          onAction={query ? undefined : () => router.push('/class-form')}
        />
      ) : null}

      {filtered.length > 0 ? (
        <View style={styles.list}>
          <SectionLabel>Daftar kelas</SectionLabel>
          {filtered.map((item) => (
            <ListRow
              key={item.id}
              icon="school-outline"
              title={item.name}
              subtitle={`Tingkat ${item.gradeLevel} · ${item.academicYear}`}
              value={`${item.studentCount} siswa`}
              onPress={() => router.push(`/classes/${item.id}`)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.list}>
        <SectionLabel>Materi</SectionLabel>
        <ListRow
          icon="library-outline"
          title="Katalog instrumen"
          subtitle="Indikator, norma, dan sumber penilaian"
          onPress={() => router.push('/catalog')}
        />
      </View>

      <Text style={styles.footnote}>
        Nilai akhir selalu dihitung ulang di server saat finalisasi.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1 },
  addButton: { marginBottom: spacing.xl },
  search: { marginBottom: spacing.lg },
  list: { gap: spacing.sm, marginBottom: spacing.xl },
  footnote: {
    ...typography.small,
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
})
