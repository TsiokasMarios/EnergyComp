import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'
import { I18nProvider, getI18n, localeFromParam } from '@/i18n'
import { tariffsUrl } from '@/lib/data'

export const Route = createFileRoute('/{-$lang}')({
  beforeLoad: ({ params }) => {
    const locale = localeFromParam(params.lang)
    if (!locale) throw notFound()
    return { locale }
  },
  head: ({ match }) => {
    const { t } = getI18n(match.context.locale)
    return {
      meta: [
        { title: t.title },
        { name: 'description', content: t.description },
        { property: 'og:title', content: t.title },
        { property: 'og:description', content: t.description },
      ],
      links: [
        { rel: 'alternate', hrefLang: 'en', href: '/' },
        { rel: 'alternate', hrefLang: 'el', href: '/el' },
        // Start downloading the data while the app boots
        { rel: 'preload', href: tariffsUrl, as: 'fetch', crossOrigin: 'anonymous' },
      ],
    }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale } = Route.useRouteContext()
  return (
    <I18nProvider locale={locale}>
      <SiteHeader />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <Outlet />
      </main>
      <SiteFooter />
    </I18nProvider>
  )
}
