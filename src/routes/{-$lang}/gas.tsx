import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { Explorer, ExplorerSkeleton, LoadError } from '@/components/explorer'
import { loadDataset, parseSearch, searchDefaults } from '@/lib/data'
import type { ExplorerSearch } from '@/lib/data'
import { explorerHead } from '@/lib/head'

export const Route = createFileRoute('/{-$lang}/gas')({
  staticData: { fuel: 'gas' },
  head: ({ params }) => explorerHead('gas', params.lang),
  validateSearch: (s: Partial<ExplorerSearch> & SearchSchemaInput) => parseSearch(s, 'gas'),
  search: { middlewares: [stripSearchParams(searchDefaults('gas'))] },
  // The page shell is prerendered; the tariff data is fetched in the browser.
  ssr: false,
  loader: () => loadDataset('gas'),
  staleTime: Infinity,
  pendingMs: 0,
  pendingComponent: ExplorerSkeleton,
  errorComponent: LoadError,
  component: GasPage,
})

function GasPage() {
  const navigate = Route.useNavigate()
  const update = (patch: Partial<ExplorerSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false })
  return <Explorer data={Route.useLoaderData()} search={Route.useSearch()} update={update} />
}
