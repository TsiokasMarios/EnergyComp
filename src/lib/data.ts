import electricityMeta from '@/data/electricity/meta.json'
import electricityUrl from '@/data/electricity/tariffs.json?url'
import gasMeta from '@/data/gas/meta.json'
import gasUrl from '@/data/gas/tariffs.json?url'
import { TYPE_ORDER, ymOf } from './tariffs'
import type { Metric } from './tariffs'
import type { Fuel, Tariff, TariffColor, TariffMeta } from './types'

export interface FuelConfig {
  /** Content-hashed URL of the tariff JSON, so it can be cached forever. */
  url: string
  meta: TariffMeta
  /** Default monthly usage, kWh */
  kwh: number
}

export const FUELS: Record<Fuel, FuelConfig> = {
  electricity: { url: electricityUrl, meta: electricityMeta, kwh: 300 },
  // Roughly a gas-heated home's yearly use spread over 12 months
  gas: { url: gasUrl, meta: gasMeta, kwh: 500 },
}

export interface Dataset {
  fuel: Fuel
  tariffs: Tariff[]
  providers: string[]
  /** YYYYMM, oldest first */
  months: number[]
  /** Plan types present in the data, in display order */
  types: TariffColor[]
}

const pending: Partial<Record<Fuel, Promise<Dataset>>> = {}

export function loadDataset(fuel: Fuel): Promise<Dataset> {
  pending[fuel] ??= fetch(FUELS[fuel].url)
    .then((r) => {
      if (!r.ok) throw new Error(`Tariff data request failed: ${r.status}`)
      return r.json() as Promise<Tariff[]>
    })
    .then((tariffs) => ({
      fuel,
      tariffs,
      providers: [...new Set(tariffs.map((t) => t.p))].sort((a, b) => a.localeCompare(b, 'el')),
      months: [...new Set(tariffs.map(ymOf))].sort((a, b) => a - b),
      types: TYPE_ORDER.filter((c) => tariffs.some((t) => t.c === c)),
    }))
    .catch((e: unknown) => {
      delete pending[fuel]
      throw e
    })
  return pending[fuel]
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

const SEARCH_DEFAULTS: Omit<ExplorerSearch, 'month' | 'kwh'> = {
  open: true,
  disc: true,
  prov: [],
  type: [],
  q: '',
  sort: 'est',
  desc: false,
  by: 'price',
}

export const searchDefaults = (fuel: Fuel): Omit<ExplorerSearch, 'month'> => ({
  ...SEARCH_DEFAULTS,
  kwh: FUELS[fuel].kwh,
})

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function parseSearch(s: Record<string, unknown>, fuel: Fuel): ExplorerSearch {
  const d = searchDefaults(fuel)
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
