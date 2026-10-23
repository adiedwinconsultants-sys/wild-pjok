import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../src/lib/auth-store'
import { colors, fonts } from '../../src/theme/tokens'

export default function AppLayout() {
  const status = useAuthStore((state) => state.status)
  if (status !== 'authenticated') return <Redirect href="/login" />
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerBackTitle: 'Kembali',
        headerTitleStyle: { fontFamily: fonts.bodySemiBold, fontSize: 17 },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="classes/[id]" options={{ title: 'Detail kelas' }} />
      <Stack.Screen name="class-form" options={{ title: 'Kelas', presentation: 'modal' }} />
      <Stack.Screen name="student-form" options={{ title: 'Siswa', presentation: 'modal' }} />
      <Stack.Screen
        name="import-students"
        options={{ title: 'Impor Excel', presentation: 'modal' }}
      />
      <Stack.Screen name="catalog/index" options={{ title: 'Katalog' }} />
      <Stack.Screen name="catalog/[slug]" options={{ title: 'Instrumen' }} />
      <Stack.Screen name="assessments/new" options={{ title: 'Asesmen baru' }} />
      <Stack.Screen name="assessments/[id]" options={{ title: 'Input nilai' }} />
      <Stack.Screen name="assessments/[id]/results" options={{ title: 'Hasil asesmen' }} />
      <Stack.Screen name="admin/users" options={{ title: 'Kelola pengguna' }} />
    </Stack>
  )
}
