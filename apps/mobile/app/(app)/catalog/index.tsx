import type { MaterialGroup } from '@pjok/shared'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineNotice,
  Screen,
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
      <View style={styles.header}>
        <Text style={styles.title}>Katalog instrumen</Text>
        <Text style={styles.subtitle}>
          Setiap instrumen memiliki indikator, norma, dan sumber yang dapat Anda periksa.
        </Text>
      </View>

      {instruments.data?.offline ? (
        <OfflineNotice cachedAt={instruments.data.offline.cachedAt} />
      ) : null}

      <TextField
        placeholder="Cari nama instrumen"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      <Select<GroupFilter>
        label="Kelompok materi"
        value={group}
        onChange={setGroup}
        options={[
          { value: 'all', label: 'Semua' },
          { value: 'bola_besar', label: 'Bola Besar' },
          { value: 'atletik', label: 'Atletik' },
          { value: 'kebugaran_jasmani', label: 'Kebugaran' },
          { value: 'tksi', label: 'TKSI' },
        ]}
      />

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
          <Text style={styles.groupTitle}>{groupLabel(groupKey)}</Text>
          <View style={styles.list}>
            {rows.map((row) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`Buka instrumen ${row.name}`}
                onPress={() => router.push(`/catalog/${row.slug}`)}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Card>
                  <Text style={styles.itemTitle}>{row.name}</Text>
                  <Text style={styles.meta}>Versi {row.version}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  group: { marginTop: spacing.xl, gap: spacing.md },
  groupTitle: { ...typography.heading, color: colors.text },
  list: { gap: spacing.md },
  itemTitle: { ...typography.subheading, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  pressed: { opacity: 0.85 },
})
