import { StyleSheet, Text, View } from 'react-native'
import { colors, typography } from '../theme/tokens'

type StatProps = {
  value: string
  label: string
  tone?: 'default' | 'inverse' | 'accent'
  size?: 'md' | 'lg'
}

export function Stat({ value, label, tone = 'default', size = 'md' }: StatProps) {
  const color =
    tone === 'inverse' ? colors.textInverse : tone === 'accent' ? colors.primary : colors.text
  return (
    <View style={styles.wrapper}>
      <Text style={[size === 'lg' ? styles.valueLarge : styles.value, { color }]}>{value}</Text>
      <Text
        style={[
          styles.label,
          tone === 'inverse' && styles.labelInverse,
          tone === 'accent' && styles.labelAccent,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 2 },
  value: { ...typography.stat, fontSize: 32, lineHeight: 36 },
  valueLarge: { ...typography.stat },
  label: { ...typography.label, color: colors.textMuted },
  labelInverse: { color: 'rgba(255, 255, 255, 0.6)' },
  labelAccent: { color: colors.primary },
})
