import { z } from 'zod'

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200),
})

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
})

export const forgotPasswordInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
})

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Token wajib diisi'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200),
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  nip: z.string().trim().max(40).nullable().optional(),
  school: z.string().trim().max(160).nullable().optional(),
})

export type LoginInput = z.infer<typeof loginInputSchema>
export type RefreshInput = z.infer<typeof refreshInputSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
