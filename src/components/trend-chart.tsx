import { useLayoutEffect, useRef, useState } from 'react'
import { useElementWidth } from '@/hooks/use-element-width'
import { useI18n } from '@/i18n'
import { TYPE_COLOR, niceTicks, shortProvider } from '@/lib/tariffs'
import type { Metric, Panel, Point, Trend } from '@/lib/tariffs'
import { cn } from '@/lib/utils'

interface TrendChartProps {
  trend: Trend
  metric: Metric
  kwh: number
  /** Month currently listed below the chart */
  selected: number | 'all'
  onSelectMonth: (ym: number) => void
  describedBy?: string
}

const GAP = 12
const GRID = '#e8edf1'
const AXIS = '#c5ced7'

type Geometry = ReturnType<typeof layout>

function layout(trend: Trend, width: number, metric: Metric) {
  const W = Math.max(300, width)
  const { multi, panels, months } = trend
  const cols = !multi ? 1 : W >= 1000 && panels.length >= 3 ? 3 : W >= 640 ? 2 : 1
  // -2 for the panel border
  const PW = Math.floor((W - GAP * (cols - 1)) / cols) - 2
  const narrow = PW < 640
  const labels = !multi && !narrow
  const H = multi ? 230 : narrow ? 280 : 380
  const m = { l: 58, r: labels ? 150 : 14, t: 14, b: 30 }
  const pw = PW - m.l - m.r
  const ph = H - m.t - m.b
  const vals = panels.flatMap((pa) => trend.types.flatMap((c) => pa.series[c].filter(Boolean).map((r) => r!.v)))
  const { ticks, step } = niceTicks(Math.min(...vals), Math.max(...vals), multi || narrow ? 4 : 5)
  const d0 = ticks[0]
  const d1 = ticks[ticks.length - 1]
  const n = months.length
  const dx = n > 1 ? pw / (n - 1) : 0
  return {
    cols,
    PW,
    H,
    m,
    ph,
    n,
    dx,
    narrow,
    labels,
    ticks,
    d0,
    decimals: Math.max(metric === 'price' ? 2 : 0, -Math.floor(Math.log10(step))),
    x: (i: number) => m.l + (n > 1 ? i * dx : pw / 2),
    y: (v: number) => m.t + ph - ((v - d0) / (d1 - d0 || 1)) * ph,
  }
}

export function TrendChart({ trend, metric, kwh, selected, onSelectMonth, describedBy }: TrendChartProps) {
  const { t, ymLabel } = useI18n()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<{ i: number; k: number } | null>(null)

  const hasValues = trend.panels.some((pa) => trend.types.some((c) => pa.series[c].some(Boolean)))
  const geo = width && hasValues ? layout(trend, width, metric) : null
  const clampI = (i: number) => Math.max(0, Math.min(trend.months.length - 1, i))
  const show = (i: number, k: number) => {
    const next = { i: clampI(i), k: Math.max(0, Math.min(trend.panels.length - 1, k)) }
    if (next.i !== hover?.i || next.k !== hover?.k) setHover(next)
  }
  const indexAt = (e: React.PointerEvent | React.MouseEvent, svg: SVGSVGElement) => {
    if (!geo) return 0
    const rect = svg.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (geo.PW / rect.width)
    return geo.n > 1 ? Math.round((px - geo.m.l) / geo.dx) : 0
  }
  const selI = selected === 'all' ? -1 : trend.months.indexOf(selected)
  const priced = trend.overall.filter(Boolean).length
  const range = [ymLabel(trend.months[0]), ymLabel(trend.months[trend.months.length - 1])] as const

  return (
    <div ref={ref}>
      {!hasValues ? (
        <p className="rounded-md border bg-card px-4 py-[70px] text-center text-muted-foreground">
          {kwh > 0 ? t.chartEmpty : t.chartNoUsage}
        </p>
      ) : (
        <div
          tabIndex={0}
          aria-describedby={describedBy}
          className="grid gap-3 rounded-md"
          style={geo ? { gridTemplateColumns: `repeat(${geo.cols}, minmax(0, 1fr))` } : { minHeight: 380 }}
          onFocus={() => show(hover?.i ?? (selI >= 0 ? selI : trend.months.length - 1), hover?.k ?? 0)}
          onBlur={() => setHover(null)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            const cur = hover?.i ?? trend.months.length - 1
            const k = hover?.k ?? 0
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [cur - 1, k],
              ArrowRight: [cur + 1, k],
              Home: [0, k],
              End: [trend.months.length - 1, k],
              ArrowUp: [cur, k - 1],
              ArrowDown: [cur, k + 1],
            }
            if (e.key in moves) {
              show(...moves[e.key])
              e.preventDefault()
            } else if (e.key === 'Enter' || e.key === ' ') {
              onSelectMonth(trend.months[cur])
              e.preventDefault()
            }
          }}
        >
          {geo &&
            trend.panels.map((pa, k) => (
              <div key={pa.p ?? 'all'} className="relative min-w-0 rounded-md border bg-card">
                {pa.p && (
                  <h3 className="mx-3.5 mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[15px] font-[650]">
                    {shortProvider(pa.p)}
                    {trend.multi && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {t.panelWins(trend.overall.filter((r) => r?.t.p === pa.p).length, priced)}
                      </span>
                    )}
                  </h3>
                )}
                <div className="relative">
                  <svg
                    role="img"
                    aria-label={t.chartAria(pa.p ? shortProvider(pa.p) : t.allProviders, metric, kwh, ...range)}
                    viewBox={`0 0 ${geo.PW} ${geo.H}`}
                    height={geo.H}
                    className="block w-full cursor-crosshair touch-pan-y"
                    onPointerMove={(e) => show(indexAt(e, e.currentTarget), k)}
                    onClick={(e) => onSelectMonth(trend.months[clampI(indexAt(e, e.currentTarget))])}
                  >
                    <PanelPlot trend={trend} panel={pa} geo={geo} metric={metric} selI={selI} />
                    {hover && <HoverMarks panel={pa} trend={trend} geo={geo} i={hover.i} />}
                  </svg>
                  {hover?.k === k && <Tip trend={trend} panel={pa} i={hover.i} geo={geo} metric={metric} />}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function PanelPlot({
  trend,
  panel: pa,
  geo,
  metric,
  selI,
}: {
  trend: Trend
  panel: Panel
  geo: Geometry
  metric: Metric
  selI: number
}) {
  const { t, monthShort, tick, metricValue } = useI18n()
  const { x, y, m, ph, PW, H, dx } = geo
  const every = geo.narrow ? 6 : 3
  const path = (arr: (Point | null)[]) => {
    let d = ''
    let pen = false
    arr.forEach((r, i) => {
      if (!r) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.v).toFixed(1)}`
      pen = true
    })
    return d
  }

  // End labels in a column on the right, at least 18px apart, joined by leader lines
  const ends = geo.labels
    ? trend.types
        .map((c) => {
          const arr = pa.series[c]
          const i = arr.map(Boolean).lastIndexOf(true)
          return i < 0 ? null : { c, i, v: arr[i]!.v, py: y(arr[i]!.v), ly: 0 }
        })
        .filter((e) => e !== null)
        .sort((a, b) => a.py - b.py)
    : []
  ends.forEach((e, k) => {
    e.ly = Math.max(e.py, k ? ends[k - 1].ly + 18 : m.t + 4)
  })
  for (let k = ends.length - 1; k >= 0; k--) {
    const max = k === ends.length - 1 ? m.t + ph : ends[k + 1].ly - 18
    if (ends[k].ly > max) ends[k].ly = max
  }
  const lx = PW - m.r + 18

  return (
    <g className="text-xs [&_text]:fill-muted-foreground">
      {selI >= 0 && (
        <rect x={x(selI) - Math.max(dx, 8) / 2} y={m.t} width={Math.max(dx, 8)} height={ph} fill="var(--secondary)" />
      )}
      {geo.ticks.map((v) => (
        <g key={v}>
          <line
            x1={m.l}
            x2={PW - m.r}
            y1={y(v)}
            y2={y(v)}
            stroke={v === geo.d0 ? AXIS : GRID}
            shapeRendering="crispEdges"
          />
          <text x={m.l - 10} y={y(v) + 4} textAnchor="end">
            {tick(v, geo.decimals)}
          </text>
        </g>
      ))}
      {trend.months.map((ym, i) => {
        const mo = ym % 100
        if ((mo - 1) % every) return null
        return (
          <g key={ym}>
            <line x1={x(i)} x2={x(i)} y1={m.t + ph} y2={m.t + ph + 5} stroke={AXIS} />
            <text x={x(i)} y={H - 10} textAnchor="middle" className={cn(mo === 1 && 'fill-foreground!')}>
              {mo === 1 ? `${monthShort(ym)} ${Math.floor(ym / 100)}` : monthShort(ym)}
            </text>
          </g>
        )
      })}
      {trend.types.map((c) => (
        <path
          key={c}
          d={path(pa.series[c])}
          fill="none"
          stroke={TYPE_COLOR[c]}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {/* A dot on whichever plan type was cheapest that month */}
      {pa.win.map(
        (r, i) =>
          r && (
            <circle
              key={trend.months[i]}
              cx={x(i)}
              cy={y(r.v)}
              r={trend.multi ? 3.5 : 4.5}
              fill={TYPE_COLOR[r.t.c]}
              stroke="#fff"
              strokeWidth={2}
            />
          ),
      )}
      {ends.map((e) => (
        <g key={e.c}>
          {/* Anchor the label on lines that don't end on a cheapest dot; hollow so it doesn't read as a win */}
          {pa.win[e.i] !== pa.series[e.c][e.i] && (
            <circle cx={x(e.i)} cy={e.py} r={3.5} fill="var(--card)" stroke={TYPE_COLOR[e.c]} strokeWidth={2} />
          )}
          <line x1={x(e.i) + 7} y1={e.py} x2={lx - 5} y2={e.ly} stroke={AXIS} />
          <text x={lx} y={e.ly + 4}>
            <tspan className="fill-foreground text-[13px] font-[650]">{metricValue(e.v, metric)}</tspan>{' '}
            {t.typeShort[e.c]}
          </text>
        </g>
      ))}
    </g>
  )
}

function HoverMarks({ panel, trend, geo, i }: { panel: Panel; trend: Trend; geo: Geometry; i: number }) {
  const { x, y, m, ph } = geo
  return (
    <g pointerEvents="none">
      <line x1={x(i)} x2={x(i)} y1={m.t} y2={m.t + ph} stroke="var(--foreground)" shapeRendering="crispEdges" />
      {trend.types.map((c) => {
        const r = panel.series[c][i]
        return (
          r && <circle key={c} cx={x(i)} cy={y(r.v)} r={6.5} fill="none" stroke="var(--foreground)" strokeWidth={2} />
        )
      })}
    </g>
  )
}

function Tip({
  trend,
  panel: pa,
  i,
  geo,
  metric,
}: {
  trend: Trend
  panel: Panel
  i: number
  geo: Geometry
  metric: Metric
}) {
  const { t, ymLabel, metricValue } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  // Place beside the crosshair, flipping left when there's no room on the right
  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return
    const scale = parent.clientWidth / geo.PW
    const px = geo.x(i) * scale
    const tw = el.offsetWidth
    let left = px + 16
    if (left + tw > parent.clientWidth - 4) left = px - tw - 16
    el.style.left = `${Math.max(4, left)}px`
  })

  const win = pa.win[i]
  const rows = trend.types
    .map((c) => ({ c, r: pa.series[c][i] }))
    .sort((a, b) => (a.r ? a.r.v : Infinity) - (b.r ? b.r.v : Infinity))
  const best = trend.overall[i]

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute top-2 z-10 w-max max-w-[min(320px,calc(100%-8px))] min-w-[min(250px,calc(100%-8px))] rounded-md border bg-popover px-3 py-2.5 text-[13px] shadow-[0_6px_18px_rgba(23,33,43,.14)]"
    >
      <h4 className="mb-2 font-semibold text-muted-foreground">
        {ymLabel(trend.months[i])}
        {pa.p && `, ${shortProvider(pa.p)}`}
      </h4>
      <ol className="grid gap-[7px]">
        {rows.map(({ c, r }) => {
          const isWin = r != null && r === win
          return (
            <li key={c} className="grid grid-cols-[14px_1fr_auto] items-start gap-2">
              <i className="mt-2 h-[3px] rounded-sm" style={{ background: TYPE_COLOR[c] }} />
              <span>
                <span className="block font-semibold">
                  {t.typeLabel[c]}
                  {isWin && <CheapestPill />}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {r ? `${pa.p ? '' : `${shortProvider(r.t.p)}, `}${r.t.n}` : t.noTariffThisMonth}
                </span>
              </span>
              <b className={cn('font-semibold', isWin && 'text-[15px] font-[750]')}>
                {r ? metricValue(r.v, metric) : '—'}
              </b>
            </li>
          )
        })}
      </ol>
      {trend.multi && best && (
        <p className="mt-2 border-t pt-2">
          {t.bestOfPicks} <b>{shortProvider(best.t.p)}</b>, {t.typeShort[best.t.c].toLocaleLowerCase()},{' '}
          {metricValue(best.v, metric)}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{t.clickToList}</p>
    </div>
  )
}

export function CheapestPill() {
  const { t } = useI18n()
  return (
    <em className="ml-1.5 inline-block rounded-full bg-primary px-[7px] py-px align-[1px] text-[11px] font-[650] text-primary-foreground not-italic">
      {t.cheapest}
    </em>
  )
}
