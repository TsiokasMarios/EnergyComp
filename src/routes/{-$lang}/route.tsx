import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'
import { I18nProvider, localeFromParam } from '@/i18n'

// Head tags are per page (see lib/head.ts): title, alternates and data preload depend on the register shown
export const Route = createFileRoute('/{-$lang}')({
  beforeLoad: ({ params }) => {
    const locale = localeFromParam(params.lang)
    if (!locale) throw notFound()
    return { locale }
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
