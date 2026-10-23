import type {
  ClassCreateInput,
  ClassUpdateInput,
  ClassWithCount,
  Student,
  StudentCreateInput,
  StudentImportRow,
  StudentUpdateInput,
} from '@pjok/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Platform } from 'react-native'
import { apiRequest, apiRequestPaginated } from '../../lib/api'

export type StudentImportResult = {
  dryRun: boolean
  valid: StudentImportRow[]
  duplicates: StudentImportRow[]
  errors: Array<{ rowNumber: number; message: string }>
  inserted: number
}

export type ClassRecap = {
  assessmentId: string | null
  average: number | null
  min: number | null
  max: number | null
  distribution: Record<'sangat_baik' | 'baik' | 'cukup' | 'perlu_bimbingan', number>
  students: Array<{
    studentId: string
    finalScore: number
    category: 'sangat_baik' | 'baik' | 'cukup' | 'perlu_bimbingan'
    processScore: number | null
    productScore: number | null
    fullName: string
    nis: string
  }>
}

export function useClasses(query = '') {
  return useQuery({
    queryKey: ['classes', query],
    queryFn: () =>
      apiRequestPaginated<ClassWithCount>(
        `/classes?perPage=100${query ? `&q=${encodeURIComponent(query)}` : ''}`,
      ),
  })
}

export function useClass(classId: string) {
  return useQuery({
    queryKey: ['class', classId],
    queryFn: () => apiRequest<ClassWithCount>(`/classes/${classId}`),
    enabled: Boolean(classId),
  })
}

export function useClassStudents(classId: string) {
  return useQuery({
    queryKey: ['students', classId],
    queryFn: () => apiRequestPaginated<Student>(`/classes/${classId}/students?perPage=100`),
    enabled: Boolean(classId),
  })
}

export function useClassRecap(classId: string) {
  return useQuery({
    queryKey: ['recap', classId],
    queryFn: () => apiRequest<ClassRecap>(`/classes/${classId}/recap`),
    enabled: Boolean(classId),
  })
}

export function useCreateClass() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ClassCreateInput) =>
      apiRequest<ClassWithCount>('/classes', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['classes'] }),
  })
}

export function useUpdateClass(classId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ClassUpdateInput) =>
      apiRequest<ClassWithCount>(`/classes/${classId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['classes'] })
      void client.invalidateQueries({ queryKey: ['class', classId] })
    },
  })
}

export function useDeleteClass() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (classId: string) => apiRequest<void>(`/classes/${classId}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['classes'] }),
  })
}

export function useCreateStudent(classId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: StudentCreateInput) =>
      apiRequest<Student>(`/classes/${classId}/students`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['students', classId] })
      void client.invalidateQueries({ queryKey: ['class', classId] })
      void client.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}

export function useUpdateStudent(classId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: string; input: StudentUpdateInput }) =>
      apiRequest<Student>(`/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['students', classId] }),
  })
}

export function useDeleteStudent(classId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) =>
      apiRequest<void>(`/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['students', classId] })
      void client.invalidateQueries({ queryKey: ['class', classId] })
      void client.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}

export function useImportStudents(classId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({
      asset,
      dryRun,
    }: {
      asset: { uri: string; name: string; mimeType?: string; file?: File }
      dryRun: boolean
    }) => {
      const form = new FormData()
      if (Platform.OS === 'web' && asset.file) {
        form.append('file', asset.file)
      } else {
        form.append('file', {
          uri: asset.uri,
          name: asset.name,
          type:
            asset.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as unknown as Blob)
      }
      return apiRequest<StudentImportResult>(
        `/classes/${classId}/students/import?dryRun=${dryRun}`,
        { method: 'POST', body: form },
      )
    },
    onSuccess: (result) => {
      if (!result.dryRun) {
        void client.invalidateQueries({ queryKey: ['students', classId] })
        void client.invalidateQueries({ queryKey: ['class', classId] })
        void client.invalidateQueries({ queryKey: ['classes'] })
      }
    },
  })
}
