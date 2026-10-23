import { useRouter } from '@tanstack/react-router'
import { useDeferredValue, useRef } from 'react'
import { Filters } from '@/components/filters'
import { Results, buildRows } from '@/components/results'
import { TrendSection } from '@/components/trend-section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import type { Dataset, ExplorerSearch } from '@/lib/data'
import { buildTrend, matches } from '@/lib/tariffs'
import type { Filters as FilterState } from '@/lib/tariffs'

interface ExplorerProps {
  data: Dataset
  search: ExplorerSearch
  update: (patch: Partial<ExplorerSearch>) => void
}

export function Explorer({ data, search: rawSearch, update }: ExplorerProps) {
  const { ymLabel } = useI18n()
  // Shared links can name providers that have since left the register, or a type this register lacks
  const search = {
    ...rawSearch,
    prov: rawSearch.prov.filter((p) => data.providers.includes(p)),
    type: rawSearch.type.filter((c) => data.types.includes(c)),
  }
  const resultsRef = useRef<HTMLDivElement>(null)
  const latest = data.months[data.months.length - 1]
  const ym = search.month === 'all' ? 'all' : search.month && data.months.includes(search.month) ? search.month : latest

  // Typing stays instant; the heavy recalculation follows a beat behind
  const kwh = useDeferredValue(search.kwh)
  const q = useDeferredValue(search.q.trim().toLocaleLowerCase('el'))
  const filters: FilterState = { ym, avail: search.open, types: search.type, providers: search.prov, q }

  const rows = buildRows(
    data.tariffs.filter((t) => matches(t, filters)),
    kwh,
    search.disc,
    search.sort,
    search.desc,
  )
  const trend = buildTrend(data.tariffs, data.months, data.types, filters, kwh, search.disc, search.by)

  const toggleProvider = (p: string) =>
    update({ prov: search.prov.includes(p) ? search.prov.filter((x) => x !== p) : [...search.prov, p] })
  const setMonth = (m: number | 'all') => update({ month: m === latest ? undefined : m })
  const selectMonthAndScroll = (m: number) => {
    setMonth(m)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    resultsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  const reset = () => update({ month: undefined, open: true, disc: true, q: '', prov: [], type: [] })

  return (
    <>
      <Filters
        data={data}
        filters={filters}
        search={search}
        update={update}
        toggleProvider={toggleProvider}
        selectMonth={setMonth}
      />
      <TrendSection
        data={data}
        trend={trend}
        search={search}
        kwh={kwh}
        selected={ym}
        update={update}
        toggleProvider={toggleProvider}
        onSelectMonth={selectMonthAndScroll}
      />
      <Results
        // A new filter starts from the first page with every row collapsed
        key={[ym, search.open, search.prov, search.type].join('|')}
        ref={resultsRef}
        rows={rows}
        fuel={data.fuel}
        search={search}
        kwh={kwh}
        allMonths={ym === 'all'}
        monthLabel={ym === 'all' ? '' : ymLabel(ym)}
        firstMonthLabel={ymLabel(data.months[0])}
        update={update}
        onReset={reset}
      />
    </>
  )
}

/** Shown while the tariff data downloads; mirrors the page layout to avoid a jump. */
export function ExplorerSkeleton() {
  return (
    <div aria-busy="true" className="pt-7">
      <div className="flex flex-wrap gap-7">
        <Skeleton className="h-[64px] w-48" />
        <Skeleton className="h-[64px] w-[110px]" />
        <Skeleton className="mt-auto h-[42px] w-64" />
        <Skeleton className="mt-auto h-[42px] w-56" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 13 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-12 h-8 w-80" />
      <Skeleton className="mt-6 h-[380px] w-full" />
    </div>
  )
}

export function LoadError() {
  const { t } = useI18n()
  const router = useRouter()
  return (
    <div className="py-24 text-center text-muted-foreground">
      <p>{t.loadError}</p>
      <Button variant="outline" className="mt-3" onClick={() => router.invalidate()}>
        {t.retry}
      </Button>
    </div>
  )
}
