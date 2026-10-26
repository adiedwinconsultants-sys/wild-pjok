import { createElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { type DateFieldProps, parseDateOnly } from '../lib/date-only'
import { todayIso } from '../lib/format'
import { colors, radius, spacing, typography } from '../theme/tokens'

export function DateField({ label, value, onChange, onBlur, error, disabled }: DateFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {createElement('input', {
        type: 'date',
        'aria-label': label,
        'aria-invalid': Boolean(error),
        'aria-description': error,
        value,
        max: todayIso(),
        disabled,
        onBlur,
        onChange: (event: { currentTarget: { value: string } }) => {
          const next = event.currentTarget.value
          if (!next || (parseDateOnly(next) && next <= todayIso())) onChange(next)
        },
        style: {
          boxSizing: 'border-box',
          width: '100%',
          minHeight: 48,
          padding: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${error ? colors.danger : 'transparent'}`,
          backgroundColor: colors.surfaceMuted,
          color: colors.text,
          font: 'inherit',
          fontSize: 17,
        },
      })}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...typography.label, color: colors.textMuted },
  error: { ...typography.small, color: colors.danger },
})
