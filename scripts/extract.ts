/**
 * Parse a saved copy of an RAAEY residential tariff register (energycost.gr)
 * into the compact JSON the app ships, merged with the data already there.
 *
 *   vp node scripts/extract.ts <source.html> [--fuel electricity|gas] [--captured YYYY-MM-DD] [--out dir] [--replace]
 *
 * Writes <out>/tariffs.json and <out>/meta.json (default out: src/data/<fuel>).
 * --replace drops earlier captures instead of merging.
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseArgs } from 'node:util'
import { extract, isFuel, merge, readData, writeData } from './register.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    fuel: { type: 'string', default: 'electricity' },
    captured: { type: 'string' },
    out: { type: 'string' },
    replace: { type: 'boolean', default: false },
  },
})
const [srcPath] = positionals
if (!srcPath || !isFuel(values.fuel)) {
  console.error(
    'usage: vp node scripts/extract.ts <source.html> [--fuel electricity|gas] [--captured YYYY-MM-DD] [--out dir] [--replace]',
  )
  process.exit(1)
}
const out = values.out ?? `src/data/${values.fuel}`
const captured =
  values.captured ?? basename(srcPath).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? new Date().toISOString().slice(0, 10)

const fresh = extract(readFileSync(srcPath, 'utf8'))
const { tariffs, kept } = values.replace ? { tariffs: fresh, kept: 0 } : merge(readData(out), fresh)
console.log(`${fresh.length} tariffs in this capture, ${kept} kept from earlier captures`)
console.log(writeData(out, tariffs, captured))
