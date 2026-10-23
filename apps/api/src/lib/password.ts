import { base64UrlToBytes, bytesToBase64Url, constantTimeEqual } from './base64'

const ALGORITHM = 'pbkdf2_sha256'
const ITERATIONS = 210_000
const SALT_BYTES = 16
const KEY_BITS = 256

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES)
  crypto.getRandomValues(salt)
  const hash = await derive(password, salt, ITERATIONS)
  return `${ALGORITHM}$${ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4) return false
  const [algorithm, iterationsRaw, saltRaw, hashRaw] = parts
  if (algorithm !== ALGORITHM || !iterationsRaw || !saltRaw || !hashRaw) return false
  const iterations = Number(iterationsRaw)
  if (!Number.isInteger(iterations) || iterations < 10_000) return false

  try {
    const salt = base64UrlToBytes(saltRaw)
    const expected = base64UrlToBytes(hashRaw)
    const actual = await derive(password, salt, iterations)
    return constantTimeEqual(actual, expected)
  } catch {
    return false
  }
}
