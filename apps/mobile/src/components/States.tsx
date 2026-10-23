import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { formatDate } from '../lib/format'
import { colors, radius, spacing, typography } from '../theme/tokens'
import { Button } from './Button'

export function LoadingState({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <View style={styles.wrapper} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{message}</Text>
    </View>
  )
}

export function OfflineNotice({ cachedAt }: { cachedAt: string }) {
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <Text style={styles.offlineTitle}>Mode offline</Text>
      <Text style={styles.offlineText}>
        Menampilkan data tersimpan per {formatDate(cachedAt)}. Sambungkan internet untuk
        memperbarui.
      </Text>
    </View>
  )
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.muted}>{message}</Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  )
}

export function ErrorState({
  message = 'Terjadi kendala saat memuat data.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Gagal memuat</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? (
        <Button title="Coba lagi" variant="secondary" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { ...typography.subheading, color: colors.text, textAlign: 'center' },
  muted: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  action: { marginTop: spacing.md, alignSelf: 'center' },
  offline: {
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  offlineTitle: { ...typography.label, color: colors.accent },
  offlineText: { ...typography.small, color: colors.text },
})
