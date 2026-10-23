import { zodResolver } from '@hookform/resolvers/zod'
import { type ForgotPasswordInput, forgotPasswordInputSchema } from '@pjok/shared'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text } from 'react-native'
import { Button, Card, PageHeader, Screen, TextField } from '../../src/components'
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
      <PageHeader
        title="Lupa kata sandi"
        subtitle="Masukkan email terdaftar. Kami akan mengirim tautan pemulihan bila email tersebut aktif."
      />
      <Card style={styles.card}>
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
          title={isSubmitting ? 'Mengirim...' : 'Kirim tautan'}
          onPress={() => void onSubmit()}
          loading={isSubmitting}
        />
      </Card>
      <Link href="/login" style={styles.link}>
        Kembali ke halaman masuk
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  success: { ...typography.small, color: colors.success },
  error: { ...typography.small, color: colors.danger },
  link: {
    ...typography.subheading,
    color: colors.primary,
    textAlign: 'center',
    minHeight: 44,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
})
