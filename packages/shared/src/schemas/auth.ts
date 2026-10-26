import { z } from 'zod'

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid').max(254),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200),
})

export const registerInputSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().toLowerCase().email('Format email tidak valid').max(254),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200),
  school: z.string().trim().max(160).nullable().optional(),
})

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib diisi').max(256),
})

export const forgotPasswordInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid').max(254),
})

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Token wajib diisi').max(256),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200),
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  nip: z.string().trim().max(40).nullable().optional(),
  school: z.string().trim().max(160).nullable().optional(),
})

export const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['teacher', 'admin', 'superadmin']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export const adminUserUpdateSchema = z.object({
  role: z.enum(['teacher', 'admin', 'superadmin']),
})

export type LoginInput = z.infer<typeof loginInputSchema>
export type RegisterInput = z.infer<typeof registerInputSchema>
export type RefreshInput = z.infer<typeof refreshInputSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>
