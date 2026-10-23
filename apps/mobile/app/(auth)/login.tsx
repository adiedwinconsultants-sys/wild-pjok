import { zodResolver } from '@hookform/resolvers/zod'
import { type LoginInput, loginInputSchema } from '@pjok/shared'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen, TextField } from '../../src/components'
import { errorMessage } from '../../src/lib/api'
import { useAuthStore } from '../../src/lib/auth-store'
import { colors, spacing, typography } from '../../src/theme/tokens'

export default function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await signIn(values)
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  return (
    <Screen keyboard>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ASESMEN PJOK</Text>
        <Text style={styles.title}>Nilai gerak,{'\n'}bukan sekadar angka.</Text>
        <Text style={styles.subtitle}>
          Kelola kelas, catat indikator, dan susun laporan asesmen dalam satu tempat.
        </Text>
      </View>

      <Card>
        <Text style={styles.formTitle}>Masuk sebagai guru</Text>
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
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        <Button
          title={isSubmitting ? 'Memproses...' : 'Masuk'}
          onPress={() => void onSubmit()}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
        <Link href="/forgot-password" style={styles.link}>
          Lupa kata sandi?
        </Link>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.sm },
  eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 1.5 },
  title: { ...typography.title, color: colors.text, lineHeight: 34 },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  formTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  error: { ...typography.small, color: colors.danger },
  link: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
    minHeight: 44,
    paddingVertical: spacing.md,
  },
})
