import { Link, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  TextField,
} from '../../../src/components'
import { useClasses } from '../../../src/features/classes/hooks'
import { errorMessage } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/lib/auth-store'
import { colors, radius, spacing, typography } from '../../../src/theme/tokens'

export default function ClassesScreen() {
  const user = useAuthStore((state) => state.user)
  const [query, setQuery] = useState('')
  const classes = useClasses()

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const rows = classes.data?.data ?? []
    if (!term) return rows
    return rows.filter(
      (item) => item.name.toLowerCase().includes(term) || item.academicYear.includes(term),
    )
  }, [classes.data, query])

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>SELAMAT DATANG</Text>
          <Text style={styles.title}>{user?.name ?? 'Guru PJOK'}</Text>
          <Text style={styles.subtitle}>Kelola kelas dan peserta didik Anda.</Text>
        </View>
        <Button
          title="+ Kelas"
          fullWidth={false}
          onPress={() => router.push('/class-form')}
          style={styles.addButton}
        />
      </View>

      <TextField
        placeholder="Cari kelas atau tahun ajaran"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
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

      <View style={styles.list}>
        {filtered.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Buka kelas ${item.name}`}
            onPress={() => router.push(`/classes/${item.id}`)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.className}>{item.name}</Text>
                  <Text style={styles.meta}>
                    Tingkat {item.gradeLevel} · {item.academicYear}
                  </Text>
                </View>
                <Badge label={`${item.studentCount} siswa`} tone="info" />
              </View>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </Card>
          </Pressable>
        ))}
      </View>

      <Link href="/catalog" style={styles.catalogLink}>
        Jelajahi katalog instrumen
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  addButton: { marginTop: spacing.sm, paddingHorizontal: spacing.md },
  list: { marginTop: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  className: { ...typography.heading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  notes: { ...typography.small, color: colors.textMuted },
  pressed: { opacity: 0.85 },
  catalogLink: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
})
