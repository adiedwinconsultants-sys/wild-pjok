import Ionicons from '@expo/vector-icons/Ionicons'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { formatDate } from '../lib/format'
import { colors, radius, spacing, typography } from '../theme/tokens'
import { Button } from './Button'

export function LoadingState({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <View style={styles.wrapper} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.label}>{message}</Text>
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
    <View style={styles.state}>
      <View style={styles.iconCircle}>
        <Ionicons name="file-tray-outline" size={24} color={colors.textMuted} />
      </View>
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
    <View style={styles.state} accessibilityRole="alert">
      <View style={[styles.iconCircle, styles.iconCircleError]}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
      </View>
      <Text style={styles.title}>Data gagal dimuat</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? (
        <Button title="Coba lagi" variant="secondary" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: { ...typography.small, color: colors.textMuted },
  state: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconCircleError: { backgroundColor: colors.dangerSoft },
  title: { ...typography.heading, fontSize: 19, color: colors.text, textAlign: 'center' },
  muted: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: { marginTop: spacing.md, alignSelf: 'center' },
  offline: {
    gap: 2,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  offlineTitle: { ...typography.label, color: colors.accent },
  offlineText: { ...typography.small, fontSize: 13, color: colors.text },
})
