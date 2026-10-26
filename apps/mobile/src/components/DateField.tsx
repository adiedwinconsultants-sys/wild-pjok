import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { type DateFieldProps, dateOnlyValue, parseDateOnly } from '../lib/date-only'
import { formatDate, todayIso } from '../lib/format'
import { colors, radius, spacing, typography } from '../theme/tokens'
import { Button } from './Button'

export function DateField({ label, value, onChange, onBlur, error, disabled }: DateFieldProps) {
  const [visible, setVisible] = useState(false)
  const [candidate, setCandidate] = useState(new Date())
  const maximum = parseDateOnly(todayIso()) ?? new Date()

  function commit(date: Date) {
    const next = dateOnlyValue(date)
    if (parseDateOnly(next) && next <= todayIso()) onChange(next)
    onBlur?.()
  }

  function open() {
    const fallback = new Date(maximum)
    fallback.setFullYear(fallback.getFullYear() - 12)
    const current = parseDateOnly(value)
    const initial = current && current <= maximum ? current : fallback
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        display: 'spinner',
        maximumDate: maximum,
        positiveButton: { label: 'Pilih' },
        negativeButton: { label: 'Batal' },
        onValueChange: (_event, date) => commit(date),
        onDismiss: onBlur,
      })
    } else {
      setCandidate(initial)
      setVisible(true)
    }
  }

  function dismiss() {
    setVisible(false)
    onBlur?.()
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? formatDate(value) : 'Belum dipilih' }}
        accessibilityHint={error ?? 'Buka pemilih tanggal, bulan, dan tahun'}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={open}
        style={[styles.field, error ? styles.invalid : null, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatDate(value) : 'Pilih tanggal lahir'}
        </Text>
        <Text style={styles.action}>Pilih</Text>
      </Pressable>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
          <View style={styles.overlay}>
            <View style={styles.sheet} accessibilityViewIsModal>
              <Text style={styles.title}>{label}</Text>
              <DateTimePicker
                accessibilityLabel={label}
                value={candidate}
                mode="date"
                display="spinner"
                locale="id-ID"
                maximumDate={maximum}
                onValueChange={(_event, date) => setCandidate(date)}
              />
              <Button
                title="Gunakan tanggal"
                onPress={() => {
                  commit(candidate)
                  setVisible(false)
                }}
              />
              <Button title="Batal" variant="ghost" onPress={dismiss} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...typography.label, color: colors.textMuted },
  field: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  value: { ...typography.body, color: colors.text, flex: 1 },
  action: { ...typography.small, color: colors.primary },
  placeholder: { color: colors.textSubtle },
  invalid: { borderColor: colors.danger },
  disabled: { opacity: 0.5 },
  error: { ...typography.small, color: colors.danger },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text },
})
