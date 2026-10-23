import type { ReactNode } from 'react'
import { StyleSheet, Text } from 'react-native'
import { colors, typography } from '../theme/tokens'

type SectionLabelProps = {
  children: ReactNode
  tone?: 'accent' | 'inverse' | 'muted'
}

export function SectionLabel({ children, tone = 'muted' }: SectionLabelProps) {
  const color =
    tone === 'inverse'
      ? 'rgba(255, 255, 255, 0.6)'
      : tone === 'accent'
        ? colors.primary
        : colors.textMuted
  return (
    <Text style={[styles.text, { color }]} numberOfLines={1}>
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: {
    ...typography.label,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
