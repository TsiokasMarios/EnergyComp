import { createFileRoute, stripSearchParams, useRouter } from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { Explorer, ExplorerSkeleton } from '@/components/explorer'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { SEARCH_DEFAULTS, loadDataset, parseSearch } from '@/lib/data'
import type { ExplorerSearch } from '@/lib/data'

export const Route = createFileRoute('/{-$lang}/')({
  validateSearch: (s: Partial<ExplorerSearch> & SearchSchemaInput) => parseSearch(s),
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  // The page shell is prerendered; the tariff data is fetched in the browser.
  ssr: false,
  loader: () => loadDataset(),
  staleTime: Infinity,
  pendingMs: 0,
  pendingComponent: ExplorerSkeleton,
  errorComponent: LoadError,
  component: ExplorerPage,
})

function ExplorerPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const update = (patch: Partial<ExplorerSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false })
  return <Explorer data={data} search={search} update={update} />
}

function LoadError() {
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
