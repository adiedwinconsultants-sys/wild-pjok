import { z } from 'zod'

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z
    .string()
    .trim()
    .url('EXPO_PUBLIC_API_URL harus berupa URL valid')
    .default('http://localhost:8787/v1'),
})

const parsed = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
})

export const env = {
  apiUrl: parsed.EXPO_PUBLIC_API_URL.replace(/\/+$/, ''),
} as const
