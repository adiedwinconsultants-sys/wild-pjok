import { z } from 'zod'

export const exportRequestSchema = z
  .object({
    assessmentId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    format: z.enum(['xlsx', 'pdf']),
  })
  .refine((value) => Boolean(value.assessmentId) !== Boolean(value.classId), {
    message: 'Pilih salah satu: assessmentId atau classId',
  })

export const exportJobSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  assessmentId: z.string().nullable(),
  classId: z.string().nullable(),
  format: z.enum(['xlsx', 'pdf']),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  downloadUrl: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
})

export type ExportRequest = z.infer<typeof exportRequestSchema>
export type ExportJob = z.infer<typeof exportJobSchema>
