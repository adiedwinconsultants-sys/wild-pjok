import type { AssessmentStatus } from '@pjok/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  SectionLabel,
  Select,
  StatusBadge,
  TextField,
} from '../../../src/components'
import { useAssessments } from '../../../src/features/assessments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { formatDate } from '../../../src/lib/format'
import { spacing } from '../../../src/theme/tokens'

type StatusFilter = 'all' | AssessmentStatus

export default function HistoryScreen() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const history = useAssessments({
    q: query.trim() || undefined,
    status: status === 'all' ? undefined : status,
  })
  const rows = history.data?.data ?? []

  return (
    <Screen>
      <PageHeader
        title="Riwayat"
        subtitle="Telusuri pengukuran lama, buka hasil final, atau lanjutkan draf."
      />

      <View style={styles.filters}>
        <TextField
          placeholder="Cari nama instrumen"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <View style={styles.filterBlock}>
          <SectionLabel>Status</SectionLabel>
          <Select<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'draft', label: 'Draf' },
              { value: 'finalized', label: 'Final' },
              { value: 'reopened', label: 'Dibuka ulang' },
            ]}
          />
        </View>
      </View>

      {history.isLoading ? <LoadingState message="Memuat riwayat..." /> : null}
      {history.isError ? (
        <ErrorState message={errorMessage(history.error)} onRetry={() => history.refetch()} />
      ) : null}
      {history.isSuccess && rows.length === 0 ? (
        <EmptyState
          title="Riwayat kosong"
          message="Belum ada asesmen yang cocok dengan filter ini."
        />
      ) : null}

      <View style={styles.list}>
        {rows.map((item) => (
          <ListRow
            key={item.id}
            icon={item.status === 'draft' ? 'create-outline' : 'checkmark-circle-outline'}
            title={item.instrumentName}
            subtitle={`${item.className} · ${formatDate(item.date)}`}
            accessory={<StatusBadge status={item.status} />}
            onPress={() =>
              router.push(
                item.status === 'draft'
                  ? `/assessments/${item.id}`
                  : `/assessments/${item.id}/results`,
              )
            }
          />
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  filters: { gap: spacing.md, marginBottom: spacing.lg },
  filterBlock: { gap: 6 },
  list: { gap: spacing.sm },
})
