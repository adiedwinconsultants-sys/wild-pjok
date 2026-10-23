import { router } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../../../src/components'
import { colors, spacing, typography } from '../../../src/theme/tokens'

export default function WorkosCallbackScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => router.replace('/login'), 12000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <Screen scroll={false}>
      <View style={styles.wrapper}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.title}>Menyelesaikan masuk</Text>
        <Text style={styles.message}>
          Tunggu sebentar. Jika tidak berhasil, Anda akan diarahkan kembali ke halaman masuk.
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: { ...typography.subheading, color: colors.text },
  message: { ...typography.small, color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
})
