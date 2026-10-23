import { z } from 'zod'
import { academicYearSchema, isoDateSchema, sexSchema } from './common'

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nama kelas wajib diisi').max(80),
  gradeLevel: z.coerce.number().int().min(1).max(12),
  academicYear: academicYearSchema,
  notes: z.string().trim().max(500).optional(),
})

export const classUpdateSchema = classCreateSchema.partial()

export const classResponseSchema = classCreateSchema.extend({
  id: z.string(),
  teacherId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const classWithCountSchema = classResponseSchema.extend({
  studentCount: z.number().int().min(0),
})

export const studentCreateSchema = z.object({
  fullName: z.string().trim().min(1, 'Nama siswa wajib diisi').max(120),
  nis: z.string().trim().min(1, 'NIS wajib diisi').max(40),
  sex: sexSchema,
  birthDate: isoDateSchema,
})

export const studentUpdateSchema = studentCreateSchema.partial()

export const studentResponseSchema = studentCreateSchema.extend({
  id: z.string(),
  teacherId: z.string(),
  classId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const studentQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
})

export const studentImportRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  fullName: z.string().trim().min(1, 'Nama wajib diisi'),
  nis: z.string().trim().min(1, 'NIS wajib diisi'),
  sex: sexSchema,
  birthDate: isoDateSchema,
})

export const studentImportSummarySchema = z.object({
  valid: z.array(studentImportRowSchema),
  duplicates: z.array(studentImportRowSchema),
  errors: z.array(
    z.object({
      rowNumber: z.number().int().min(1),
      message: z.string(),
    }),
  ),
})

export type ClassCreateInput = z.infer<typeof classCreateSchema>
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>
export type StudentCreateInput = z.infer<typeof studentCreateSchema>
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>
export type StudentImportRow = z.infer<typeof studentImportRowSchema>
export type StudentImportSummary = z.infer<typeof studentImportSummarySchema>
