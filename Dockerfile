# Builds the static site and keeps its data fresh. Serves nothing itself: it publishes
# into the shared `site` volume, which the `web` service (Caddy) serves. See docker-compose.yml.
FROM node:24-bookworm-slim

WORKDIR /app
ENV CI=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN npm install -g pnpm@12.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Full Chromium (new headless mode) plus the system libraries it needs; works on x86_64 and ARM
RUN pnpm exec playwright install --with-deps --no-shell chromium

COPY . .
# Seeds the data volume on first start; after that the volume is the source of truth
RUN cp -r src/data /app/seed-data

ENTRYPOINT ["sh", "docker/entrypoint.sh"]
