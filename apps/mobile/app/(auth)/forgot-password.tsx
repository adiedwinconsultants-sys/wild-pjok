import { zodResolver } from '@hookform/resolvers/zod'
import { type ForgotPasswordInput, forgotPasswordInputSchema } from '@pjok/shared'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen, TextField } from '../../src/components'
import { apiRequest, errorMessage } from '../../src/lib/api'
import { colors, spacing, typography } from '../../src/theme/tokens'

export default function ForgotPasswordScreen() {
  const [message, setMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordInputSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    setMessage(null)
    try {
      const result = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setMessage(result.message)
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  return (
    <Screen keyboard>
      <View style={styles.header}>
        <Text style={styles.title}>Pulihkan akses</Text>
        <Text style={styles.subtitle}>
          Masukkan email terdaftar. Kami akan mengirim tautan pemulihan bila email tersebut aktif.
        </Text>
      </View>
      <Card>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              placeholder="nama@sekolah.id"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
            />
          )}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        <Button
          title={isSubmitting ? 'Mengirim...' : 'Kirim tautan pemulihan'}
          onPress={() => void onSubmit()}
          loading={isSubmitting}
        />
        <Link href="/login" style={styles.link}>
          Kembali ke halaman masuk
        </Link>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  success: { ...typography.small, color: colors.success },
  error: { ...typography.small, color: colors.danger },
  link: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
})
