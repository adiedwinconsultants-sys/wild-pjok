import { type UserRole, isAdminRole } from '@pjok/shared'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Screen,
  SectionLabel,
  Select,
  TextField,
} from '../../../src/components'
import { useAdminUsers, useUpdateUserRole } from '../../../src/features/admin/hooks'
import { errorMessage } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/lib/auth-store'
import { colors, radius, spacing, typography } from '../../../src/theme/tokens'

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'teacher', label: 'Guru' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' },
]

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function AdminUsersScreen() {
  const currentUser = useAuthStore((state) => state.user)
  const [query, setQuery] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const users = useAdminUsers(query.trim())
  const updateRole = useUpdateUserRole()

  const rows = useMemo(() => users.data?.data ?? [], [users.data])

  if (!currentUser || !isAdminRole(currentUser.role)) {
    return (
      <Screen>
        <EmptyState title="Akses terbatas" message="Halaman ini hanya dapat dibuka oleh admin." />
      </Screen>
    )
  }

  const onRoleChange = (userId: string, role: UserRole) => {
    setActionError(null)
    updateRole.mutate({ userId, role }, { onError: (error) => setActionError(errorMessage(error)) })
  }

  return (
    <Screen>
      <PageHeader
        title="Kelola pengguna"
        subtitle="Ubah peran akun. Superadmin dapat mengelola seluruh kelas dan asesmen."
      />

      <TextField
        placeholder="Cari nama atau email"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        style={styles.search}
      />

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {users.isLoading ? <LoadingState message="Memuat pengguna..." /> : null}
      {users.isError ? (
        <ErrorState message={errorMessage(users.error)} onRetry={() => users.refetch()} />
      ) : null}
      {users.isSuccess && rows.length === 0 ? (
        <EmptyState title="Pengguna tidak ditemukan" message="Coba kata kunci lain." />
      ) : null}

      <View style={styles.list}>
        <SectionLabel>{users.data?.meta.total ?? 0} akun</SectionLabel>
        {rows.map((row) => {
          const isSelf = row.id === currentUser.id
          return (
            <Card key={row.id} style={styles.userCard}>
              <View style={styles.userRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsOf(row.name)}</Text>
                </View>
                <View style={styles.userTexts}>
                  <Text style={styles.name}>{row.name}</Text>
                  <Text style={styles.email}>{row.email}</Text>
                  <Text style={styles.meta}>
                    {row.classCount} kelas
                    {row.school ? ` · ${row.school}` : ''}
                  </Text>
                </View>
                {isSelf ? <Badge label="Anda" /> : null}
              </View>
              <Select<UserRole>
                label="Peran"
                value={row.role}
                disabled={isSelf}
                onChange={(role) => onRoleChange(row.id, role)}
                options={roleOptions}
              />
            </Card>
          )
        })}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: { marginBottom: spacing.lg },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  userCard: { gap: spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.textMuted },
  userTexts: { flex: 1, gap: 2 },
  name: { ...typography.subheading, color: colors.text },
  email: { ...typography.small, color: colors.textMuted },
  meta: { ...typography.small, fontSize: 13, color: colors.textSubtle },
})
