import { useState } from 'react'
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme/tokens'

type TextFieldProps = TextInputProps & {
  label?: string
  error?: string
  hint?: string
}

export function TextField({
  label,
  error,
  hint,
  style,
  placeholder,
  accessibilityLabel,
  onFocus,
  onBlur,
  multiline,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
        accessibilityHint={error ? `Kesalahan: ${error}` : hint}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.primary}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...typography.label, color: colors.textMuted },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: 17,
    lineHeight: 22,
  },
  inputMultiline: { minHeight: 104, textAlignVertical: 'top' },
  inputFocused: { backgroundColor: colors.surface, borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  error: { ...typography.small, fontSize: 13, color: colors.danger },
  hint: { ...typography.small, fontSize: 13, color: colors.textMuted },
})
