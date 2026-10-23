/** Which register a tariff comes from; each has its own page and data files. */
export type Fuel = 'electricity' | 'gas'

/** Register colour code: blue = fixed, yellow = variable, green = special ("green") tariff (electricity only). */
export type TariffColor = 'blue' | 'yellow' | 'green'

/** A price or fee as published: a number, free text when the register has a note instead, or missing. */
export type Amount = number | string | null

/** [minKwh, maxKwh (-1 = no limit), fee, price, feeDiscounted, priceDiscounted] */
export type Tier = [number, number, Amount, Amount, Amount, Amount]

/** One tariff listing for one month, as written by scripts/extract.ts. Short keys keep the JSON small. */
export interface Tariff {
  /** Register invoice id */
  id: number
  /** Provider */
  p: string
  /** Year and month of the listing */
  y: number
  m: number
  /** Tariff name */
  n: string
  /** Register type label (Greek) */
  t: string
  c: TariffColor
  /** Open to new customers */
  av: boolean
  fee: Amount
  price: Amount
  feeD: Amount
  priceD: Amount
  /** Present only when the price depends on monthly usage */
  tiers?: Tier[]
  /** Time-of-use (night) price */
  night?: Amount
  nightD?: Amount
  feeCond?: string
  priceCond?: string
  /** Contract duration: months as digits, or free text */
  dur?: string
  notes?: string
}

export interface TariffMeta {
  /** ISO date the source page was captured */
  captured: string
  count: number
  providers: number
  /** YYYYMM */
  first: number
  latest: number
}
