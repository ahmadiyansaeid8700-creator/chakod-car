#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
HOST="127.0.0.1"
BASE="http://${HOST}:${PORT}"
LOG_FILE="${RUNNER_TEMP:-/tmp}/chakod-vinext-start.log"

npx vinext start --hostname "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 40); do
  if curl --silent --show-error --fail --max-time 3 "$BASE/" >/tmp/chakod-home.html 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" -ne 1 ]]; then
  echo "Portable Vinext server did not become ready." >&2
  cat "$LOG_FILE" >&2 || true
  exit 1
fi

if ! grep -q "چاکود" /tmp/chakod-home.html; then
  echo "Homepage response does not contain Chakod branding." >&2
  cat "$LOG_FILE" >&2 || true
  exit 1
fi

# Every non-dynamic app page must render or intentionally redirect. Private
# account/admin pages may redirect to login, but no static page may 4xx/5xx.
node scripts/smoke-static-routes.mjs "$BASE"

check_200() {
  local path="$1"
  local code
  code="$(curl --silent --show-error --output /tmp/chakod-smoke-body --write-out '%{http_code}' --max-time 12 "$BASE$path")"
  if [[ "$code" != "200" ]]; then
    echo "Expected 200 for $path, received $code" >&2
    cat /tmp/chakod-smoke-body >&2 || true
    exit 1
  fi
  echo "OK 200 $path"
}

check_404() {
  local path="$1"
  local code
  code="$(curl --silent --show-error --output /tmp/chakod-smoke-body --write-out '%{http_code}' --max-time 12 "$BASE$path")"
  if [[ "$code" != "404" ]]; then
    echo "Expected 404 for retired route $path, received $code" >&2
    cat /tmp/chakod-smoke-body >&2 || true
    exit 1
  fi
  echo "OK 404 $path"
}

for path in \
  "/" \
  "/about" \
  "/privacy" \
  "/terms" \
  "/refund-policy" \
  "/legal" \
  "/support" \
  "/cars/compare" \
  "/cars/price-guide" \
  "/advertising" \
  "/advertising/dealership-placement" \
  "/robots.txt" \
  "/manifest.webmanifest" \
  "/sitemap.xml" \
  "/sitemaps/static.xml" \
  "/sitemaps/cars.xml" \
  "/sitemaps/businesses.xml" \
  "/sitemaps/dealerships.xml" \
  "/sitemaps/articles.xml"; do
  check_200 "$path"
done

for path in "/sitemap.xml" "/sitemaps/static.xml" "/sitemaps/cars.xml" "/sitemaps/businesses.xml" "/sitemaps/dealerships.xml" "/sitemaps/articles.xml"; do
  body="$(curl --silent --show-error --fail --max-time 12 "$BASE$path")"
  if ! printf '%s' "$body" | grep -Eq '<(sitemapindex|urlset)([ >])'; then
    echo "XML sitemap response is invalid for $path" >&2
    printf '%s\n' "$body" >&2
    exit 1
  fi
done

STATIC_SITEMAP="$(curl --silent --show-error --fail --max-time 12 "$BASE/sitemaps/static.xml")"
for legacy_path in \
  "/contact" \
  "/affiliate" \
  "/affiliate/rules" \
  "/affiliate/privacy" \
  "/ads" \
  "/dashboard" \
  "/dealer" \
  "/dealers" \
  "/help" \
  "/my-listings" \
  "/showrooms" \
  "/submit"; do
  if printf '%s' "$STATIC_SITEMAP" | grep -Fq "${legacy_path}</loc>"; then
    echo "Legacy or redirect-only route leaked into static sitemap: $legacy_path" >&2
    exit 1
  fi
done
echo "Static sitemap contains canonical 200 routes only."

check_redirect() {
  local path="$1"
  local expected="$2"
  local headers
  headers="$(curl --silent --show-error --head --max-time 8 "$BASE$path")"
  local code
  code="$(printf '%s\n' "$headers" | awk 'NR==1 {print $2}')"
  local location
  location="$(printf '%s\n' "$headers" | awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/\r$/, "", $2); print $2; exit}')"

  if [[ "$code" != "307" && "$code" != "308" && "$code" != "301" && "$code" != "302" ]]; then
    echo "Expected redirect for $path, received $code" >&2
    printf '%s\n' "$headers" >&2
    exit 1
  fi

  if [[ "$location" != "$expected" && "$location" != "$BASE$expected" ]]; then
    echo "Unexpected redirect for $path: $location (expected $expected)" >&2
    exit 1
  fi
  echo "OK $code $path -> $location"
}

# Compatibility aliases remain available for old inbound links, but all of them
# must converge on the current canonical routes.
check_redirect "/account-v2" "/account"
check_redirect "/ads" "/cars"
check_redirect "/dashboard" "/account"
check_redirect "/dashboard/listings" "/account/listings"
check_redirect "/dealer" "/dealerships"
check_redirect "/help" "/support"
check_redirect "/my-listings" "/account/listings"
check_redirect "/showrooms" "/dealerships"
check_redirect "/submit" "/account/listings/new"
check_redirect "/contact" "/support#request"
check_redirect "/advertising/banners" "/advertising/dealership-placement"

# `/dealers` is a legacy private entry point. The auth guard intentionally runs
# before the page-level compatibility redirect, so guests must first authenticate.
# After login, the page source contract redirects it to `/account/business/dealers`.
check_redirect "/dealers" "/login?returnTo=/dealers"

# The retired affiliate program must not return as a public route. Normal user
# referrals are handled elsewhere and are intentionally not modeled as affiliate pages.
check_404 "/affiliate"
check_404 "/affiliate/rules"
check_404 "/affiliate/privacy"

# Chakod AI is admin-first. The legacy public assistant must stay removed and
# AI Manager endpoints must fail closed for unauthenticated callers.
LEGACY_AI_CODE="$(curl --silent --show-error --output /tmp/chakod-legacy-ai-body --write-out '%{http_code}' --max-time 12 \
  -H 'Content-Type: application/json' \
  -X POST \
  --data '{"messages":[{"role":"user","content":"test"}]}' \
  "$BASE/api/ai/assistant")"
if [[ "$LEGACY_AI_CODE" != "404" ]]; then
  echo "Expected removed public AI assistant to return 404, received $LEGACY_AI_CODE" >&2
  cat /tmp/chakod-legacy-ai-body >&2 || true
  exit 1
fi
echo "OK 404 /api/ai/assistant"

AI_MANAGER_CODE="$(curl --silent --show-error --output /tmp/chakod-ai-manager-body --write-out '%{http_code}' --max-time 12 \
  "$BASE/api/ai/manager/status")"
if [[ "$AI_MANAGER_CODE" != "404" ]]; then
  echo "Expected unauthenticated AI Manager status to fail closed with 404, received $AI_MANAGER_CODE" >&2
  cat /tmp/chakod-ai-manager-body >&2 || true
  exit 1
fi
echo "OK 404 /api/ai/manager/status (unauthenticated)"

echo "Portable runtime smoke passed."
