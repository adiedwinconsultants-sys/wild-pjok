import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps, ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme/tokens'

type ListRowProps = {
  icon?: ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle?: string
  value?: string
  accessory?: ReactNode
  onPress?: () => void
  showChevron?: boolean
  tone?: 'default' | 'danger'
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  accessory,
  onPress,
  showChevron = Boolean(onPress),
  tone = 'default',
}: ListRowProps) {
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.icon, tone === 'danger' && styles.iconDanger]}>
          <Ionicons
            name={icon}
            size={18}
            color={tone === 'danger' ? colors.danger : colors.primary}
          />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text style={[styles.title, tone === 'danger' && styles.titleDanger]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {accessory}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </View>
  )

  if (!onPress) return <View style={styles.container}>{content}</View>

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: colors.dangerSoft },
  texts: { flex: 1, gap: 2 },
  title: { ...typography.subheading, color: colors.text },
  titleDanger: { color: colors.danger },
  subtitle: { ...typography.small, fontSize: 13, color: colors.textMuted },
  value: { ...typography.small, color: colors.textMuted },
})
