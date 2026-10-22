import { Link } from '@tanstack/react-router'
import { Languages } from 'lucide-react'
import { localeParam, useI18n } from '@/i18n'
import { meta } from '@/lib/data'

export function SiteHeader() {
  const { t, locale, date } = useI18n()
  const other = locale === 'en' ? 'el' : 'en'
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-8 sm:px-6 sm:pt-8">
        <div className="flex justify-end">
          <Link
            to="/{-$lang}"
            params={{ lang: localeParam(other) }}
            search={(prev) => prev}
            hrefLang={other}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-header-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <Languages className="size-4" aria-hidden />
            {t.otherLanguage}
          </Link>
        </div>
        <h1 className="mt-2 max-w-[16ch] text-[clamp(30px,4.6vw,52px)] leading-[1.05] font-[750] tracking-[-0.02em]">
          {t.title}
        </h1>
        <p className="mt-3.5 max-w-[62ch] text-base text-header-muted">{t.lede}</p>
        <p className="mt-2.5 text-[13px] text-[#94a3b2]">
          {t.sourcePrefix}{' '}
          <a href="https://energycost.gr/" rel="noopener" className="text-white underline">
            energycost.gr
          </a>
          {t.sourceSuffix(date(meta.captured))}
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
  return (
    <footer className="border-t text-[13px] text-muted-foreground">
      <div className="mx-auto max-w-[1240px] space-y-2 px-4 pt-5 pb-10 sm:px-6">
        {t.footer.map((p) => (
          <p key={p} className="max-w-[80ch]">
            {p}
          </p>
        ))}
      </div>
    </footer>
  )
}
