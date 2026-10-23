import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Badge, Button, Card, Screen, TextField } from '../../../src/components'
import { errorMessage } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/lib/auth-store'
import { colors, spacing, typography } from '../../../src/theme/tokens'

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

  return (
    <Screen keyboard>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROFIL</Text>
        <Text style={styles.title}>{user?.name ?? 'Guru'}</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
        <Badge label="Guru PJOK" tone="info" />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Identitas laporan</Text>
        <Text style={styles.cardHint}>
          Nama, NIP, dan sekolah dipakai pada kop laporan Excel/PDF.
        </Text>
        <TextField label="Nama lengkap" value={name} onChangeText={setName} />
        <TextField label="NIP" value={nip} onChangeText={setNip} keyboardType="number-pad" />
        <TextField label="Sekolah" value={school} onChangeText={setSchool} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={saving ? 'Menyimpan...' : 'Simpan profil'}
          onPress={onSave}
          loading={saving}
        />
      </Card>

      <Button title="Keluar" variant="danger" onPress={onLogout} style={styles.logout} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.xl },
  eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  cardTitle: { ...typography.heading, color: colors.text },
  cardHint: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  success: { ...typography.small, color: colors.success },
  error: { ...typography.small, color: colors.danger },
  logout: { marginTop: spacing.xl },
})
