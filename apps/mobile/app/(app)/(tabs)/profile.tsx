import { USER_ROLE_LABELS, isAdminRole } from '@pjok/shared'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Button,
  Card,
  ListRow,
  PageHeader,
  Screen,
  SectionLabel,
  TextField,
} from '../../../src/components'
import { errorMessage } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/lib/auth-store'
import { colors, radius, spacing, typography } from '../../../src/theme/tokens'

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const signOut = useAuthStore((state) => state.signOut)

  const [name, setName] = useState(user?.name ?? '')
  const [nip, setNip] = useState(user?.nip ?? '')
  const [school, setSchool] = useState(user?.school ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setNip(user?.nip ?? '')
    setSchool(user?.school ?? '')
  }, [user])

  const onSave = async () => {
    setMessage(null)
    setError(null)
    if (!name.trim()) {
      setError('Nama wajib diisi')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        nip: nip.trim() || null,
        school: school.trim() || null,
      })
      setMessage('Profil tersimpan')
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const onLogout = () => {
    Alert.alert('Keluar dari akun?', 'Anda perlu masuk kembali untuk mengakses data.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void signOut() },
    ])
  }

  const role = user?.role ?? 'teacher'

  return (
    <Screen keyboard>
      <PageHeader
        title="Profil"
        subtitle="Nama, NIP, dan sekolah dipakai pada kop laporan Excel/PDF."
      />

      <Card variant="quiet" style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user?.name ?? 'Guru')}</Text>
        </View>
        <View style={styles.identityTexts}>
          <Text style={styles.name}>{user?.name ?? 'Guru'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <Badge label={USER_ROLE_LABELS[role]} tone={isAdminRole(role) ? 'info' : 'neutral'} />
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionLabel>Data laporan</SectionLabel>
        <Card style={styles.formCard}>
          <TextField label="Nama lengkap" value={name} onChangeText={setName} />
          <TextField
            label="NIP / NUPTK"
            value={nip}
            onChangeText={setNip}
            keyboardType="number-pad"
          />
          <TextField label="Sekolah" value={school} onChangeText={setSchool} />
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title={saving ? 'Menyimpan...' : 'Simpan profil'}
            onPress={() => void onSave()}
            loading={saving}
          />
        </Card>
      </View>

      {isAdminRole(role) ? (
        <View style={styles.section}>
          <SectionLabel>Administrasi</SectionLabel>
          <ListRow
            icon="shield-checkmark-outline"
            title="Kelola pengguna"
            subtitle="Lihat akun dan ubah peran guru"
            onPress={() => router.push('/admin/users')}
          />
        </View>
      ) : null}

      <Button title="Keluar dari akun" variant="ghost" onPress={onLogout} style={styles.logout} />
      <Text style={styles.version}>PJOK Asesmen · Versi 1.0</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceInk,
  },
  avatarText: { ...typography.subheading, color: colors.textInverse, fontSize: 20 },
  identityTexts: { flex: 1, gap: 3 },
  name: { ...typography.heading, color: colors.text },
  email: { ...typography.small, color: colors.textMuted },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  section: { gap: spacing.sm, marginTop: spacing.xl },
  formCard: { gap: spacing.md },
  success: { ...typography.small, color: colors.success },
  error: { ...typography.small, color: colors.danger },
  logout: { marginTop: spacing.xl },
  version: {
    ...typography.small,
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.md,
  },
})
