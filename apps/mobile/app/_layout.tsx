import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/lib/auth-store'
import { queryClient } from '../src/lib/query-client'
import { colors, radius, spacing, typography } from '../src/theme/tokens'

export default function RootLayout() {
  const status = useAuthStore((state) => state.status)
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        {status === 'loading' ? (
          <View style={styles.splash}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>PJOK</Text>
            </View>
            <Text style={styles.brand}>PJOK Asesmen</Text>
            <Text style={styles.tagline}>Penilaian gerak yang terukur</Text>
            <ActivityIndicator color={colors.textSubtle} style={styles.spinner} />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceInk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    ...typography.subheading,
    color: colors.textInverse,
    fontSize: 18,
    letterSpacing: 0.4,
  },
  brand: { ...typography.heading, color: colors.text },
  tagline: { ...typography.small, color: colors.textMuted },
  spinner: { marginTop: spacing.xl },
})
