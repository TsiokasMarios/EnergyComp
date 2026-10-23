# Household electricity and natural gas tariffs in Greece

Compare every residential electricity and natural gas tariff registered with RAAEY (via
[energycost.gr](https://energycost.gr/)), month by month, at your own usage. Electricity at `/`, natural gas at `/gas`;
Greek under `/el` (`/el`, `/el/gas`).

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

- **Static output.** `vp build` prerenders `/`, `/el`, `/gas` and `/el/gas` (header, footer, loading skeleton) into
  `dist/client`. Each register's data is `src/data/<fuel>/tariffs.json`, imported with `?url` so it ships as a
  content-hashed asset (electricity ~1.7 MB raw, ~100 KB gzipped) that its page preloads and fetches in the browser. Any static host works; cache
  `/assets/*` forever.
- **State lives in the URL.** Every filter (month, usage, providers, types, search, sort, chart metric) is a search
  param, so views are shareable and survive reloads; defaults are stripped to keep links short.
- **Two registers, one explorer.** Electricity and gas share every component and the pricing logic; each page route
  sets `staticData.fuel`, and `FUELS` in `lib/data.ts` holds what differs (data file, default usage). Copy that
  differs lives under `fuels` in the dictionaries. Gas has no green tariffs, tiers or night rates; the filters and
  chart only show the plan types a register has.
- **i18n.** `src/i18n/en.ts` is the source dictionary; `el.ts` must match its shape (TypeScript enforces it).
  Numbers, euros and months go through `Intl` (`€0.12345` / `0,12345 €`).

```
src/
  routes/{-$lang}/route.tsx   locale layout (validates /el, head tags, header/footer)
  routes/{-$lang}/index.tsx   electricity explorer: search-param schema, data loader
  routes/{-$lang}/gas.tsx     natural gas explorer, same shape
  components/                 filters, trend chart (custom SVG), results table
  lib/tariffs.ts              pricing logic: tiers, discounts, monthly estimate, trend
  lib/data.ts                 per-fuel config, data loading + URL search schema
  data/{electricity,gas}/     tariffs.json + meta.json (generated)
scripts/extract.ts            register HTML → src/data/<fuel>/*.json
```

## Updating the data

The sources are RAAEY's residential registers for
[electricity](https://energycost.gr/%ce%ba%ce%b1%cf%84%ce%b1%cf%87%cf%89%cf%81%ce%b7%ce%bc%ce%ad%ce%bd%ce%b1-%cf%84%ce%b9%ce%bc%ce%bf%ce%bb%cf%8c%ce%b3%ce%b9%ce%b1-%cf%80%cf%81%ce%bf%ce%bc%ce%ae%ce%b8%ce%b5%ce%b9%ce%b1%cf%82-%ce%b7-3/)
and [natural gas](https://energycost.gr/%ce%ba%ce%b1%cf%84%ce%b1%cf%87%cf%89%cf%81%ce%b7%ce%bc%ce%ad%ce%bd%ce%b1-%cf%84%ce%b9%ce%bc%ce%bf%ce%bb%cf%8c%ce%b3%ce%b9%ce%b1-%cf%80%cf%81%ce%bf%ce%bc%ce%ae%ce%b8%ce%b5%ce%b9%ce%b1%cf%82_gas/),
which share one page layout. They sit behind Incapsula bot protection, so a plain `fetch`/`curl` gets a challenge
page; capture needs a real (headless) browser.

```bash
vp node scripts/update.ts                # fetch both with headless Chromium, snapshot, merge into src/data/<fuel>
vp node scripts/update.ts --fuel gas     # just one register
vp node scripts/extract.ts --fuel gas scripts/snapshots/gas/source-snapshot-2026-10-22.html   # from a saved page
```

- **Merging.** The register drops old tariffs over time, so each capture is merged into the existing data rather than
  replacing it: the capture wins for every tariff it lists, tariffs it no longer lists are kept for past months but
  removed from its latest month (withdrawn, not archived). `extract.ts --replace` skips the merge.
- **Safety.** Both scripts refuse to write if fewer than 100 tariffs parse (a block page or a layout change).
- **Raw HTML only.** The page's own scripts rewrite the table after load, so `update.ts` re-requests the raw HTML from
  inside the browser once the challenge has passed. Snapshots (`scripts/snapshots/<fuel>/`) are git-ignored;
  `update.ts` keeps the newest 8 of each.
- **Partial failures.** Each register updates independently; `update.ts` exits 0 when all updated, 2 when only some
  did, 1 when none did.
- `scripts/probe_source.py` is a standalone diagnostic: run it on a new machine to see which fetch methods get past
  Incapsula from there.

## Deploying (Docker)

`docker compose up -d --build` runs two services:

- **app** builds the site into a shared volume, then fetches both registers every `UPDATE_INTERVAL_DAYS` (default 7),
  merges them and rebuilds. A failed fetch leaves that register's data untouched and retries after `RETRY_HOURS`
  (6); if only one register failed, the other's update is still published.
- **web** is Caddy serving the build on `127.0.0.1:3004` (set `WEB_PORT` to change); point the reverse proxy at it.

The site is built for `BASE_PATH` (`/energycomp/` in `docker-compose.yml`; default `/` for `vp build`). The proxy
strips that prefix before forwarding, e.g. in nginx's `server { ... }` block:

```nginx
location = /energycomp {
    return 301 /energycomp/;
}

location ^~ /energycomp/ {
    # Trailing slash strips the prefix: /energycomp/el -> /el
    proxy_pass http://127.0.0.1:3004/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The merged history lives in the `data` volume, seeded from `src/data` on first start; back it up, since the registers
themselves no longer have the dropped tariffs. Seeding is per register, so a volume from before gas gets the gas
history added (and its electricity files are moved into `electricity/`). `docker compose logs -f app` shows each update. To pull the current data
back into the repo: `docker compose cp app:/app/src/data/. src/data/`.
