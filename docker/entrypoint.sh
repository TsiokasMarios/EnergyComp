#!/bin/sh
# Publish the site, then refresh the tariff data (electricity and gas) on a schedule and republish after each update.
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

# Volumes from before natural gas kept the electricity data and snapshots at the top level
if [ -f src/data/tariffs.json ]; then
  mkdir -p src/data/electricity scripts/snapshots/electricity
  mv src/data/tariffs.json src/data/meta.json src/data/electricity/
  find scripts/snapshots -maxdepth 1 -name 'source-snapshot-*.html' -exec mv {} scripts/snapshots/electricity/ \;
fi
# Seed each register missing from the volume, so a newly added one starts with its history
for fuel in seed-data/*/; do
  fuel=$(basename "$fuel")
  [ -f "src/data/$fuel/tariffs.json" ] || { mkdir -p "src/data/$fuel" && cp "seed-data/$fuel"/*.json "src/data/$fuel/"; }
done
publish || exit 1

while :; do
  now=$(date +%s)
  last=$(cat "$STAMP" 2>/dev/null || echo 0)
  tried=$(cat "$ATTEMPT" 2>/dev/null || echo 0)
  if [ $((now - last)) -ge $((INTERVAL_DAYS * 86400)) ] && [ $((now - tried)) -ge $((RETRY_HOURS * 3600)) ]; then
    echo "$now" >"$ATTEMPT"
    log "updating data"
    node scripts/update.ts
    case $? in
    0)
      echo "$now" >"$STAMP"
      publish
      ;;
    2)
      log "some registers failed to update; publishing the rest, retrying in ${RETRY_HOURS}h"
      publish
      ;;
    *) log "update failed; data unchanged, retrying in ${RETRY_HOURS}h" ;;
    esac
  fi
  sleep 3600
done
