import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

const forbidden = [
  { pattern: /Date\.now\s*\(/, label: 'Date.now()' },
  { pattern: /\bfetch\s*\(/, label: 'fetch()' },
  { pattern: /process\.env/, label: 'process.env' },
  { pattern: /import\.meta\.env/, label: 'import.meta.env' },
  { pattern: /\bMath\.random\s*\(/, label: 'Math.random()' },
]

describe('kemurnian engine skoring', () => {
  it('tidak memakai I/O, waktu, atau sumber non-deterministik', () => {
    const files = readdirSync(here).filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
    )
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const content = readFileSync(join(here, file), 'utf8')
      for (const rule of forbidden) {
        expect(rule.pattern.test(content), `${file} memakai ${rule.label}`).toBe(false)
      }
    }
  })
})
