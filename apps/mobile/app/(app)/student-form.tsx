import { zodResolver } from '@hookform/resolvers/zod'
import { type Sex, type StudentCreateInput, studentCreateSchema } from '@pjok/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import {
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Select,
  TextField,
} from '../../src/components'
import {
  useClassStudents,
  useCreateStudent,
  useUpdateStudent,
} from '../../src/features/classes/hooks'
import { errorMessage } from '../../src/lib/api'
import { colors, spacing, typography } from '../../src/theme/tokens'

export default function StudentFormScreen() {
  const params = useLocalSearchParams<{ classId?: string; studentId?: string }>()
  const classId = typeof params.classId === 'string' ? params.classId : ''
  const studentId = typeof params.studentId === 'string' ? params.studentId : ''
  const isEdit = Boolean(studentId)
  const students = useClassStudents(classId)
  const createStudent = useCreateStudent(classId)
  const updateStudent = useUpdateStudent(classId)
  const [serverError, setServerError] = useState<string | null>(null)

  const hydratedStudentId = useRef<string | null>(null)
  const existing = students.data?.data.find((item) => item.id === studentId)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentCreateInput>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: { fullName: '', nis: '', sex: 'L', birthDate: '' },
  })

  useEffect(() => {
    if (existing && hydratedStudentId.current !== studentId) {
      hydratedStudentId.current = studentId
      reset({
        fullName: existing.fullName,
        nis: existing.nis,
        sex: existing.sex,
        birthDate: existing.birthDate,
      })
    }
  }, [existing, reset, studentId])

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      if (isEdit) {
        await updateStudent.mutateAsync({ studentId, input: values })
      } else {
        await createStudent.mutateAsync(values)
      }
      router.back()
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  if (isEdit && students.isLoading)
    return (
      <Screen>
        <LoadingState message="Memuat siswa..." />
      </Screen>
    )
  if (isEdit && students.isError)
    return (
      <Screen>
        <ErrorState message={errorMessage(students.error)} onRetry={() => students.refetch()} />
      </Screen>
    )
  if (isEdit && !existing)
    return (
      <Screen>
        <EmptyState
          title="Siswa tidak ditemukan"
          message="Kembali ke kelas dan pilih siswa yang masih terdaftar."
        />
      </Screen>
    )

  return (
    <Screen keyboard>
      <View style={styles.header}>
        <Text style={styles.title}>{isEdit ? 'Ubah siswa' : 'Siswa baru'}</Text>
        <Text style={styles.subtitle}>Data peserta didik bersifat pribadi. Isi dengan benar.</Text>
      </View>
      <Card>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <TextField
              label="Nama lengkap"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="nis"
          render={({ field }) => (
            <TextField
              label="NIS"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.nis?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="sex"
          render={({ field }) => (
            <Select<Sex>
              label="Jenis kelamin"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' },
              ]}
              error={errors.sex?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="birthDate"
          render={({ field }) => (
            <DateField
              label="Tanggal lahir"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.birthDate?.message}
            />
          )}
        />
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        <Button
          title={isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan perubahan' : 'Tambah siswa'}
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
