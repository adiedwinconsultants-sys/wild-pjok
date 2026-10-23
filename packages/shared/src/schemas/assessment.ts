import { z } from 'zod'
import { isoDateSchema, paginationQuerySchema } from './common'

export const assessmentInputSchema = z.object({
  classId: z.string().min(1, 'Kelas wajib dipilih'),
  instrumentId: z.string().min(1, 'Instrumen wajib dipilih'),
  date: isoDateSchema,
  participantIds: z.array(z.string().min(1)).min(1, 'Pilih minimal satu peserta didik'),
})

export const scoreInputSchema = z.object({
  studentId: z.string().min(1),
  indicatorId: z.string().min(1),
  rawValue: z.number().finite('Nilai harus berupa angka'),
})

export const scoreBatchInputSchema = z.object({
  scores: z.array(scoreInputSchema).min(1, 'Tidak ada nilai yang dikirim'),
})

export const feedbackInputSchema = z.object({
  note: z.string().trim().max(2000, 'Umpan balik maksimal 2000 karakter'),
})

export const assessmentUpdateSchema = z.object({
  date: isoDateSchema.optional(),
  participantIds: z.array(z.string().min(1)).min(1).optional(),
})

export const assessmentListQuerySchema = paginationQuerySchema.extend({
  classId: z.string().min(1).optional(),
  instrumentId: z.string().min(1).optional(),
  status: z.enum(['draft', 'finalized', 'reopened']).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  q: z.string().trim().max(120).optional(),
})

export const reopenInputSchema = z.object({
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter').max(500),
})

export const assessmentResultSchema = z.object({
  studentId: z.string(),
  scores: z.array(
    z.object({
      indicatorId: z.string(),
      rawValue: z.number(),
      normalizedValue: z.number(),
      kind: z.enum(['process', 'product']),
    }),
  ),
  processScore: z.number().nullable(),
  productScore: z.number().nullable(),
  finalScore: z.number(),
  category: z.enum(['sangat_baik', 'baik', 'cukup', 'perlu_bimbingan']),
  feedback: z.string().nullable(),
})

export type AssessmentInput = z.infer<typeof assessmentInputSchema>
export type ScoreInput = z.infer<typeof scoreInputSchema>
export type ScoreBatchInput = z.infer<typeof scoreBatchInputSchema>
export type FeedbackInput = z.infer<typeof feedbackInputSchema>
export type AssessmentListQuery = z.infer<typeof assessmentListQuerySchema>
export type ReopenInput = z.infer<typeof reopenInputSchema>
