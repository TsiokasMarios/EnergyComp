import { createContext, use } from 'react'
import { isNum } from '@/lib/tariffs'
import { el } from './el'
import { en } from './en'
import type { Dict } from './en'

export const LOCALES = ['en', 'el'] as const
export type Locale = (typeof LOCALES)[number]

/** URL path param for each locale; English lives at the root. */
export const localeParam = (l: Locale) => (l === 'en' ? undefined : l)
export const localeFromParam = (p: string | undefined): Locale | null =>
  p === undefined ? 'en' : p === 'el' ? 'el' : null

const DICTS: Record<Locale, Dict> = { en, el }
const INTL: Record<Locale, string> = { en: 'en-GB', el: 'el-GR' }
const KWH_DECIMALS = 5

function makeI18n(locale: Locale) {
  const tag = INTL[locale]
  const money = (min: number, max: number) =>
    new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    })
  const eur2 = money(2, 2)
  const eur4 = money(4, 4)
  const kwhFmt = money(3, KWH_DECIMALS)
  const kwhNum = new Intl.NumberFormat(tag, { minimumFractionDigits: 3, maximumFractionDigits: KWH_DECIMALS })
  const num2 = new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const tickFmts = new Map<number, Intl.NumberFormat>()
  const monthYear = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' })
  const monthShort = new Intl.DateTimeFormat(tag, { month: 'short' })
  const dateLong = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' })
  const int = new Intl.NumberFormat(tag)
  const ymDate = (ym: number) => new Date(Math.floor(ym / 100), (ym % 100) - 1, 1)

  return {
    locale,
    t: DICTS[locale],
    /** Monthly amounts, e.g. €12.34 / 12,34 € */
    eur: (v: unknown) => (isNum(v) ? eur2.format(v) : ''),
    /** Per-kWh prices with 3–5 decimals */
    kwhPrice: (v: unknown) => (isNum(v) ? kwhFmt.format(v) : ''),
    /**
     * Table figures without the € sign (the column heading carries the unit). A per-kWh price
     * also reports how many digits short of the maximum it is, so a column can pad it and line
     * up the decimal separators.
     */
    kwhFigure: (v: number) => {
      const parts = kwhNum.formatToParts(v)
      const frac = parts.find((p) => p.type === 'fraction')?.value.length ?? 0
      return { text: parts.map((p) => p.value).join(''), pad: KWH_DECIMALS - frac }
    },
    eurFigure: (v: number) => num2.format(v),
    /** Chart values: 4 decimals per kWh, 2 per month */
    metricValue: (v: number, metric: 'price' | 'est') => (metric === 'price' ? eur4 : eur2).format(v),
    tick: (v: number, decimals: number) => {
      let f = tickFmts.get(decimals)
      if (!f) tickFmts.set(decimals, (f = money(decimals, decimals)))
      return f.format(v)
    },
    int: (n: number) => int.format(n),
    ymLabel: (ym: number) => {
      const s = monthYear.format(ymDate(ym))
      return s.charAt(0).toLocaleUpperCase(tag) + s.slice(1)
    },
    monthShort: (ym: number) => monthShort.format(ymDate(ym)),
    date: (iso: string) => dateLong.format(new Date(`${iso}T12:00:00`)),
    duration: (d: string | undefined) =>
      !d ? '' : /^\d+$/.test(d) ? DICTS[locale].durMonths(d) : /αορίστου/i.test(d) ? DICTS[locale].openEnded : d,
  }
}

export type I18n = ReturnType<typeof makeI18n>
const cache = new Map<Locale, I18n>()
export const getI18n = (l: Locale) => {
  let i = cache.get(l)
  if (!i) cache.set(l, (i = makeI18n(l)))
  return i
}

const I18nContext = createContext<I18n>(getI18n('en'))
export const I18nProvider = ({ locale, children }: { locale: Locale; children: React.ReactNode }) => (
  <I18nContext value={getI18n(locale)}>{children}</I18nContext>
)
export const useI18n = () => use(I18nContext)
