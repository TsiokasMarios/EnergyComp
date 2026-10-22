import tariffsUrl from '@/data/tariffs.json?url'
import { TYPE_ORDER, ymOf } from './tariffs'
import type { Metric } from './tariffs'
import type { Tariff, TariffColor } from './types'

export { default as meta } from '@/data/meta.json'
/** Content-hashed URL of the tariff JSON, so it can be cached forever. */
export { tariffsUrl }

export interface Dataset {
  tariffs: Tariff[]
  providers: string[]
  /** YYYYMM, oldest first */
  months: number[]
}

let pending: Promise<Dataset> | null = null

export function loadDataset(): Promise<Dataset> {
  pending ??= fetch(tariffsUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`Tariff data request failed: ${r.status}`)
      return r.json() as Promise<Tariff[]>
    })
    .then((tariffs) => ({
      tariffs,
      providers: [...new Set(tariffs.map((t) => t.p))].sort((a, b) => a.localeCompare(b, 'el')),
      months: [...new Set(tariffs.map(ymOf))].sort((a, b) => a - b),
    }))
    .catch((e: unknown) => {
      pending = null
      throw e
    })
  return pending
}

// ---- URL search params

export type SortKey = 'p' | 'n' | 'ym' | 'price' | 'fee' | 'est'
const SORT_KEYS: SortKey[] = ['p', 'n', 'ym', 'price', 'fee', 'est']

export interface ExplorerSearch {
  /** YYYYMM, 'all', or undefined for the latest month */
  month?: number | 'all'
  kwh: number
  /** Only tariffs open to new customers */
  open: boolean
  disc: boolean
  prov: string[]
  type: TariffColor[]
  q: string
  sort: SortKey
  desc: boolean
  by: Metric
}

export const SEARCH_DEFAULTS: Omit<ExplorerSearch, 'month'> = {
  kwh: 300,
  open: true,
  disc: true,
  prov: [],
  type: [],
  q: '',
  sort: 'est',
  desc: false,
  by: 'price',
}

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function parseSearch(s: Record<string, unknown>): ExplorerSearch {
  const d = SEARCH_DEFAULTS
  const kwh = Number(s.kwh)
  return {
    month: s.month === 'all' ? 'all' : Number.isInteger(s.month) ? (s.month as number) : undefined,
    kwh: Number.isFinite(kwh) && kwh >= 0 ? Math.min(kwh, 100_000) : d.kwh,
    open: bool(s.open, d.open),
    disc: bool(s.disc, d.disc),
    prov: strings(s.prov),
    type: strings(s.type).filter((c): c is TariffColor => (TYPE_ORDER as string[]).includes(c)),
    q: typeof s.q === 'string' ? s.q : d.q,
    sort: SORT_KEYS.includes(s.sort as SortKey) ? (s.sort as SortKey) : d.sort,
    desc: bool(s.desc, d.desc),
    by: s.by === 'est' ? 'est' : 'price',
  }
}
