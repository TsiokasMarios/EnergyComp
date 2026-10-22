import type { Amount, Tariff, TariffColor, Tier } from './types'

export const TYPE_ORDER: TariffColor[] = ['blue', 'yellow', 'green']
export const TYPE_COLOR: Record<TariffColor, string> = {
  blue: 'var(--tariff-blue)',
  yellow: 'var(--tariff-yellow)',
  green: 'var(--tariff-green)',
}

const SHORT: Record<string, string> = { 'ΦΥΣΙΚΟ ΑΕΡΙΟ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΕΝΕΡΓΕΙΑΣ': 'ΦΥΣΙΚΟ ΑΕΡΙΟ ΕΕΕ' }
export const shortProvider = (p: string) => SHORT[p] ?? p

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Year-month key, e.g. 202609 */
export const ymOf = (t: Tariff) => t.y * 100 + t.m

export const tiersOf = (t: Tariff): Tier[] => t.tiers ?? [[0, -1, t.fee, t.price, t.feeD, t.priceD]]

const pick = (row: Tier, disc: boolean, i: 2 | 3): Amount => {
  const v = disc ? row[i + 2] : row[i]
  return isNum(v) || (typeof v === 'string' && v) ? v : row[i]
}
export const feeOf = (row: Tier, disc: boolean) => pick(row, disc, 2)
export const priceOf = (row: Tier, disc: boolean) => pick(row, disc, 3)

/** "Whole" tiers: once usage passes the threshold, the higher price applies from the first kWh. */
export const isWhole = (tiers: Tier[]) => tiers.length > 1 && tiers[1][0] <= tiers[0][1]

/** Supplier charge per month at `kwh`: fixed fee plus energy, following the tariff's usage tiers. */
export function estimate(t: Tariff, kwh: number, disc: boolean): number | null {
  const tiers = tiersOf(t)
  // A near-zero price with no band above it means the register listing is incomplete
  const lastP = priceOf(tiers[tiers.length - 1], disc)
  if (isNum(lastP) && lastP < 0.01) return null
  const whole = isWhole(tiers)
  let sel = 0
  for (let i = 1; i < tiers.length; i++) {
    const threshold = whole ? tiers[i - 1][1] : tiers[i][0] - 1
    if (kwh > threshold) sel = i
  }
  const fee = feeOf(tiers[sel], disc)
  if (!isNum(fee)) return null
  if (whole) {
    const p = priceOf(tiers[sel], disc)
    return isNum(p) ? fee + kwh * p : null
  }
  let energy = 0
  for (let i = 0; i <= sel; i++) {
    const lo = i === 0 ? 0 : tiers[i][0] - 1
    const hi = tiers[i][1] === -1 ? Infinity : tiers[i][1]
    const units = Math.max(0, Math.min(kwh, hi) - lo)
    if (!units) continue
    const p = priceOf(tiers[i], disc)
    if (!isNum(p)) return null
    energy += units * p
  }
  return fee + energy
}

export function headline(t: Tariff, disc: boolean) {
  const [first] = tiersOf(t)
  return { price: priceOf(first, disc), fee: feeOf(first, disc) }
}

export interface Filters {
  ym: number | 'all'
  avail: boolean
  types: TariffColor[]
  providers: string[]
  q: string
}

/** `skip` leaves one filter out, for chip counts and the month-by-month chart. */
export function matches(t: Tariff, f: Filters, skip: 'prov' | 'type' | 'month' | '' = '') {
  if (skip !== 'month' && f.ym !== 'all' && ymOf(t) !== f.ym) return false
  if (f.avail && !t.av) return false
  if (skip !== 'type' && f.types.length && !f.types.includes(t.c)) return false
  if (skip !== 'prov' && f.providers.length && !f.providers.includes(t.p)) return false
  if (f.q && !t.n.toLocaleLowerCase('el').includes(f.q)) return false
  return true
}

// ---- Trend: best tariff of each plan type, per month

export type Metric = 'price' | 'est'
export interface Point {
  t: Tariff
  v: number
}
export type Series = Record<TariffColor, (Point | null)[]>
export interface Panel {
  /** null = whole market */
  p: string | null
  series: Series
  /** Cheapest plan type each month */
  win: (Point | null)[]
}
export interface Trend {
  months: number[]
  types: TariffColor[]
  panels: Panel[]
  overall: (Point | null)[]
  multi: boolean
}

export function buildTrend(
  data: Tariff[],
  months: number[],
  f: Filters,
  kwh: number,
  disc: boolean,
  metric: Metric,
): Trend {
  const idx = new Map(months.map((ym, i) => [ym, i]))
  const blank = (): Series => ({
    blue: months.map(() => null),
    yellow: months.map(() => null),
    green: months.map(() => null),
  })
  const byProv = new Map<string, Series>()
  const market = blank()
  for (const t of data) {
    if (!(t.c in market) || !matches(t, f, 'month')) continue
    // All-in cost at the user's usage, so bundles and free-kWh allowances compare fairly
    const est = estimate(t, kwh, disc)
    const v = est == null ? null : metric === 'est' ? est : kwh > 0 ? est / kwh : null
    if (v == null) continue
    const i = idx.get(ymOf(t))
    if (i == null) continue
    let own = byProv.get(t.p)
    if (!own) byProv.set(t.p, (own = blank()))
    const cur = own[t.c][i]
    if (!cur || v < cur.v) own[t.c][i] = { t, v }
    const best = market[t.c][i]
    if (!best || v < best.v) market[t.c][i] = { t, v }
  }
  const types = TYPE_ORDER.filter((c) => !f.types.length || f.types.includes(c))
  const cheapest = (list: (Point | null)[]) =>
    list.reduce<Point | null>((a, b) => (b && (!a || b.v < a.v) ? b : a), null)
  const panels: Panel[] = (
    f.providers.length
      ? f.providers.map((p) => ({ p, series: byProv.get(p) ?? blank() }))
      : [{ p: null, series: market }]
  ).map((pa) => ({ ...pa, win: months.map((_, i) => cheapest(types.map((c) => pa.series[c][i]))) }))
  const overall = months.map((_, i) => cheapest(panels.map((pa) => pa.win[i])))
  return { months, types, panels, overall, multi: panels.length > 1 }
}

export function niceTicks(lo: number, hi: number, n: number) {
  const span = hi - lo || Math.abs(hi) * 0.1 || 1
  const raw = span / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const ticks: number[] = []
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step)
    ticks.push(+v.toFixed(10))
  return { ticks, step }
}
