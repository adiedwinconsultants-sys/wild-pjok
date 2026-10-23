import type { ReactNode } from 'react'
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, radius, shadow, spacing } from '../theme/tokens'

type CardVariant = 'paper' | 'ink' | 'quiet' | 'accent' | 'outline'

type CardProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  variant?: CardVariant
  rail?: boolean
}

export function Card({ children, style, variant = 'paper', rail = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        styles[variant],
        rail && styles.rail,
        variant === 'paper' && shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  paper: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ink: { backgroundColor: colors.surfaceInk },
  quiet: { backgroundColor: colors.surfaceMuted },
  accent: { backgroundColor: colors.primarySoft },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rail: { borderWidth: 1, borderColor: colors.primary },
})
