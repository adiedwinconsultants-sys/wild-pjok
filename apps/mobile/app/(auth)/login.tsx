import { zodResolver } from '@hookform/resolvers/zod'
import { type LoginInput, loginInputSchema } from '@pjok/shared'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen, TextField } from '../../src/components'
import { errorMessage } from '../../src/lib/api'
import { useAuthStore } from '../../src/lib/auth-store'
import { colors, radius, spacing, typography } from '../../src/theme/tokens'

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
        <View style={styles.logo}>
          <Text style={styles.logoText}>PJOK</Text>
        </View>
        <Text style={styles.title}>Masuk ke akun Anda</Text>
        <Text style={styles.subtitle}>
          Kelola kelas, catat indikator, dan susun laporan asesmen PJOK.
        </Text>
      </View>

      <Card style={styles.formCard}>
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
          title="Masuk"
          onPress={() => void onSubmit()}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submit}
        />
      </Card>

      <View style={styles.links}>
        <Link href="/forgot-password" style={styles.link}>
          Lupa kata sandi?
        </Link>
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Belum punya akun?</Text>
          <Link href="/register" style={styles.registerLink}>
            Daftar
          </Link>
        </View>
      </View>

      <Text style={styles.footnote}>
        Nilai akhir selalu dihitung ulang di server. Data peserta didik tidak ditulis ke log.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceInk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    ...typography.subheading,
    color: colors.textInverse,
    fontSize: 17,
    letterSpacing: 0.4,
  },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  formCard: { gap: spacing.md },
  submit: { marginTop: spacing.xs },
  error: { ...typography.small, color: colors.danger },
  links: { gap: spacing.sm, marginTop: spacing.xl, alignItems: 'center' },
  link: {
    ...typography.subheading,
    color: colors.primary,
    minHeight: 44,
    textAlignVertical: 'center',
    paddingVertical: spacing.sm,
  },
  registerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  registerText: { ...typography.small, color: colors.textMuted },
  registerLink: { ...typography.subheading, color: colors.primary },
  footnote: {
    ...typography.small,
    fontSize: 13,
    color: colors.textSubtle,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
})
