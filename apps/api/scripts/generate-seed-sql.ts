import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Instrument } from '@pjok/shared'

const here = dirname(fileURLToPath(import.meta.url))
const catalogPath = resolve(here, '../src/db/seed/instruments.json')
const outPath = resolve(here, '../src/db/seed/catalog.sql')

const instruments = JSON.parse(readFileSync(catalogPath, 'utf8')) as Instrument[]
const createdAt = '2025-01-01T00:00:00.000Z'

const lines: string[] = ['-- Seed katalog instrumen (idempoten).', 'DELETE FROM instruments;']
for (const instrument of instruments) {
  const payload = quote(JSON.stringify(instrument))
  lines.push(
    `INSERT INTO instruments (id, slug, version, "group", name, payload_json, created_at) VALUES (${quote(
      instrument.id,
    )}, ${quote(instrument.slug)}, ${instrument.version}, ${quote(instrument.group)}, ${quote(
      instrument.name,
    )}, ${payload}, ${quote(createdAt)}) ON CONFLICT(slug, version) DO UPDATE SET name = excluded.name, "group" = excluded."group", payload_json = excluded.payload_json;`,
  )
}
lines.push('')

writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log(`Seed SQL ditulis: ${instruments.length} instrumen -> ${outPath}`)

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}
