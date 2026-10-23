import type { AssessmentStatus, ScoreCategory } from '@pjok/shared'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme/tokens'

type BadgeProps = {
  label: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

const tones = {
  neutral: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  success: {
    backgroundColor: colors.successSoft,
    color: colors.success,
  },
  warning: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
  },
  info: {
    backgroundColor: colors.infoSoft,
    color: colors.info,
  },
} as const

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const palette = tones[tone]
  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.text, { color: palette.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const categoryTone: Record<ScoreCategory, BadgeProps['tone']> = {
  sangat_baik: 'success',
  baik: 'info',
  cukup: 'warning',
  perlu_bimbingan: 'danger',
}

export function CategoryBadge({ category, label }: { category: ScoreCategory; label: string }) {
  return <Badge label={label} tone={categoryTone[category]} />
}

const statusLabel: Record<AssessmentStatus, string> = {
  draft: 'Draf',
  finalized: 'Final',
  reopened: 'Dibuka ulang',
}

const statusTone: Record<AssessmentStatus, BadgeProps['tone']> = {
  draft: 'warning',
  finalized: 'success',
  reopened: 'info',
}

export function StatusBadge({ status }: { status: AssessmentStatus }) {
  return <Badge label={statusLabel[status]} tone={statusTone[status]} />
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: {
    ...typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
})
