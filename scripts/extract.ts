/**
 * Parse a saved copy of the RAAEY residential tariff register (energycost.gr)
 * into the compact JSON the app ships, merged with the data already there.
 *
 *   vp node scripts/extract.ts <source.html> [--captured YYYY-MM-DD] [--out src/data] [--replace]
 *
 * Writes <out>/tariffs.json and <out>/meta.json. --replace drops earlier captures instead of merging.
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseArgs } from 'node:util'
import { extract, merge, readData, writeData } from './register.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    captured: { type: 'string' },
    out: { type: 'string', default: 'src/data' },
    replace: { type: 'boolean', default: false },
  },
})
const [srcPath] = positionals
if (!srcPath) {
  console.error('usage: vp node scripts/extract.ts <source.html> [--captured YYYY-MM-DD] [--out dir] [--replace]')
  process.exit(1)
}
const captured =
  values.captured ?? basename(srcPath).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? new Date().toISOString().slice(0, 10)

const fresh = extract(readFileSync(srcPath, 'utf8'))
const { tariffs, kept } = values.replace ? { tariffs: fresh, kept: 0 } : merge(readData(values.out), fresh)
console.log(`${fresh.length} tariffs in this capture, ${kept} kept from earlier captures`)
console.log(writeData(values.out, tariffs, captured))
