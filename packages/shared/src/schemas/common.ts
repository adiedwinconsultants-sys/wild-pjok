import { z } from 'zod'

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Tanggal tidak valid')

export const idSchema = z.string().min(1, 'ID wajib diisi')
export const uuidSchema = z.string().uuid('ID tidak valid')

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const academicYearSchema = z
  .string()
  .regex(/^\d{4}\/\d{4}$/, 'Tahun ajaran harus berformat YYYY/YYYY')
  .refine((value) => {
    const [start, end] = value.split('/').map(Number)
    return end === (start ?? 0) + 1
  }, 'Tahun ajaran tidak valid')

export const sexSchema = z.enum(['L', 'P'], { message: 'Jenis kelamin harus L atau P' })
