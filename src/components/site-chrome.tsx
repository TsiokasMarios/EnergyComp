import { Link, useMatches } from '@tanstack/react-router'
import { Flame, Languages, Zap } from 'lucide-react'
import { localeParam, useI18n } from '@/i18n'
import { FUELS } from '@/lib/data'
import type { Fuel } from '@/lib/types'
import { cn } from '@/lib/utils'

const FUEL_ROUTE = { electricity: '/{-$lang}', gas: '/{-$lang}/gas' } as const
const FUEL_ICON = { electricity: Zap, gas: Flame }

/** The register the current page shows; pages outside the explorer (404) fall back to electricity. */
export function useFuel(): Fuel {
  return useMatches({
    select: (ms) => ms.reduce<Fuel>((f, m) => m.staticData.fuel ?? f, 'electricity'),
  })
}

export function SiteHeader() {
  const { t, locale, date } = useI18n()
  const fuel = useFuel()
  const copy = t.fuels[fuel]
  const other = locale === 'en' ? 'el' : 'en'
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1240px] px-4 pt-5 pb-9 sm:px-6 sm:pt-6 sm:pb-11">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label={t.fuelNav} className="flex gap-1 rounded-lg bg-white/8 p-1">
            {(Object.keys(FUEL_ROUTE) as Fuel[]).map((f) => {
              const Icon = FUEL_ICON[f]
              return (
                <Link
                  key={f}
                  to={FUEL_ROUTE[f]}
                  params={{ lang: localeParam(locale) }}
                  // Sets aria-current; without exact, "/" would also match "/gas"
                  activeOptions={{ exact: true }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    f === fuel ? 'bg-white text-primary' : 'text-header-muted hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t.fuels[f].nav}
                </Link>
              )
            })}
          </nav>
          <Link
            to={FUEL_ROUTE[fuel]}
            params={{ lang: localeParam(other) }}
            search={(prev) => prev}
            hrefLang={other}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-header-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <Languages className="size-4" aria-hidden />
            {t.otherLanguage}
          </Link>
        </div>
        <h1 className="flair mt-8 max-w-[20ch] text-[clamp(34px,5.2vw,60px)] leading-[1.02] font-extrabold tracking-[-0.02em] text-balance sm:mt-10">
          {copy.title}
        </h1>
        <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-header-muted">{copy.lede}</p>
        <p className="mt-3 max-w-[90ch] text-[13px] text-[#94a3b2]">
          {t.sourcePrefix}{' '}
          <a
            href="https://energycost.gr/"
            rel="noopener"
            className="font-medium text-white underline decoration-white/50 underline-offset-3 hover:decoration-white"
          >
            energycost.gr
          </a>
          {t.sourceSuffix(date(FUELS[fuel].meta.captured))}
        </p>
      </div>
      <div className="grid h-2 grid-cols-3" aria-hidden>
        <span className="bg-tariff-blue" />
        <span className="bg-tariff-green" />
        <span className="bg-tariff-yellow" />
      </div>
    </header>
  )
}

export function SiteFooter() {
  const { t } = useI18n()
  const fuel = useFuel()
  return (
    <footer className="mt-16 border-t text-[13px] leading-relaxed text-muted-foreground">
      <div className="mx-auto max-w-[1240px] space-y-2.5 px-4 pt-6 pb-12 sm:px-6">
        {t.fuels[fuel].footer.map((p) => (
          <p key={p} className="max-w-[75ch]">
            {p}
          </p>
        ))}
      </div>
    </footer>
  )
}
