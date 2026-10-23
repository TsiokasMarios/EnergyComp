import { ChevronRight } from 'lucide-react'
import { Chip, GroupHead, LinkButton } from '@/components/chip'
import { CheapestPill, TrendChart } from '@/components/trend-chart'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useI18n } from '@/i18n'
import type { Dataset, ExplorerSearch } from '@/lib/data'
import { TYPE_COLOR, shortProvider } from '@/lib/tariffs'
import type { Metric, Point, Trend } from '@/lib/tariffs'
import { cn, sectionTitle } from '@/lib/utils'

interface TrendSectionProps {
  data: Dataset
  trend: Trend
  search: ExplorerSearch
  kwh: number
  selected: number | 'all'
  update: (patch: Partial<ExplorerSearch>) => void
  toggleProvider: (p: string) => void
  onSelectMonth: (ym: number) => void
}

export function TrendSection({
  data,
  trend,
  search,
  kwh,
  selected,
  update,
  toggleProvider,
  onSelectMonth,
}: TrendSectionProps) {
  const { t } = useI18n()
  const picked = search.prov.length
  return (
    <section className="mt-14" aria-labelledby="trend-h">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id="trend-h" className={sectionTitle}>
          {t.trendTitle}
        </h2>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label={t.compareBy}
          value={search.by}
          onValueChange={(v) => v && update({ by: v as Metric })}
          className="bg-card shadow-none"
        >
          {(['price', 'est'] as const).map((m) => (
            <ToggleGroupItem
              key={m}
              value={m}
              className="h-9 px-3.5 text-sm font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {m === 'price' ? t.perKwh : t.perMonth}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="mt-2 max-w-[68ch] leading-relaxed text-muted-foreground">{t.trendNote(kwh)}</p>

      <div className="mt-6">
        <GroupHead id="cmp-label" label={t.compareProviders}>
          <span className="text-muted-foreground">{t.compareHint(picked)}</span>
          {picked > 0 && <LinkButton onClick={() => update({ prov: [] })}>{t.showAllProviders}</LinkButton>}
        </GroupHead>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="cmp-label">
          {data.providers.map((p) => (
            <Chip
              key={p}
              variant="soft"
              className="h-7 px-2.5 text-[13px]"
              pressed={search.prov.includes(p)}
              onPressedChange={() => toggleProvider(p)}
            >
              {shortProvider(p)}
            </Chip>
          ))}
        </div>
      </div>

      <Verdict trend={trend} providers={search.prov} />

      <div className="mt-5 mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
        {trend.types.map((c) => (
          <span key={c} className="inline-flex items-center gap-2">
            <i className="inline-block h-[3px] w-[18px] rounded-sm" style={{ background: TYPE_COLOR[c] }} />
            {t.typeLabel[c]}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="size-[9px] rounded-full bg-muted-foreground shadow-[0_0_0_2px_#fff,0_0_0_3px_var(--border)]" />
          {t.legendCheapest}
        </span>
        <span>{t.legendHint}</span>
      </div>

      <TrendChart
        trend={trend}
        metric={search.by}
        kwh={kwh}
        selected={selected}
        onSelectMonth={onSelectMonth}
        describedBy="cheap-h"
      />

      <CheapTable trend={trend} metric={search.by} kwh={kwh} selected={selected} onSelectMonth={onSelectMonth} />
    </section>
  )
}

function Verdict({ trend, providers }: { trend: Trend; providers: string[] }) {
  const { t, ymLabel } = useI18n()
  const won = trend.overall.filter((r): r is Point => r !== null)
  if (!won.length) return null
  const tally = <K,>(key: (r: Point) => K) => {
    const c = new Map<K, number>()
    for (const r of won) c.set(key(r), (c.get(key(r)) ?? 0) + 1)
    return [...c.entries()].sort((a, b) => b[1] - a[1])
  }
  const scope = providers.length === 1 ? t.scopeAt(shortProvider(providers[0])) : trend.multi ? t.scopePicks : ''
  const span = trend.months.filter((_, i) => trend.overall[i])
  const row = 'flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm'
  const label = 'min-w-[200px] font-semibold'
  return (
    <div className="mt-6 grid gap-1.5" aria-live="polite">
      <p className={row}>
        <span className={label}>
          {t.cheapestType}
          {scope}
        </span>
        {tally((r) => r.t.c).map(([c, k]) => (
          <span key={c}>
            <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: TYPE_COLOR[c] }} />
            {t.typeLabel[c]}: <b className="font-semibold">{t.months(k)}</b>
          </span>
        ))}
      </p>
      {trend.multi && (
        <p className={row}>
          <span className={label}>{t.cheapestProvider}</span>
          {tally((r) => r.t.p).map(([p, k]) => (
            <span key={p}>
              {shortProvider(p)}: <b className="font-semibold">{t.months(k)}</b>
            </span>
          ))}
        </p>
      )}
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t.countedOver(won.length, ymLabel(span[0]), ymLabel(span[span.length - 1]))}
      </p>
    </div>
  )
}

function CheapTable({
  trend,
  metric,
  kwh,
  selected,
  onSelectMonth,
}: {
  trend: Trend
  metric: Metric
  kwh: number
  selected: number | 'all'
  onSelectMonth: (ym: number) => void
}) {
  const { t, ymLabel, metricValue } = useI18n()
  const { months, panels, types, multi, overall } = trend
  const rows: React.ReactNode[] = []
  for (let i = months.length - 1; i >= 0; i--) {
    const ym = months[i]
    const best = overall[i]
    // When comparing, bold the best provider in each plan-type column
    const colBest = Object.fromEntries(
      types.map((c) => [c, Math.min(...panels.map((pa) => pa.series[c][i]?.v ?? Infinity))]),
    )
    panels.forEach((pa, k) => {
      rows.push(
        <tr
          key={`${ym}-${pa.p}`}
          className={cn(
            '[&>td]:border-b [&>td]:px-3 [&>td]:py-2.5 [&>td]:align-top last:[&>td]:border-b-0',
            multi && k === 0 && '[&>td]:border-t [&>td]:border-t-[#b9c4ce]',
            ym === selected && '[&>td]:bg-secondary',
          )}
        >
          {k === 0 && (
            <td className="whitespace-nowrap" rowSpan={panels.length > 1 ? panels.length : undefined}>
              <button type="button" className="link text-sm font-medium" onClick={() => onSelectMonth(ym)}>
                {ymLabel(ym)}
              </button>
            </td>
          )}
          {multi && <td className="text-sm font-semibold whitespace-nowrap">{pa.p && shortProvider(pa.p)}</td>}
          {types.map((c) => {
            const r = pa.series[c][i]
            if (!r) {
              return (
                <td key={c} className="text-muted-foreground">
                  —
                </td>
              )
            }
            const win = r === best
            const strong = !multi || r.v === colBest[c]
            return (
              <td
                key={c}
                className={cn('min-w-[110px] sm:min-w-[150px]', win && 'shadow-[inset_3px_0_0_var(--foreground)]')}
              >
                <span className={cn('text-[15px]', strong && 'font-semibold')}>{metricValue(r.v, metric)}</span>
                {win && <CheapestPill />}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {pa.p ? '' : `${shortProvider(r.t.p)}, `}
                  {r.t.n}
                </span>
              </td>
            )
          })}
        </tr>,
      )
    })
  }

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="group mt-8 mb-3 flex cursor-pointer items-center gap-1.5 text-left text-[15px] font-semibold">
        <ChevronRight className="size-4 flex-none transition-transform group-data-[state=open]:rotate-90" aria-hidden />
        <span id="cheap-h">{t.cheapTitle(metric, kwh)}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-[540px] overflow-auto rounded-md border bg-card">
          <table className="w-full border-collapse">
            <thead>
              <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-[1] [&>th]:border-b [&>th]:bg-card [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:align-bottom [&>th]:text-[13px] [&>th]:font-semibold [&>th]:whitespace-nowrap [&>th]:text-muted-foreground">
                <th>{t.month}</th>
                {multi && <th>{t.colProvider}</th>}
                {types.map((c) => (
                  <th key={c}>
                    <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: TYPE_COLOR[c] }} />
                    {t.typeLabel[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
