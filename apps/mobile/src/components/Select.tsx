import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme/tokens'

export type SelectOption<T extends string> = { value: T; label: string }

type SelectProps<T extends string> = {
  label?: string
  value: T | null
  options: SelectOption<T>[]
  onChange: (value: T) => void
  error?: string
  disabled?: boolean
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  disabled,
}: SelectProps<T>) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: Boolean(disabled) }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
                disabled && styles.optionDisabled,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, color: colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionPressed: { opacity: 0.8 },
  optionDisabled: { opacity: 0.5 },
  optionText: { ...typography.body, color: colors.text },
  optionTextSelected: { color: colors.textInverse, fontWeight: '600' },
  error: { ...typography.small, color: colors.danger },
})
