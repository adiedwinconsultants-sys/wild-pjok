import type { Env } from '../env'

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export async function cleanupExpiredExports(env: Env): Promise<number> {
  const cutoff = Date.now() - MAX_AGE_MS
  let cursor: string | undefined
  let deleted = 0

  do {
    const listed = await env.EXPORTS.list({ prefix: 'exports/', ...(cursor ? { cursor } : {}) })
    for (const object of listed.objects) {
      if (object.uploaded.getTime() < cutoff) {
        await env.EXPORTS.delete(object.key)
        deleted += 1
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  return deleted
}
