import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  StatusBadge,
} from '../../../src/components'
import { useAssessments } from '../../../src/features/assessments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { formatDate } from '../../../src/lib/format'
import { colors, radius, spacing, typography } from '../../../src/theme/tokens'

export default function AssessmentsScreen() {
  const drafts = useAssessments({ status: 'draft' })

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ASESMEN</Text>
        <Text style={styles.title}>Mulai penilaian baru</Text>
        <Text style={styles.subtitle}>
          Pilih kelas, instrumen, lalu isi indikator. Nilai akhir dihitung otomatis oleh server.
        </Text>
        <Button title="Buat asesmen" onPress={() => router.push('/assessments/new')} />
        <Button
          title="Lihat katalog instrumen"
          variant="secondary"
          onPress={() => router.push('/catalog')}
        />
      </View>

      <Text style={styles.sectionTitle}>Draf berjalan</Text>
      {drafts.isLoading ? <LoadingState message="Memuat draf..." /> : null}
      {drafts.isError ? (
        <ErrorState message={errorMessage(drafts.error)} onRetry={() => drafts.refetch()} />
      ) : null}
      {drafts.isSuccess && (drafts.data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="Tidak ada draf"
          message="Draf asesmen yang belum difinalisasi akan muncul di sini."
        />
      ) : null}

      <View style={styles.list}>
        {(drafts.data?.data ?? []).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => router.push(`/assessments/${item.id}`)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.itemTitle}>{item.instrumentName}</Text>
                  <Text style={styles.meta}>
                    {item.className} · {formatDate(item.date)}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <Badge label="Lanjutkan pengisian" tone="warning" />
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Alur singkat</Text>
        <Text style={styles.tipText}>
          1. Pilih kelas dan instrumen · 2. Isi skor tiap indikator · 3. Finalisasi dan tulis umpan
          balik.
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginBottom: spacing.xl },
  eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.md },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  itemTitle: { ...typography.subheading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  pressed: { opacity: 0.85 },
  tip: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  tipTitle: { ...typography.subheading, color: colors.text },
  tipText: { ...typography.small, color: colors.textMuted, lineHeight: 20 },
})
