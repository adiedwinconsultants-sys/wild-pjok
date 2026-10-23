import type { MaterialGroup } from '@pjok/shared'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  OfflineNotice,
  PageHeader,
  Screen,
  SectionLabel,
  Select,
  TextField,
} from '../../../src/components'
import { useInstruments } from '../../../src/features/instruments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { groupLabel } from '../../../src/lib/format'
import { colors, spacing, typography } from '../../../src/theme/tokens'

type GroupFilter = 'all' | MaterialGroup

export default function CatalogScreen() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupFilter>('all')
  const instruments = useInstruments({
    q: query.trim() || undefined,
    ...(group === 'all' ? {} : { group }),
  })

  const grouped = useMemo(() => {
    const rows = instruments.data?.data ?? []
    const map = new Map<MaterialGroup, typeof rows>()
    for (const row of rows) {
      const list = map.get(row.group) ?? []
      list.push(row)
      map.set(row.group, list)
    }
    return Array.from(map.entries())
  }, [instruments.data])

  return (
    <Screen>
      <PageHeader
        title="Katalog"
        subtitle="Indikator, norma, ambang kategori, dan sumber setiap instrumen."
      />

      {instruments.data?.offline ? (
        <OfflineNotice cachedAt={instruments.data.offline.cachedAt} />
      ) : null}

      <View style={styles.filters}>
        <TextField
          placeholder="Cari nama instrumen"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <View style={styles.groupFilter}>
          <SectionLabel>Kelompok materi</SectionLabel>
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
        </View>
      </View>

      {instruments.isLoading ? <LoadingState message="Memuat katalog..." /> : null}
      {instruments.isError ? (
        <ErrorState
          message={errorMessage(instruments.error)}
          onRetry={() => instruments.refetch()}
        />
      ) : null}
      {instruments.isSuccess && grouped.length === 0 ? (
        <EmptyState
          title="Tidak ada instrumen"
          message="Coba ubah kata kunci atau kelompok materi."
        />
      ) : null}

      {grouped.map(([groupKey, rows]) => (
        <View key={groupKey} style={styles.group}>
          <View style={styles.groupHeader}>
            <SectionLabel>{groupLabel(groupKey)}</SectionLabel>
            <Text style={styles.groupCount}>{rows.length} instrumen</Text>
          </View>
          <View style={styles.list}>
            {rows.map((row) => (
              <ListRow
                key={row.id}
                icon="document-text-outline"
                title={row.name}
                subtitle={`Versi ${row.version}`}
                onPress={() => router.push(`/catalog/${row.slug}`)}
              />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  filters: { gap: spacing.md, marginBottom: spacing.lg },
  groupFilter: { gap: 6 },
  group: { marginTop: spacing.lg, gap: spacing.sm },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  groupCount: { ...typography.label, color: colors.textMuted },
  list: { gap: spacing.sm },
})
