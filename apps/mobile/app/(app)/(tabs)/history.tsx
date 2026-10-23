import type { AssessmentStatus } from '@pjok/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Select,
  StatusBadge,
  TextField,
} from '../../../src/components'
import { useAssessments } from '../../../src/features/assessments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { formatDate } from '../../../src/lib/format'
import { colors, spacing, typography } from '../../../src/theme/tokens'

type StatusFilter = 'all' | AssessmentStatus

export default function HistoryScreen() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const history = useAssessments({
    q: query.trim() || undefined,
    status: status === 'all' ? undefined : status,
  })

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>RIWAYAT</Text>
        <Text style={styles.title}>Jejak asesmen</Text>
        <Text style={styles.subtitle}>
          Cari asesmen lama, lanjutkan draf, atau buka hasil final.
        </Text>
      </View>

      <TextField
        placeholder="Cari nama instrumen"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      <Select<StatusFilter>
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'Semua' },
          { value: 'draft', label: 'Draf' },
          { value: 'finalized', label: 'Final' },
          { value: 'reopened', label: 'Dibuka Ulang' },
        ]}
      />

      {history.isLoading ? <LoadingState message="Memuat riwayat..." /> : null}
      {history.isError ? (
        <ErrorState message={errorMessage(history.error)} onRetry={() => history.refetch()} />
      ) : null}
      {history.isSuccess && (history.data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="Riwayat kosong"
          message="Belum ada asesmen yang cocok dengan filter ini."
        />
      ) : null}

      <View style={styles.list}>
        {(history.data?.data ?? []).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() =>
              router.push(
                item.status === 'draft'
                  ? `/assessments/${item.id}`
                  : `/assessments/${item.id}/results`,
              )
            }
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
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  list: { gap: spacing.md, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  itemTitle: { ...typography.subheading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  pressed: { opacity: 0.85 },
})
