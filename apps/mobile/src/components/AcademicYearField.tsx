import { StyleSheet, Text, View } from 'react-native'
import { shiftAcademicYear } from '../features/classes/class-form-options'
import { academicYearNow } from '../lib/format'
import { colors, radius, spacing, typography } from '../theme/tokens'
import { Button } from './Button'

type AcademicYearFieldProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
}

export function AcademicYearField({ value, onChange, onBlur, error }: AcademicYearFieldProps) {
  const current = academicYearNow()
  function select(next: string) {
    onChange(next)
    onBlur?.()
  }
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Tahun ajaran</Text>
      <View style={[styles.control, error ? styles.invalid : null]}>
        <Button
          title="‹"
          accessibilityLabel="Tahun ajaran sebelumnya"
          fullWidth={false}
          variant="ghost"
          disabled={shiftAcademicYear(value, -1) === value}
          onPress={() => select(shiftAcademicYear(value, -1))}
        />
        <Text
          accessibilityLabel={`Tahun ajaran ${value}`}
          accessibilityLiveRegion="polite"
          style={styles.value}
        >
          {value}
        </Text>
        <Button
          title="›"
          accessibilityLabel="Tahun ajaran berikutnya"
          fullWidth={false}
          variant="ghost"
          disabled={shiftAcademicYear(value, 1) === value}
          onPress={() => select(shiftAcademicYear(value, 1))}
        />
      </View>
      {value !== current ? (
        <Button title={`Gunakan ${current}`} variant="ghost" onPress={() => select(current)} />
      ) : (
        <Text style={styles.hint}>Tahun ajaran saat ini</Text>
      )}
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
  control: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  value: { ...typography.subheading, color: colors.text },
  invalid: { borderColor: colors.danger },
  hint: { ...typography.small, color: colors.textMuted },
  error: { ...typography.small, color: colors.danger },
})
