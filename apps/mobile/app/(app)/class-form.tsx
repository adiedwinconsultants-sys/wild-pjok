import { zodResolver } from '@hookform/resolvers/zod'
import { type ClassCreateInput, classCreateSchema } from '@pjok/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import { Button, Card, LoadingState, Screen, TextField } from '../../src/components'
import { useClass, useCreateClass, useUpdateClass } from '../../src/features/classes/hooks'
import { errorMessage } from '../../src/lib/api'
import { academicYearNow } from '../../src/lib/format'
import { colors, spacing, typography } from '../../src/theme/tokens'

export default function ClassFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const classId = typeof params.id === 'string' ? params.id : ''
  const isEdit = Boolean(classId)
  const existing = useClass(classId)
  const createClass = useCreateClass()
  const updateClass = useUpdateClass(classId)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassCreateInput>({
    resolver: zodResolver(classCreateSchema),
    defaultValues: {
      name: '',
      gradeLevel: 7,
      academicYear: academicYearNow(),
      notes: '',
    },
  })

  useEffect(() => {
    if (existing.data) {
      reset({
        name: existing.data.name,
        gradeLevel: existing.data.gradeLevel,
        academicYear: existing.data.academicYear,
        notes: existing.data.notes ?? '',
      })
    }
  }, [existing.data, reset])

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      if (isEdit) {
        await updateClass.mutateAsync(values)
      } else {
        await createClass.mutateAsync(values)
      }
      router.back()
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  if (isEdit && existing.isLoading) {
    return (
      <Screen>
        <LoadingState message="Memuat kelas..." />
      </Screen>
    )
  }

  return (
    <Screen keyboard>
      <View style={styles.header}>
        <Text style={styles.title}>{isEdit ? 'Ubah kelas' : 'Kelas baru'}</Text>
        <Text style={styles.subtitle}>
          Nama dan tahun ajaran harus unik untuk setiap kelas Anda.
        </Text>
      </View>
      <Card>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label="Nama kelas"
              placeholder="Contoh: VII A"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="gradeLevel"
          render={({ field }) => (
            <TextField
              label="Tingkat"
              keyboardType="number-pad"
              value={String(field.value ?? '')}
              onChangeText={(text) => field.onChange(Number(text))}
              onBlur={field.onBlur}
              error={errors.gradeLevel?.message}
              hint="Isi angka 1 sampai 12."
            />
          )}
        />
        <Controller
          control={control}
          name="academicYear"
          render={({ field }) => (
            <TextField
              label="Tahun ajaran"
              placeholder="2025/2026"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.academicYear?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextField
              label="Catatan (opsional)"
              placeholder="Jadwal, ruang, atau catatan lain"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline
              numberOfLines={3}
              error={errors.notes?.message}
            />
          )}
        />
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        <Button
          title={isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan perubahan' : 'Tambah kelas'}
          onPress={() => void onSubmit()}
          loading={isSubmitting}
        />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  error: { ...typography.small, color: colors.danger },
})
