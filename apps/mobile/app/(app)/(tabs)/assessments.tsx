import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  SectionLabel,
  StatusBadge,
} from '../../../src/components'
import { useAssessments } from '../../../src/features/assessments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { formatDate } from '../../../src/lib/format'
import { colors, spacing, typography } from '../../../src/theme/tokens'

const steps = [
  { number: '1', title: 'Pilih kelas dan instrumen', text: 'Tentukan peserta dan tanggal ukur.' },
  { number: '2', title: 'Isi indikator', text: 'Masukkan nilai mentah sesuai satuan.' },
  { number: '3', title: 'Finalisasi', text: 'Periksa hasil, lalu tulis umpan balik.' },
]

export default function AssessmentsScreen() {
  const drafts = useAssessments({ status: 'draft' })
  const draftRows = drafts.data?.data ?? []

  return (
    <Screen>
      <PageHeader
        title="Asesmen"
        subtitle="Siapkan pengukuran baru atau lanjutkan draf yang belum difinalisasi."
      />

      <Card style={styles.hero}>
        <Text style={styles.heroTitle}>Mulai asesmen baru</Text>
        <Text style={styles.heroText}>
          Pilih kelas, instrumen, dan peserta. Nilai akhir dihitung ulang oleh server.
        </Text>
        <Button title="Buat asesmen" onPress={() => router.push('/assessments/new')} />
        <Button
          title="Buka katalog instrumen"
          variant="ghost"
          onPress={() => router.push('/catalog')}
        />
      </Card>

      <View style={styles.sectionHeader}>
        <SectionLabel>Draf berjalan</SectionLabel>
        <Text style={styles.count}>{draftRows.length} draf</Text>
      </View>

      {drafts.isLoading ? <LoadingState message="Memuat draf..." /> : null}
      {drafts.isError ? (
        <ErrorState message={errorMessage(drafts.error)} onRetry={() => drafts.refetch()} />
      ) : null}
      {drafts.isSuccess && draftRows.length === 0 ? (
        <EmptyState
          title="Tidak ada draf"
          message="Draf asesmen yang belum difinalisasi akan muncul di sini."
        />
      ) : null}

      <View style={styles.list}>
        {draftRows.map((item) => (
          <ListRow
            key={item.id}
            icon="clipboard-outline"
            title={item.instrumentName}
            subtitle={`${item.className} · ${formatDate(item.date)}`}
            accessory={<StatusBadge status={item.status} />}
            onPress={() => router.push(`/assessments/${item.id}`)}
          />
        ))}
      </View>

      <View style={styles.steps}>
        <SectionLabel>Alur tiga langkah</SectionLabel>
        {steps.map((step) => (
          <View key={step.number} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <View style={styles.stepTexts}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  heroTitle: { ...typography.heading, color: colors.text },
  heroText: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  count: { ...typography.label, color: colors.textMuted },
  list: { gap: spacing.sm },
  steps: { marginTop: spacing.xxl, gap: spacing.md },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { ...typography.label, color: colors.textMuted },
  stepTexts: { flex: 1, gap: 2 },
  stepTitle: { ...typography.subheading, color: colors.text },
  stepText: { ...typography.small, fontSize: 14, color: colors.textMuted },
})
