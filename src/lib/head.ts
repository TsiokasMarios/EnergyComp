import { getI18n, localeFromParam } from '@/i18n'
import { FUELS } from './data'
import type { Fuel } from './types'

const SUBPATH: Record<Fuel, string> = { electricity: '', gas: 'gas' }

/** Head tags for an explorer page: title, description, language alternates and the data preload. */
export function explorerHead(fuel: Fuel, lang: string | undefined) {
  const { t } = getI18n(localeFromParam(lang) ?? 'en')
  const { title, description } = t.fuels[fuel]
  const base = import.meta.env.BASE_URL
  const sub = SUBPATH[fuel]
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
    ],
    links: [
      { rel: 'alternate', hrefLang: 'en', href: `${base}${sub}` },
      { rel: 'alternate', hrefLang: 'el', href: `${base}el${sub && `/${sub}`}` },
      // Start downloading the data while the app boots
      { rel: 'preload', href: FUELS[fuel].url, as: 'fetch', crossOrigin: 'anonymous' as const },
    ],
  }
}
