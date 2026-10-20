#!/usr/bin/env bash
# Weekly DRAP price sync: download DRAP's live price list, merge it into data/prices.js,
# clean, update dates and counts, rebuild the medicine pages. Prints a report; commit and PR are left to the caller.
#   bash dawa-check/scripts/drap-sync/sync.sh [work-dir]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; SITE="$HERE/../.."
WORK="${1:-$(mktemp -d)}"; mkdir -p "$WORK"
python3 -I "$HERE/fetch.py" "$WORK"
python3 -I "$HERE/parse.py" "$WORK"
node "$HERE/merge.js" "$WORK/drap_rows.json" "$SITE/data/prices.js"
node "$SITE/scripts/clean-prices.js"
node "$HERE/finish.js"
node "$SITE/scripts/build-seo.js"
echo "report: $WORK/report.json"
