import type { Env } from '../env'

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export async function cleanupExpiredExports(env: Env): Promise<number> {
  const cutoff = Date.now() - MAX_AGE_MS
  let cursor: string | undefined
  let deleted = 0

  do {
    const listed = await env.EXPORTS.list({ prefix: 'exports/', ...(cursor ? { cursor } : {}) })
    const expiredKeys = listed.objects
      .filter((object) => object.uploaded.getTime() < cutoff)
      .map((object) => object.key)
    if (expiredKeys.length > 0) {
      await env.EXPORTS.delete(expiredKeys)
      deleted += expiredKeys.length
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  return deleted
}
