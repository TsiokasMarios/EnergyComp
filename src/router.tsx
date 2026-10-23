import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import type { Fuel } from './lib/types'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
  interface StaticDataRouteOption {
    /** Set on each explorer page; the shared header and footer follow it */
    fuel?: Fuel
  }
}
