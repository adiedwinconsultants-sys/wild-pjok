import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme/tokens'

type TextFieldProps = TextInputProps & {
  label?: string
  error?: string
  hint?: string
}

export function TextField({ label, error, hint, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  error: { ...typography.small, color: colors.danger },
  hint: { ...typography.small, color: colors.textMuted },
})
