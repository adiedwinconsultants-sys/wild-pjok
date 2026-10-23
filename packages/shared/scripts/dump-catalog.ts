import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { INSTRUMENTS, validateCatalog } from '../src'

const here = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(here, '../../../apps/api/src/db/seed/instruments.json')

const errors = validateCatalog(INSTRUMENTS)
if (errors.length > 0) {
  console.error(`Katalog tidak valid:\n${errors.join('\n')}`)
  process.exit(1)
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(INSTRUMENTS, null, 2)}\n`, 'utf8')
console.log(`Katalog ditulis: ${INSTRUMENTS.length} instrumen -> ${outPath}`)
