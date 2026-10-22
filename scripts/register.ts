/**
 * Shared steps for turning the RAAEY residential tariff register (energycost.gr)
 * into the compact JSON the app ships: parse, merge with earlier captures, write.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { decodeHTML } from 'entities'
import type { Tariff, TariffMeta, Tier } from '../src/lib/types.ts'

export const REGISTER_URL =
  'https://energycost.gr/%ce%ba%ce%b1%cf%84%ce%b1%cf%87%cf%89%cf%81%ce%b7%ce%bc%ce%ad%ce%bd%ce%b1-%cf%84%ce%b9%ce%bc%ce%bf%ce%bb%cf%8c%ce%b3%ce%b9%ce%b1-%cf%80%cf%81%ce%bf%ce%bc%ce%ae%ce%b8%ce%b5%ce%b9%ce%b1%cf%82-%ce%b7-3/'

/** Fewer tariffs than this means we got a block page or the layout changed. */
const MIN_TARIFFS = 100

export const ymOf = (t: Tariff) => t.y * 100 + t.m

export function extract(src: string): Tariff[] {
  const t0 = src.indexOf('<table')
  const t1 = src.indexOf('</table>', t0)
  if (t0 < 0 || t1 < 0) throw new Error('No tariff table found in source HTML')
  const rows = [...src.slice(t0, t1).matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].slice(1)

  const txt = (s: string) =>
    decodeHTML(s.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ''))
      .replaceAll('\xa0', ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim()
  const num = (s: string): number | string | null => {
    const v = txt(s).replace(',', '.')
    if (v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : v
  }
  const attr = (a: string, k: string) => {
    const m = a.match(new RegExp(`${k}="([^"]*)"`))
    return m ? decodeHTML(m[1]) : ''
  }
  const CELL =
    /class="[^"]*?\b(pagio_me_proipotheseis_explain|pagio_me_proipotheseis|pagio|teliki_timi_promithias_meta_apo_ekptoseis_promithias|teliki_timi_promithias|teliki_xreosi_promithias_me_ekptosi_proipothesis_explain|diarkia_simvasis|paratiriseis)\b/

  const tariffs = new Map<string, Tariff & { tiers: Tier[] }>()
  for (const [, a, body] of rows) {
    const tds = [...body.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map((m) => [m[1], m[2]] as const)
    const c: Record<string, string> = {}
    for (const [ta, tv] of tds) {
      const m = ta.match(CELL)
      if (m) c[m[1]] = tv
    }
    const id = attr(a, 'data-invoice-id')
    const tier: Tier = [
      Number(attr(a, 'data-kwh-min') || 0),
      Number(attr(a, 'data-kwh-max') || -1),
      num(c.pagio),
      num(c.teliki_timi_promithias),
      num(c.pagio_me_proipotheseis),
      num(c.teliki_timi_promithias_meta_apo_ekptoseis_promithias),
    ]
    const key = JSON.stringify([id, txt(tds[1][1]), txt(tds[2][1])])
    const existing = tariffs.get(key)
    if (existing) {
      existing.tiers.push(tier)
      for (const [f, k] of [
        ['feeCond', 'pagio_me_proipotheseis_explain'],
        ['priceCond', 'teliki_xreosi_promithias_me_ekptosi_proipothesis_explain'],
      ] as const) {
        const v = txt(c[k])
        if (v && !existing[f]?.includes(v)) existing[f] = `${existing[f] ?? ''}\n${v}`.trim()
      }
      continue
    }
    const t: Tariff & { tiers: Tier[] } = {
      id: Number(id),
      p: txt(tds[0][1]),
      y: Number(txt(tds[1][1])),
      m: Number(txt(tds[2][1])),
      n: txt(tds[3][1]),
      t: attr(tds[3][0], 'data-filter-value'),
      c: (tds[3][0].match(/color_(\w+)/)?.[1] ?? '') as Tariff['c'],
      av: attr(a, 'data-emporika-diathesimo') === '1',
      tiers: [tier],
      feeCond: txt(c.pagio_me_proipotheseis_explain),
      priceCond: txt(c.teliki_xreosi_promithias_me_ekptosi_proipothesis_explain),
      dur: txt(c.diarkia_simvasis),
      notes: txt(c.paratiriseis),
      fee: null,
      price: null,
      feeD: null,
      priceD: null,
    }
    if (attr(a, 'data-has_time_of_use') === '1') {
      t.night = num(attr(a, 'data-time_of_use_static_teliki_timi_promithias'))
      t.nightD = num(attr(a, 'data-time_of_use_static_teliki_timi_promithias_meta_apo_ekptoseis'))
    }
    tariffs.set(key, t)
  }

  const out = [...tariffs.values()].map(({ tiers, ...t }) => {
    tiers.sort((a, b) => a[0] - b[0])
    const out: Tariff = { ...t, fee: tiers[0][2], price: tiers[0][3], feeD: tiers[0][4], priceD: tiers[0][5] }
    if (tiers.length > 1) out.tiers = tiers
    for (const k of ['feeCond', 'priceCond', 'notes', 'dur'] as const) if (!out[k]) delete out[k]
    return out
  })
  if (out.length < MIN_TARIFFS)
    throw new Error(`Only ${out.length} tariffs parsed; the source page layout may have changed`)
  return out
}

/**
 * The register drops old tariffs over time, so keep what earlier captures saw.
 * A fresh capture wins for every tariff it lists. Tariffs it no longer lists are kept for
 * past months, but dropped from its latest month (there they were withdrawn, not archived).
 */
export function merge(prev: Tariff[], next: Tariff[]) {
  const key = (t: Tariff) => `${t.id}|${t.y}|${t.m}`
  const seen = new Set(next.map(key))
  const latest = Math.max(...next.map(ymOf))
  const kept = prev.filter((t) => !seen.has(key(t)) && ymOf(t) !== latest)
  const tariffs = [...next, ...kept].sort((a, b) => ymOf(a) - ymOf(b) || a.p.localeCompare(b.p, 'el') || a.id - b.id)
  return { tariffs, kept: kept.length }
}

export function readData(dir: string): Tariff[] {
  const file = `${dir}/tariffs.json`
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Tariff[]) : []
}

/** Writes tariffs.json + meta.json; returns a short human summary. */
export function writeData(dir: string, tariffs: Tariff[], captured: string) {
  const months = [...new Set(tariffs.map(ymOf))].sort((a, b) => a - b)
  const meta: TariffMeta = {
    captured,
    count: tariffs.length,
    providers: new Set(tariffs.map((t) => t.p)).size,
    first: months[0],
    latest: months.at(-1)!,
  }
  writeFileSync(`${dir}/tariffs.json`, JSON.stringify(tariffs))
  writeFileSync(`${dir}/meta.json`, `${JSON.stringify(meta, null, 2)}\n`)

  const latest = tariffs.filter((t) => ymOf(t) === meta.latest)
  const nonNumeric = tariffs.filter((t) => typeof t.price === 'string' || typeof t.fee === 'string')
  return [
    `${meta.count} tariffs from ${meta.providers} providers, ${months.length} months (${meta.first}–${meta.latest})`,
    `latest month: ${latest.length} tariffs, ${latest.filter((t) => t.av).length} open to new customers`,
    `tiered: ${tariffs.filter((t) => t.tiers).length}, non-numeric price/fee: ${nonNumeric.length}`,
  ].join('\n')
}
