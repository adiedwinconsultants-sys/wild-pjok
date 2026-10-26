import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, shadow, spacing, typography } from '../theme/tokens'

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
  wrapper: { gap: 6 },
  label: { ...typography.label, color: colors.textMuted },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  option: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },
  optionSelected: { backgroundColor: colors.surface, ...shadow.floating },
  optionPressed: { opacity: 0.7 },
  optionDisabled: { opacity: 0.5 },
  optionText: {
    fontFamily: typography.subheading.fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textMuted,
  },
  optionTextSelected: { color: colors.text, fontWeight: '600' },
  error: { ...typography.small, fontSize: 13, color: colors.danger },
})
