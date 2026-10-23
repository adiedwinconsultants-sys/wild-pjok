import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../theme/tokens'

type ScreenProps = {
  children: ReactNode
  scroll?: boolean
  padded?: boolean
  keyboard?: boolean
}

export function Screen({ children, scroll = true, padded = true, keyboard = false }: ScreenProps) {
  const content = <View style={[styles.content, padded && styles.padded]}>{children}</View>

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : (
    content
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxl },
  content: { flexGrow: 1 },
  padded: { paddingHorizontal: 20, paddingTop: spacing.md },
})
