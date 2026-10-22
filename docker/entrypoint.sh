#!/bin/sh
# Publish the site, then refresh the tariff data on a schedule and republish after each update.
#   UPDATE_INTERVAL_DAYS  how often to fetch the register (default 7)
#   RETRY_HOURS           wait after a failed fetch before trying again (default 6)
set -u
cd /app

INTERVAL_DAYS=${UPDATE_INTERVAL_DAYS:-7}
RETRY_HOURS=${RETRY_HOURS:-6}
STAMP=src/data/.last-update # lives in the data volume, so restarts don't trigger a refetch
ATTEMPT=/tmp/last-attempt

log() { echo "$(date -u '+%F %T') $*"; }

publish() {
  log "building site"
  if ! pnpm run build >/tmp/build.log 2>&1; then
    cat /tmp/build.log
    log "build failed; keeping the published site"
    return 1
  fi
  mkdir -p /site/assets
  # Hashed assets first, pages last, so a page never points at an asset that isn't there yet
  cp -r dist/client/assets/. /site/assets/
  (cd dist/client && find . -type f ! -path './assets/*' -exec cp --parents {} /site/ \;)
  # Old builds' assets stay a while for visitors with a page already open
  find /site/assets -type f -mtime +30 -delete
  log "site published"
}

[ -f src/data/tariffs.json ] || cp seed-data/*.json src/data/
publish || exit 1

while :; do
  now=$(date +%s)
  last=$(cat "$STAMP" 2>/dev/null || echo 0)
  tried=$(cat "$ATTEMPT" 2>/dev/null || echo 0)
  if [ $((now - last)) -ge $((INTERVAL_DAYS * 86400)) ] && [ $((now - tried)) -ge $((RETRY_HOURS * 3600)) ]; then
    echo "$now" >"$ATTEMPT"
    log "updating data"
    if node scripts/update.ts; then
      echo "$now" >"$STAMP"
      publish
    else
      log "update failed; data unchanged, retrying in ${RETRY_HOURS}h"
    fi
  fi
  sleep 3600
done
