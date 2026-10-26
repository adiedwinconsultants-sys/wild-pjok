import { zodResolver } from '@hookform/resolvers/zod'
import { type ClassCreateInput, classCreateSchema } from '@pjok/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import type { z } from 'zod'
import {
  AcademicYearField,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Select,
  TextField,
} from '../../src/components'
import { classNameOptions, gradeOptions } from '../../src/features/classes/class-form-options'
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

  const hydratedClassId = useRef<string | null>(null)
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof classCreateSchema>, undefined, ClassCreateInput>({
    resolver: zodResolver(classCreateSchema),
    defaultValues: {
      name: '',
      gradeLevel: 7,
      academicYear: academicYearNow(),
      notes: '',
    },
  })

  const gradeLevel = useWatch({ control, name: 'gradeLevel' })

  useEffect(() => {
    if (existing.data && hydratedClassId.current !== classId) {
      hydratedClassId.current = classId
      reset({
        name: existing.data.name,
        gradeLevel: existing.data.gradeLevel,
        academicYear: existing.data.academicYear,
        notes: existing.data.notes ?? '',
      })
    }
  }, [existing.data, reset, classId])

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

  if (isEdit && existing.isError)
    return (
      <Screen>
        <ErrorState message={errorMessage(existing.error)} onRetry={() => existing.refetch()} />
      </Screen>
    )
  if (isEdit && !existing.data)
    return (
      <Screen>
        <EmptyState
          title="Kelas tidak ditemukan"
          message="Kembali ke daftar kelas dan pilih kelas yang masih tersedia."
        />
      </Screen>
    )

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
          name="gradeLevel"
          render={({ field }) => (
            <Select
              label="Tingkat kelas"
              value={String(field.value)}
              options={gradeOptions}
              onChange={(value) => {
                field.onChange(Number(value))
                field.onBlur()
              }}
              error={errors.gradeLevel?.message}
            />
          )}
        />
        <Text style={styles.hint}>1?6 SD ? 7?9 SMP ? 10?12 SMA/SMK</Text>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <View style={styles.nameGroup}>
              <TextField
                label="Nama kelas"
                placeholder={`Contoh: ${classNameOptions(Number(gradeLevel))[0]?.label ?? 'VII A'}`}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.name?.message}
              />
              <Select
                label="Nama cepat (opsional)"
                value={field.value}
                options={classNameOptions(Number(gradeLevel))}
                onChange={(value) => {
                  field.onChange(value)
                  field.onBlur()
                }}
              />
            </View>
          )}
        />
        <Controller
          control={control}
          name="academicYear"
          render={({ field }) => (
            <AcademicYearField
              value={field.value}
              onChange={field.onChange}
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
  hint: { ...typography.small, color: colors.textMuted },
  nameGroup: { gap: spacing.md },
})
