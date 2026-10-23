import { router, useLocalSearchParams } from 'expo-router'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  OfflineNotice,
  PageHeader,
  Screen,
  SectionLabel,
} from '../../../src/components'
import { useInstrument } from '../../../src/features/instruments/hooks'
import { errorMessage } from '../../../src/lib/api'
import { groupLabel } from '../../../src/lib/format'
import { colors, spacing, typography } from '../../../src/theme/tokens'

export default function InstrumentDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string }>()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const instrument = useInstrument(slug)

  if (instrument.isLoading) {
    return (
      <Screen>
        <LoadingState message="Memuat instrumen..." />
      </Screen>
    )
  }

  if (instrument.isError || !instrument.data) {
    return (
      <Screen>
        <ErrorState message={errorMessage(instrument.error)} onRetry={() => instrument.refetch()} />
      </Screen>
    )
  }

  const data = instrument.data

  return (
    <Screen>
      {data.offline ? <OfflineNotice cachedAt={data.offline.cachedAt} /> : null}

      <PageHeader
        eyebrow={groupLabel(data.group)}
        title={data.name}
        subtitle={`Versi ${data.version} · ${data.indicators.length} indikator penilaian`}
      />

      <Card variant="ink" style={styles.hero}>
        <SectionLabel tone="inverse">Ringkasan instrumen</SectionLabel>
        <Text style={styles.heroText}>{data.description}</Text>
        <View style={styles.badges}>
          {data.assessesProcess ? <Badge label="Penilaian proses" tone="info" /> : null}
          {data.assessesProduct ? <Badge label="Penilaian produk" tone="success" /> : null}
          <Badge label={`Versi ${data.version}`} />
        </View>
        <Button
          title="Mulai asesmen"
          variant="accent"
          onPress={() => router.push(`/assessments/new?instrumentSlug=${data.slug}`)}
        />
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Tujuan</SectionLabel>
        <Text style={styles.body}>{data.purpose}</Text>
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Prosedur</SectionLabel>
        {data.procedure.map((step, index) => (
          <View key={`${index}-${step.slice(0, 12)}`} style={styles.step}>
            <Text style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={styles.body}>{step}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Indikator</SectionLabel>
        {data.indicators.map((indicator, index) => (
          <View key={indicator.id} style={styles.indicator}>
            <View style={styles.indicatorHeader}>
              <Text style={styles.indicatorIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.indicatorName}>{indicator.name}</Text>
              <Badge label={indicator.kind === 'process' ? 'Proses' : 'Produk'} />
            </View>
            <Text style={styles.body}>{indicator.description}</Text>
            <Text style={styles.meta}>
              Satuan {indicator.unit} ·{' '}
              {indicator.higherIsBetter
                ? 'semakin besar semakin baik'
                : 'semakin kecil semakin baik'}{' '}
              · Bobot {indicator.weight}
            </Text>
            {indicator.rubricBands?.length ? (
              <View style={styles.bands}>
                {indicator.rubricBands.map((band) => (
                  <Text key={`${indicator.id}-${band.min}`} style={styles.band}>
                    {band.min}–{band.max}: {band.label} ({band.points} poin)
                  </Text>
                ))}
              </View>
            ) : null}
            {indicator.normTable?.length ? (
              <Text style={styles.meta}>
                Norma tersedia untuk {indicator.normTable.length} kelompok jenis kelamin/usia.
              </Text>
            ) : null}
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Ambang kategori</SectionLabel>
        {data.categoryThresholds.map((threshold) => (
          <View key={`${threshold.category}-${threshold.minScore}`} style={styles.threshold}>
            <Text style={styles.thresholdLabel}>{threshold.label}</Text>
            <Text style={styles.thresholdRange}>
              {threshold.minScore}–{threshold.maxScore}
            </Text>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Sumber</SectionLabel>
        {data.sources.map((source) => (
          <View key={`${source.title}-${source.year ?? ''}`} style={styles.source}>
            <Text style={styles.sourceTitle}>{source.title}</Text>
            <Text style={styles.meta}>
              {[source.author, source.year, source.publisher].filter(Boolean).join(' · ')}
            </Text>
            {source.url ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Buka sumber ${source.title}`}
                onPress={() => void Linking.openURL(source.url ?? '')}
                style={styles.sourceLink}
              >
                <Text style={styles.link}>{source.url}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  heroText: { ...typography.body, color: 'rgba(250, 246, 234, 0.74)' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.xs },
  section: { marginTop: spacing.lg },
  body: { ...typography.body, color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  step: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm },
  stepNumber: { ...typography.monoStrong, color: colors.accent, width: 28 },
  indicator: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  indicatorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  indicatorIndex: { ...typography.monoStrong, color: colors.accent },
  indicatorName: { ...typography.subheading, color: colors.text, flex: 1 },
  bands: { gap: 2, marginTop: spacing.xs },
  band: { ...typography.small, color: colors.textMuted },
  threshold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 3,
  },
  thresholdLabel: { ...typography.body, color: colors.text },
  thresholdRange: { ...typography.mono, color: colors.textMuted },
  source: {
    gap: 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourceTitle: { ...typography.subheading, color: colors.text },
  sourceLink: { minHeight: 44, justifyContent: 'center' },
  link: { ...typography.small, color: colors.primary },
})
