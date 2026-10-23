import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../src/lib/auth-store'
import { colors } from '../../src/theme/tokens'

export default function AppLayout() {
  const status = useAuthStore((state) => state.status)
  if (status !== 'authenticated') return <Redirect href="/login" />
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="classes/[id]" options={{ title: 'Detail Kelas' }} />
      <Stack.Screen name="class-form" options={{ title: 'Form Kelas', presentation: 'modal' }} />
      <Stack.Screen name="student-form" options={{ title: 'Form Siswa', presentation: 'modal' }} />
      <Stack.Screen
        name="import-students"
        options={{ title: 'Impor Excel', presentation: 'modal' }}
      />
      <Stack.Screen name="catalog/index" options={{ title: 'Katalog Instrumen' }} />
      <Stack.Screen name="catalog/[slug]" options={{ title: 'Panduan Instrumen' }} />
      <Stack.Screen name="assessments/new" options={{ title: 'Asesmen Baru' }} />
      <Stack.Screen name="assessments/[id]" options={{ title: 'Input Nilai' }} />
      <Stack.Screen name="assessments/[id]/results" options={{ title: 'Hasil Asesmen' }} />
    </Stack>
  )
}
