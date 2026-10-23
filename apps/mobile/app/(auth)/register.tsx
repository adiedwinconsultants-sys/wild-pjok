import { zodResolver } from '@hookform/resolvers/zod'
import { registerInputSchema } from '@pjok/shared'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import { z } from 'zod'
import { Button, Card, Screen, TextField } from '../../src/components'
import { errorMessage } from '../../src/lib/api'
import { useAuthStore } from '../../src/lib/auth-store'
import { colors, spacing, typography } from '../../src/theme/tokens'

const registerFormSchema = registerInputSchema
  .extend({
    confirmPassword: z.string().min(8, 'Ulangi kata sandi minimal 8 karakter'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak sama',
  })

type RegisterForm = z.infer<typeof registerFormSchema>

export default function RegisterScreen() {
  const signUp = useAuthStore((state) => state.signUp)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      school: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        school: values.school?.trim() || null,
      })
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  return (
    <Screen keyboard>
      <View style={styles.hero}>
        <Text style={styles.title}>Buat akun guru</Text>
        <Text style={styles.subtitle}>
          Akun baru langsung aktif. Anda dapat mengelola kelas dan asesmen milik sendiri.
        </Text>
      </View>

      <Card style={styles.formCard}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label="Nama lengkap"
              placeholder="Nama sesuai identitas"
              autoComplete="name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              placeholder="nama@sekolah.id"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="school"
          render={({ field }) => (
            <TextField
              label="Sekolah (opsional)"
              placeholder="Nama sekolah"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.school?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label="Kata sandi"
              placeholder="Minimal 8 karakter"
              secureTextEntry
              autoCapitalize="none"
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
              placeholder="Ketik ulang kata sandi"
              secureTextEntry
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.confirmPassword?.message}
            />
          )}
        />
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        <Button
          title="Daftar"
          onPress={() => void onSubmit()}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submit}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Sudah punya akun?</Text>
        <Link href="/login" style={styles.link}>
          Masuk
        </Link>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, maxWidth: 340 },
  formCard: { gap: spacing.md },
  submit: { marginTop: spacing.xs },
  error: { ...typography.small, color: colors.danger },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerText: { ...typography.small, color: colors.textMuted },
  link: { ...typography.subheading, color: colors.primary },
})
