# Household electricity tariffs in Greece

Compare every residential electricity tariff registered with RAAEY (via [energycost.gr](https://energycost.gr/)),
month by month, at your own usage. English at `/`, Greek at `/el`.

Built with TanStack Start (React 19 + React Compiler), Tailwind v4 and shadcn/ui, on the Vite+ toolchain (`vp`).

## Commands

```bash
vp install          # dependencies
vp dev              # dev server on :3000
vp build            # static site in dist/client (both locales prerendered)
vp preview          # serve the production build
vp check            # oxfmt + oxlint (type-aware) + type check
vp fmt              # format
```

## How it fits together

- **Static output.** `vp build` prerenders `/` and `/el` (header, footer, loading skeleton) into `dist/client`. The
  tariff data is `src/data/tariffs.json`, imported with `?url` so it ships as a content-hashed asset
  (~1.7 MB raw, ~100 KB gzipped) that the page preloads and fetches in the browser. Any static host works; cache
  `/assets/*` forever.
- **State lives in the URL.** Every filter (month, usage, providers, types, search, sort, chart metric) is a search
  param, so views are shareable and survive reloads; defaults are stripped to keep links short.
- **i18n.** `src/i18n/en.ts` is the source dictionary; `el.ts` must match its shape (TypeScript enforces it).
  Numbers, euros and months go through `Intl` (`€0.12345` / `0,12345 €`).

```
src/
  routes/{-$lang}/route.tsx   locale layout (validates /el, head tags, header/footer)
  routes/{-$lang}/index.tsx   the explorer: search-param schema, data loader
  components/                 filters, trend chart (custom SVG), results table
  lib/tariffs.ts              pricing logic: tiers, discounts, monthly estimate, trend
  lib/data.ts                 data loading + URL search schema
  data/                       tariffs.json + meta.json (generated)
scripts/extract.ts            register HTML → src/data/*.json
```

## Updating the data

The source page is the
[RAAEY residential register](https://energycost.gr/%ce%ba%ce%b1%cf%84%ce%b1%cf%87%cf%89%cf%81%ce%b7%ce%bc%ce%ad%ce%bd%ce%b1-%cf%84%ce%b9%ce%bc%ce%bf%ce%bb%cf%8c%ce%b3%ce%b9%ce%b1-%cf%80%cf%81%ce%bf%ce%bc%ce%ae%ce%b8%ce%b5%ce%b9%ce%b1%cf%82-%ce%b7-3/).
It sits behind Incapsula bot protection, so a plain `fetch`/`curl` gets a challenge page; capture needs a real
(headless) browser.

```bash
vp node scripts/update.ts   # fetch with headless Chromium, snapshot, merge into src/data
vp node scripts/extract.ts scripts/snapshots/source-snapshot-2026-09-23.html   # from a saved page
```

- **Merging.** The register drops old tariffs over time, so each capture is merged into the existing data rather than
  replacing it: the capture wins for every tariff it lists, tariffs it no longer lists are kept for past months but
  removed from its latest month (withdrawn, not archived). `extract.ts --replace` skips the merge.
- **Safety.** Both scripts refuse to write if fewer than 100 tariffs parse (a block page or a layout change).
- **Raw HTML only.** The page's own scripts rewrite the table after load, so `update.ts` re-requests the raw HTML from
  inside the browser once the challenge has passed. Snapshots are git-ignored; `update.ts` keeps the newest 8.
- `scripts/probe_source.py` is a standalone diagnostic: run it on a new machine to see which fetch methods get past
  Incapsula from there.

## Deploying (Docker)

`docker compose up -d --build` runs two services:

- **app** builds the site into a shared volume, then fetches the register every `UPDATE_INTERVAL_DAYS` (default 7),
  merges it and rebuilds. A failed fetch leaves the data and site untouched and retries after `RETRY_HOURS` (6).
- **web** is Caddy serving the build on `127.0.0.1:8080` (set `WEB_PORT` to change); point the reverse proxy at it.

The merged history lives in the `data` volume, seeded from `src/data` on first start; back it up, since the register
itself no longer has the dropped tariffs. `docker compose logs -f app` shows each update. To pull the current data
back into the repo: `docker compose cp app:/app/src/data/. src/data/`.
