import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/lib/auth-store'
import { queryClient } from '../src/lib/query-client'
import { colors, spacing, typography } from '../src/theme/tokens'

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
            <Text style={styles.brand}>PJOK Asesmen</Text>
            <Text style={styles.tagline}>Penilaian gerak yang terukur</Text>
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  brand: { ...typography.title, color: colors.primary },
  tagline: { ...typography.body, color: colors.textMuted },
  spinner: { marginTop: spacing.lg },
})
