import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDraft } from '@/hooks/use-draft'
import { useI18n } from '@/i18n'
import type { I18n } from '@/i18n'
import type { ExplorerSearch, SortKey } from '@/lib/data'
import { TYPE_COLOR, estimate, headline, isNum, isWhole, priceOf, shortProvider, tiersOf, ymOf } from '@/lib/tariffs'
import type { Amount, Fuel, Tariff } from '@/lib/types'
import { cn, sectionTitle } from '@/lib/utils'

const PAGE = 300

export interface Row {
  t: Tariff
  price: number | null
  /** Price as published, possibly a note instead of a number */
  priceRaw: unknown
  fee: number | null
  est: number | null
}

export function buildRows(tariffs: Tariff[], kwh: number, disc: boolean, sort: SortKey, desc: boolean): Row[] {
  const rows = tariffs.map((t): Row => {
    const h = headline(t, disc)
    return {
      t,
      price: isNum(h.price) ? h.price : null,
      priceRaw: h.price,
      fee: isNum(h.fee) ? h.fee : null,
      est: estimate(t, kwh, disc),
    }
  })
  const dir = desc ? -1 : 1
  const val = (r: Row) =>
    sort === 'p' ? shortProvider(r.t.p) : sort === 'n' ? r.t.n : sort === 'ym' ? ymOf(r.t) : r[sort]
  return rows.sort((a, b) => {
    const va = val(a)
    const vb = val(b)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    const c = typeof va === 'string' ? va.localeCompare(vb as string, 'el') : va - (vb as number)
    return c * dir || (a.est ?? 1e9) - (b.est ?? 1e9)
  })
}

interface ResultsProps {
  rows: Row[]
  fuel: Fuel
  search: ExplorerSearch
  kwh: number
  allMonths: boolean
  monthLabel: string
  firstMonthLabel: string
  update: (patch: Partial<ExplorerSearch>) => void
  onReset: () => void
  ref?: React.Ref<HTMLDivElement>
}

export function Results({
  rows,
  fuel,
  search,
  kwh,
  allMonths,
  monthLabel,
  firstMonthLabel,
  update,
  onReset,
  ref,
}: ResultsProps) {
  const i18n = useI18n()
  const { t, eur, int } = i18n
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [limit, setLimit] = useState(PAGE)
  const [qText, setQText] = useDraft(
    search.q,
    (v) => v,
    (s, v) => s === v,
  )

  const providerCount = new Set(rows.map((r) => r.t.p)).size
  let cheapest: Row | null = null
  let maxEst = 1
  for (const r of rows) {
    if (r.est == null) continue
    if (!cheapest || r.est < cheapest.est!) cheapest = r
    if (r.est > maxEst) maxEst = r.est
  }
  const shown = rows.slice(0, limit)
  const cols = allMonths ? 9 : 8

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const sortBy = (k: SortKey) => update(search.sort === k ? { desc: !search.desc } : { sort: k, desc: false })

  return (
    <>
      <div
        ref={ref}
        className="mt-14 flex scroll-mt-4 flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b-2 border-foreground pb-4"
      >
        <div aria-live="polite">
          <h2 className={sectionTitle}>{t.count(int(rows.length), rows.length, providerCount)}</h2>
          <p className="mt-1.5 max-w-[75ch] text-[13px] text-muted-foreground">
            {allMonths ? t.allMonthsSince(firstMonthLabel) : monthLabel}
            {cheapest &&
              !allMonths &&
              `. ${t.lowest(shortProvider(cheapest.t.p), cheapest.t.n, eur(cheapest.est), kwh)}`}
          </p>
        </div>
        <div className="grid w-[min(320px,100%)] gap-1.5">
          <Label htmlFor="q" className="text-[13px] leading-5 font-semibold text-muted-foreground">
            {t.search}
          </Label>
          <Input
            id="q"
            type="search"
            placeholder={t.fuels[fuel].searchPlaceholder}
            className="h-10 bg-card text-[15px] shadow-none"
            value={qText}
            onChange={(e) => {
              setQText(e.target.value)
              update({ q: e.target.value })
            }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>{t.noMatches}</p>
          <Button variant="outline" className="mt-2.5 bg-card" onClick={onReset}>
            {t.reset}
          </Button>
        </div>
      ) : (
        <table className="mb-4 w-full border-collapse">
          <thead className="max-lg:hidden">
            <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-[1] [&>th]:border-b [&>th]:bg-background [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:align-bottom [&>th]:text-[13px] [&>th]:leading-[1.3] [&>th]:font-semibold [&>th]:text-muted-foreground">
              <SortTh k="p" search={search} onSort={sortBy} className="pl-[18px]!">
                {t.colProvider}
              </SortTh>
              <SortTh k="n" search={search} onSort={sortBy} className="w-full">
                {t.colTariff}
              </SortTh>
              {allMonths && (
                <SortTh k="ym" search={search} onSort={sortBy}>
                  {t.month}
                </SortTh>
              )}
              <th>{t.colType}</th>
              <SortTh k="price" search={search} onSort={sortBy} num>
                {t.colPrice}
              </SortTh>
              <SortTh k="fee" search={search} onSort={sortBy} num>
                {t.colFee}
              </SortTh>
              <SortTh k="est" search={search} onSort={sortBy} num>
                {t.colEst(kwh)}
              </SortTh>
              <th>{t.colContract}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const id = `${r.t.id}-${ymOf(r.t)}`
              return (
                <TariffRow
                  key={id}
                  row={r}
                  i18n={i18n}
                  kwh={kwh}
                  disc={search.disc}
                  allMonths={allMonths}
                  maxEst={maxEst}
                  cols={cols}
                  open={open.has(id)}
                  onToggle={() => toggleOpen(id)}
                />
              )
            })}
          </tbody>
        </table>
      )}
      {rows.length > limit && (
        <div className="mb-10 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>{t.showing(int(limit), int(rows.length))}</span>
          <Button variant="outline" className="bg-card" onClick={() => setLimit((l) => l + PAGE)}>
            {t.showMore(Math.min(PAGE, rows.length - limit))}
          </Button>
        </div>
      )}
    </>
  )
}

function SortTh({
  k,
  search,
  onSort,
  num,
  className,
  children,
}: {
  k: SortKey
  search: ExplorerSearch
  onSort: (k: SortKey) => void
  num?: boolean
  className?: string
  children: React.ReactNode
}) {
  const active = search.sort === k
  const Arrow = search.desc ? ArrowDown : ArrowUp
  return (
    <th
      className={cn(num && 'text-right!', className)}
      aria-sort={active ? (search.desc ? 'descending' : 'ascending') : undefined}
    >
      {/* The arrow hangs outside the label so headings stay flush with their column's values */}
      <button
        type="button"
        className={cn(
          'relative cursor-pointer text-left hover:text-foreground',
          num && 'text-right',
          active && 'text-foreground',
        )}
        onClick={() => onSort(k)}
      >
        {children}
        {active && <Arrow className="absolute bottom-0.5 left-full ml-0.5 size-3.5" aria-hidden />}
      </button>
    </th>
  )
}

const cell =
  'border-b px-3 py-4 align-baseline max-lg:border-0 max-lg:p-0 max-lg:data-[l]:before:block max-lg:data-[l]:before:text-xs max-lg:data-[l]:before:text-muted-foreground max-lg:data-[l]:before:content-[attr(data-l)]'
const num = 'text-right max-lg:text-left'
const big = 'text-[17px] font-semibold whitespace-nowrap'
const sub = 'mt-0.5 block text-xs text-muted-foreground lg:ml-auto lg:max-w-[9rem] xl:max-w-[13rem]'
const na = 'text-[13px] font-medium text-muted-foreground xl:whitespace-nowrap'

function TariffRow({
  row: r,
  i18n,
  kwh,
  disc,
  allMonths,
  maxEst,
  cols,
  open,
  onToggle,
}: {
  row: Row
  i18n: I18n
  kwh: number
  disc: boolean
  allMonths: boolean
  maxEst: number
  cols: number
  open: boolean
  onToggle: () => void
}) {
  const { t, kwhPrice, ymLabel, duration, eurFigure } = i18n
  const tariff = r.t
  const band = { '--band': TYPE_COLOR[tariff.c] } as React.CSSProperties
  const tiers = tierText(tariff, disc, i18n)
  const nightP = disc && isNum(tariff.nightD) ? tariff.nightD : tariff.night
  const night = isNum(nightP) && nightP !== r.price ? t.night(kwhPrice(nightP)) : ''

  return (
    <>
      <tr
        style={band}
        className={cn(
          'bg-card max-lg:grid max-lg:grid-cols-[1fr_auto] max-lg:gap-x-3 max-lg:gap-y-1 max-lg:border-b max-lg:py-3 max-lg:pr-3.5 max-lg:pl-5 max-lg:shadow-[inset_6px_0_0_var(--band)]',
          !tariff.av && '[&>td]:text-muted-foreground',
        )}
      >
        <td
          className={cn(
            cell,
            'font-semibold xl:whitespace-nowrap lg:pl-[18px] lg:shadow-[inset_6px_0_0_var(--band)] max-lg:col-start-1',
          )}
        >
          {shortProvider(tariff.p)}
        </td>
        <td className={cn(cell, 'max-lg:col-span-full')}>
          <span className="font-medium text-pretty">{tariff.n}</span>
          {!tariff.av && <span className="mt-1 block text-xs text-muted-foreground">{t.notOpen}</span>}
        </td>
        {allMonths && (
          <td className={cn(cell, 'whitespace-nowrap max-lg:col-span-full')} data-l={t.month}>
            {ymLabel(ymOf(tariff))}
          </td>
        )}
        <td className={cn(cell, 'lg:min-w-[8.5rem] max-lg:col-start-2 max-lg:row-start-1 max-lg:text-right')}>
          {/* The dot stays with the label when a long type name wraps */}
          <span className="inline-flex items-baseline gap-1.5 text-left">
            <span
              className="size-2.5 flex-none rounded-full"
              style={{ background: TYPE_COLOR[tariff.c] }}
              aria-hidden
            />
            {t.typeLabel[tariff.c]}
          </span>
        </td>
        <td className={cn(cell, num, 'lg:min-w-[9rem] xl:min-w-[9.5rem]')} data-l={t.colPrice}>
          {r.price != null ? (
            <span className={big}>
              <AlignedPrice v={r.price} i18n={i18n} />
            </span>
          ) : (
            <span className={na}>{r.priceRaw ? t.notPublished : '—'}</span>
          )}
          {tiers && <span className={sub}>{tiers}</span>}
          {night && <span className={sub}>{night}</span>}
        </td>
        <td className={cn(cell, num)} data-l={t.colFee}>
          <span className={big}>{r.fee != null ? eurFigure(r.fee) : '—'}</span>
        </td>
        <td className={cn(cell, num, 'min-w-[8.5rem] xl:min-w-[150px]')} data-l={t.colEst(kwh)}>
          {r.est != null ? (
            <>
              <span className={cn(big, 'block')}>{eurFigure(r.est)}</span>
              <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-muted">
                <i
                  className="block h-full rounded-sm bg-primary motion-safe:transition-[width] motion-safe:duration-250 motion-safe:ease-out"
                  style={{ width: `${((r.est / maxEst) * 100).toFixed(1)}%` }}
                />
              </div>
            </>
          ) : (
            <span className={na}>{t.cantEstimate}</span>
          )}
        </td>
        <td className={cn(cell, 'whitespace-nowrap')} data-l={t.colContract}>
          {duration(tariff.dur)}
        </td>
        <td className={cn(cell, 'text-right max-lg:col-span-full max-lg:pt-2 max-lg:text-left')}>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-1 bg-card pr-2 font-medium shadow-none', open && 'border-foreground')}
            aria-expanded={open}
            onClick={onToggle}
          >
            {/* Both labels share one cell so the button keeps its width when it toggles */}
            <span className="grid text-left *:col-start-1 *:row-start-1">
              <span className={cn(open && 'invisible')}>{t.details}</span>
              <span className={cn(!open && 'invisible')}>{t.hide}</span>
            </span>
            <ChevronDown className={cn('size-4 motion-safe:transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
        </td>
      </tr>
      {open && (
        <tr style={band} className="max-lg:block">
          <td
            colSpan={cols}
            className="border-b bg-[#f9fafb] px-[18px] pt-2 pb-6 shadow-[inset_6px_0_0_var(--band)] max-lg:block max-lg:pl-5"
          >
            <TariffDetails tariff={tariff} i18n={i18n} />
          </td>
        </tr>
      )}
    </>
  )
}

/** A per-kWh price, padded with hidden digits so a right-aligned column lines up on the decimal point */
function AlignedPrice({ v, i18n }: { v: number; i18n: I18n }) {
  const { text, pad } = i18n.kwhFigure(v)
  return (
    <>
      {text}
      {pad > 0 && (
        <span className="invisible select-none" aria-hidden>
          {'0'.repeat(pad)}
        </span>
      )}
    </>
  )
}

function tierText(tariff: Tariff, disc: boolean, { t, kwhPrice }: I18n) {
  const tiers = tiersOf(tariff)
  if (tiers.length < 2) return ''
  const p = (row: (typeof tiers)[number]) => kwhPrice(priceOf(row, disc)) || t.na
  if (isWhole(tiers)) return t.tierWhole(tiers[0][1], p(tiers[1]))
  return tiers
    .slice(1)
    .map((row) => t.tierFrom(row[0], p(row)))
    .join(', ')
}

function TariffDetails({ tariff, i18n }: { tariff: Tariff; i18n: I18n }) {
  const { t, eur, kwhPrice, ymLabel } = i18n
  const tiers = tiersOf(tariff)
  const show = (v: Amount | undefined, f: (v: unknown) => string) => f(v) || String(v ?? '')
  const both = (a: Amount | undefined, b: Amount | undefined, f: (v: unknown) => string) =>
    a === b || b == null || b === '' ? show(a, f) : t.both(show(a, f), show(b, f))
  const h3 = 'mt-3 mb-1 text-[13px] font-semibold text-muted-foreground'
  const para = 'max-w-[70ch] whitespace-pre-line'
  const hasDiscount = tiers.some((r) => r[5] !== r[3])

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-8 gap-y-4">
      {tiers.length > 1 ? (
        <div className="lg:col-span-2">
          <h3 className={h3}>{t.priceByUsage}</h3>
          <table className="text-sm [&_td]:py-[3px] [&_td]:pr-3.5 [&_td]:whitespace-nowrap [&_th]:py-[3px] [&_th]:pr-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:whitespace-nowrap [&_th]:text-muted-foreground">
            <thead>
              <tr>
                <th>{t.usageCol}</th>
                <th>{t.perKwhCol}</th>
                {hasDiscount && <th>{t.withDiscount}</th>}
                <th>{t.feeCol}</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((r) => (
                <tr key={r[0]}>
                  <td>{r[1] === -1 ? `${r[0]}+ kWh` : `${r[0]}–${r[1]} kWh`}</td>
                  <td>{show(r[3], kwhPrice)}</td>
                  {hasDiscount && <td>{show(r[5], kwhPrice)}</td>}
                  <td>{show(r[2], eur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isWhole(tiers) && <p className={cn(para, 'mt-1')}>{t.wholeNote}</p>}
        </div>
      ) : (
        <div>
          <h3 className={h3}>{t.price}</h3>
          <p className={para}>
            {both(tariff.price, tariff.priceD, kwhPrice)} {t.perKwhSuffix}
          </p>
          <h3 className={h3}>{t.fixedFee}</h3>
          <p className={para}>
            {both(tariff.fee, tariff.feeD, eur)} {t.perMonthSuffix}
          </p>
        </div>
      )}
      {tariff.night != null && (
        <div>
          <h3 className={h3}>{t.nightZone}</h3>
          <p className={para}>
            {both(tariff.night, tariff.nightD, kwhPrice)} {t.perKwhSuffix}
          </p>
        </div>
      )}
      {(tariff.priceCond || tariff.feeCond) && (
        <div>
          {tariff.priceCond && (
            <>
              <h3 className={h3}>{t.priceCond}</h3>
              <p className={para}>{tariff.priceCond}</p>
            </>
          )}
          {tariff.feeCond && (
            <>
              <h3 className={h3}>{t.feeCond}</h3>
              <p className={para}>{tariff.feeCond}</p>
            </>
          )}
        </div>
      )}
      {tariff.notes && (
        <div>
          <h3 className={h3}>{t.notes}</h3>
          <p className={para}>{tariff.notes}</p>
        </div>
      )}
      <div>
        <h3 className={h3}>{t.listing}</h3>
        <p className={para}>
          {ymLabel(ymOf(tariff))}, {t.invoice(tariff.id)}
          <br />
          {tariff.av ? t.open : t.notOpen}
        </p>
      </div>
    </div>
  )
}
