/**
 * Fetch the live registers with headless Chromium (plain HTTP gets an Incapsula challenge),
 * save a snapshot of each, and merge them into the app data.
 *
 *   vp node scripts/update.ts [--fuel electricity|gas] [--data src/data] [--snapshots scripts/snapshots] [--keep 8]
 *   vp node scripts/update.ts --fuel gas --html <saved.html>     # skip the fetch, e.g. for testing
 *
 * Without --fuel, updates every register. Data goes to <data>/<fuel>, snapshots to <snapshots>/<fuel>.
 * BROWSER_CHANNEL picks the Playwright channel (default "chromium", new headless mode;
 * "chrome" uses an installed Google Chrome). A register that can't be fetched or parsed
 * leaves its data untouched. Exit code: 0 all updated, 1 none updated, 2 some updated.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'
import type { Fuel } from '../src/lib/types.ts'
import { FUELS, REGISTER_URL, extract, isFuel, merge, readData, writeData } from './register.ts'

const { values } = parseArgs({
  options: {
    fuel: { type: 'string' },
    html: { type: 'string' },
    data: { type: 'string', default: 'src/data' },
    snapshots: { type: 'string', default: 'scripts/snapshots' },
    keep: { type: 'string', default: '8' },
  },
})
if ((values.fuel && !isFuel(values.fuel)) || (values.html && !values.fuel)) {
  console.error('usage: vp node scripts/update.ts [--fuel electricity|gas] [--html saved.html] [--data dir]')
  process.exit(1)
}

const ATTEMPTS = 3
const firstLine = (e: unknown) => (e instanceof Error ? e.message.split('\n')[0] : String(e))

async function fetchRegister(url: string): Promise<string> {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chromium' })
  try {
    const page = await (await browser.newContext({ locale: 'el-GR' })).newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    // The challenge reloads into the real page once solved
    await page.waitForFunction(() => document.querySelectorAll('table tr').length > 100, null, { timeout: 120_000 })
    // The site's scripts rewrite the table after load (hiding rows, collapsing tiers),
    // so re-request the raw server HTML from inside the page, with the cookies that passed
    return await page.evaluate(() => fetch(location.href, { credentials: 'include' }).then((r) => r.text()))
  } finally {
    await browser.close()
  }
}

async function fetchWithRetry(fuel: Fuel) {
  for (let i = 1; ; i++) {
    try {
      const t0 = Date.now()
      const html = await fetchRegister(REGISTER_URL[fuel])
      console.log(`${fuel}: fetched ${(html.length / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s`)
      return html
    } catch (e) {
      console.error(`${fuel}: attempt ${i}/${ATTEMPTS} failed: ${firstLine(e)}`)
      if (i === ATTEMPTS) throw e
      await new Promise((r) => setTimeout(r, 60_000 * i))
    }
  }
}

async function update(fuel: Fuel, captured: string) {
  const html = values.html ? readFileSync(values.html, 'utf8') : await fetchWithRetry(fuel)
  // Parse before touching anything, so a block page never reaches the snapshots or the data
  const fresh = extract(html)

  if (!values.html) {
    const dir = join(values.snapshots, fuel)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `source-snapshot-${captured}.html`), html)
    const old = readdirSync(dir)
      .filter((f) => /^source-snapshot-\d{4}-\d{2}-\d{2}\.html$/.test(f))
      .sort()
      .slice(0, -Number(values.keep))
    for (const f of old) rmSync(join(dir, f))
  }

  const out = join(values.data, fuel)
  const { tariffs, kept } = merge(readData(out), fresh)
  console.log(`${fuel}: ${fresh.length} tariffs in this capture, ${kept} kept from earlier captures`)
  console.log(writeData(out, tariffs, captured))
}

const captured = new Date().toISOString().slice(0, 10)
let failed = 0
const fuels = values.fuel ? [values.fuel as Fuel] : FUELS
for (const fuel of fuels) {
  try {
    await update(fuel, captured)
  } catch (e) {
    failed++
    console.error(`${fuel}: not updated: ${firstLine(e)}`)
  }
}
process.exitCode = failed === 0 ? 0 : failed === fuels.length ? 1 : 2
