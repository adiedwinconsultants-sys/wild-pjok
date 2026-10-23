import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../theme/tokens'
import { SectionLabel } from './SectionLabel'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <View style={styles.wrapper}>
      {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 4, marginBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    maxWidth: 360,
  },
  action: { marginTop: spacing.sm },
})
