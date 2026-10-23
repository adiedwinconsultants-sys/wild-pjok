import { router, useLocalSearchParams } from 'expo-router'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Badge, Button, Card, ErrorState, LoadingState, Screen } from '../../../src/components'
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
      <Card>
        <Text style={styles.group}>{groupLabel(data.group)}</Text>
        <Text style={styles.title}>{data.name}</Text>
        <Text style={styles.description}>{data.description}</Text>
        <View style={styles.badges}>
          {data.assessesProcess ? <Badge label="Penilaian Proses" tone="info" /> : null}
          {data.assessesProduct ? <Badge label="Penilaian Produk" tone="success" /> : null}
          <Badge label={`Versi ${data.version}`} />
        </View>
        <Button
          title="Mulai asesmen"
          onPress={() => router.push(`/assessments/new?instrumentSlug=${data.slug}`)}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Tujuan</Text>
        <Text style={styles.body}>{data.purpose}</Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Prosedur</Text>
        {data.procedure.map((step, index) => (
          <View key={`${index}-${step.slice(0, 12)}`} style={styles.step}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.body}>{step}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Indikator</Text>
        {data.indicators.map((indicator) => (
          <View key={indicator.id} style={styles.indicator}>
            <View style={styles.indicatorHeader}>
              <Text style={styles.indicatorName}>{indicator.name}</Text>
              <Badge label={indicator.kind === 'process' ? 'Proses' : 'Produk'} />
            </View>
            <Text style={styles.body}>{indicator.description}</Text>
            <Text style={styles.meta}>
              Satuan: {indicator.unit} ·{' '}
              {indicator.higherIsBetter
                ? 'semakin besar semakin baik'
                : 'semakin kecil semakin baik'}{' '}
              · Bobot {indicator.weight}
            </Text>
            {indicator.rubricBands?.length ? (
              <View style={styles.bands}>
                {indicator.rubricBands.map((band) => (
                  <Text key={`${indicator.id}-${band.min}`} style={styles.band}>
                    {band.min}-{band.max}: {band.label} ({band.points} poin)
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
        <Text style={styles.sectionTitle}>Ambang kategori</Text>
        {data.categoryThresholds.map((threshold) => (
          <Text key={`${threshold.category}-${threshold.minScore}`} style={styles.body}>
            {threshold.label}: {threshold.minScore}-{threshold.maxScore}
          </Text>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Sumber</Text>
        {data.sources.map((source) => (
          <View key={`${source.title}-${source.year ?? ''}`} style={styles.source}>
            <Text style={styles.sourceTitle}>{source.title}</Text>
            <Text style={styles.meta}>
              {[source.author, source.year, source.publisher].filter(Boolean).join(' · ')}
            </Text>
            {source.url ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL(source.url ?? '')}
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
  group: { ...typography.label, color: colors.primary, letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.text },
  description: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.text, lineHeight: 22 },
  meta: { ...typography.small, color: colors.textMuted },
  step: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  stepNumber: {
    ...typography.subheading,
    color: colors.primary,
    width: 24,
    textAlign: 'center',
  },
  indicator: { gap: spacing.xs, marginBottom: spacing.md },
  indicatorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  indicatorName: { ...typography.subheading, color: colors.text, flex: 1 },
  bands: { gap: 2, marginTop: spacing.xs },
  band: { ...typography.small, color: colors.textMuted },
  source: { gap: 2, marginBottom: spacing.sm },
  sourceTitle: { ...typography.subheading, color: colors.text },
  link: { ...typography.small, color: colors.primary },
})
