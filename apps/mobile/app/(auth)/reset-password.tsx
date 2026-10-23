import { zodResolver } from '@hookform/resolvers/zod'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert, StyleSheet, Text } from 'react-native'
import { z } from 'zod'
import { Button, Card, PageHeader, Screen, TextField } from '../../src/components'
import { apiRequest, errorMessage } from '../../src/lib/api'
import { colors, spacing, typography } from '../../src/theme/tokens'

const resetFormSchema = z
  .object({
    password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200),
    confirmPassword: z.string().min(8, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak sama',
  })

type ResetForm = z.infer<typeof resetFormSchema>

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: values.password }),
      })
      Alert.alert('Berhasil', 'Kata sandi diperbarui. Silakan masuk kembali.', [
        { text: 'Masuk', onPress: () => router.replace('/login') },
      ])
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  return (
    <Screen keyboard>
      <PageHeader
        title="Kata sandi baru"
        subtitle="Buat kata sandi baru minimal 8 karakter. Gunakan kombinasi yang tidak dipakai di layanan lain."
      />
      <Card style={styles.card}>
        {token ? (
          <>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <TextField
                  label="Kata sandi baru"
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <TextField
                  label="Ulangi kata sandi"
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
            {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
            <Button
              title={isSubmitting ? 'Menyimpan...' : 'Simpan kata sandi'}
              onPress={() => void onSubmit()}
              loading={isSubmitting}
            />
          </>
        ) : (
          <Text style={styles.error}>
            Tautan pemulihan tidak valid. Minta tautan baru dari halaman lupa kata sandi.
          </Text>
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  error: { ...typography.small, color: colors.danger },
})
