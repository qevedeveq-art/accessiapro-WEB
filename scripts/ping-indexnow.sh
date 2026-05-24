#!/usr/bin/env bash
# ACCESSIA Pro — IndexNow ping after deploy
# Notifies Bing, Yandex, Naver, Seznam (Google has deprecated their ping endpoint).
# Docs: https://www.indexnow.org/documentation
set -euo pipefail

HOST="access-ia.pro"
KEY="89c0ec51c78fbd47f1dcc08b1443d075"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
SITEMAP_URL="https://${HOST}/sitemap.xml"
ENDPOINT="https://api.indexnow.org/IndexNow"

# Extract URLs from the live sitemap (single source of truth).
URLS=$(curl -fsSL "$SITEMAP_URL" | grep -oE 'https://[^<]+' | sort -u)
COUNT=$(echo "$URLS" | wc -l | tr -d ' ')
echo "Submitting $COUNT URLs to IndexNow..."

# Build JSON payload.
URL_LIST=$(echo "$URLS" | awk 'BEGIN{ORS=""} {printf "%s\"%s\"", (NR>1 ? "," : ""), $0}')
PAYLOAD=$(cat <<JSON
{"host":"${HOST}","key":"${KEY}","keyLocation":"${KEY_LOCATION}","urlList":[${URL_LIST}]}
JSON
)

HTTP=$(curl -s -o /tmp/indexnow.out -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Host: api.indexnow.org" \
  --data "$PAYLOAD")

case "$HTTP" in
  200|202) echo "IndexNow OK ($HTTP) — $COUNT URLs submitted" ;;
  400) echo "::warning::IndexNow 400 Bad request — $(cat /tmp/indexnow.out)" ;;
  403) echo "::error::IndexNow 403 — key file at ${KEY_LOCATION} not reachable or mismatched" ; exit 1 ;;
  422) echo "::warning::IndexNow 422 — URLs rejected (wrong host or schema mismatch)" ;;
  429) echo "::warning::IndexNow 429 — rate limited" ;;
  *)   echo "::warning::IndexNow returned HTTP $HTTP — $(cat /tmp/indexnow.out)" ;;
esac
