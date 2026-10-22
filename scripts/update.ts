/**
 * Fetch the live register with headless Chromium (plain HTTP gets an Incapsula challenge),
 * save a snapshot, and merge it into the app data.
 *
 *   vp node scripts/update.ts [--out src/data] [--snapshots scripts/snapshots] [--keep 8]
 *   vp node scripts/update.ts --html <saved.html>     # skip the fetch, e.g. for testing
 *
 * BROWSER_CHANNEL picks the Playwright channel (default "chromium", new headless mode;
 * "chrome" uses an installed Google Chrome). Exits non-zero, leaving the data untouched,
 * if the page can't be fetched or parsed.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'
import { REGISTER_URL, extract, merge, readData, writeData } from './register.ts'

const { values } = parseArgs({
  options: {
    html: { type: 'string' },
    out: { type: 'string', default: 'src/data' },
    snapshots: { type: 'string', default: 'scripts/snapshots' },
    keep: { type: 'string', default: '8' },
  },
})

const ATTEMPTS = 3

async function fetchRegister(): Promise<string> {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chromium' })
  try {
    const page = await (await browser.newContext({ locale: 'el-GR' })).newPage()
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    // The challenge reloads into the real page once solved
    await page.waitForFunction(() => document.querySelectorAll('table tr').length > 100, null, { timeout: 120_000 })
    // The site's scripts rewrite the table after load (hiding rows, collapsing tiers),
    // so re-request the raw server HTML from inside the page, with the cookies that passed
    return await page.evaluate(() => fetch(location.href, { credentials: 'include' }).then((r) => r.text()))
  } finally {
    await browser.close()
  }
}

async function fetchWithRetry() {
  for (let i = 1; ; i++) {
    try {
      const t0 = Date.now()
      const html = await fetchRegister()
      console.log(`fetched ${(html.length / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s`)
      return html
    } catch (e) {
      console.error(`attempt ${i}/${ATTEMPTS} failed: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`)
      if (i === ATTEMPTS) throw e
      await new Promise((r) => setTimeout(r, 60_000 * i))
    }
  }
}

const captured = new Date().toISOString().slice(0, 10)
const html = values.html ? readFileSync(values.html, 'utf8') : await fetchWithRetry()
// Parse before touching anything, so a block page never reaches the snapshots or the data
const fresh = extract(html)

if (!values.html) {
  mkdirSync(values.snapshots, { recursive: true })
  writeFileSync(join(values.snapshots, `source-snapshot-${captured}.html`), html)
  const old = readdirSync(values.snapshots)
    .filter((f) => /^source-snapshot-\d{4}-\d{2}-\d{2}\.html$/.test(f))
    .sort()
    .slice(0, -Number(values.keep))
  for (const f of old) rmSync(join(values.snapshots, f))
}

const { tariffs, kept } = merge(readData(values.out), fresh)
console.log(`${fresh.length} tariffs in this capture, ${kept} kept from earlier captures`)
console.log(writeData(values.out, tariffs, captured))
