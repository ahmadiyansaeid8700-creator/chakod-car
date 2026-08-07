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

check_200() {
  local path="$1"
  local code
  code="$(curl --silent --show-error --output /tmp/chakod-smoke-body --write-out '%{http_code}' --max-time 8 "$BASE$path")"
  if [[ "$code" != "200" ]]; then
    echo "Expected 200 for $path, received $code" >&2
    cat /tmp/chakod-smoke-body >&2 || true
    exit 1
  fi
  echo "OK 200 $path"
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
  "/robots.txt"; do
  check_200 "$path"
done

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

check_redirect "/showrooms" "/dealerships"
check_redirect "/help" "/support"
check_redirect "/advertising/banners" "/advertising/dealership-placement"

# `/dealers` is a legacy private entry point. The auth guard intentionally runs
# before the page-level compatibility redirect, so guests must first authenticate.
# After login, the page source contract redirects it to `/account/business/dealers`.
check_redirect "/dealers" "/login?returnTo=/dealers"

AI_RESPONSE="$(curl --silent --show-error --fail --max-time 12 \
  -H 'Content-Type: application/json' \
  -X POST \
  --data '{"messages":[{"role":"user","content":"برای خرید خودرو از کجا شروع کنم؟"}]}' \
  "$BASE/api/ai/assistant")"

if ! printf '%s' "$AI_RESPONSE" | grep -q '"reply"'; then
  echo "AI assistant smoke response is missing reply." >&2
  printf '%s\n' "$AI_RESPONSE" >&2
  exit 1
fi

# CI intentionally runs without OPENAI_API_KEY. The assistant must still return
# a successful offline response instead of failing the public product.
if ! printf '%s' "$AI_RESPONSE" | grep -q '"success":true'; then
  echo "AI assistant smoke response is not successful." >&2
  printf '%s\n' "$AI_RESPONSE" >&2
  exit 1
fi

if ! printf '%s' "$AI_RESPONSE" | grep -q '"configured":false'; then
  echo "AI assistant did not use the expected offline fallback in portable CI." >&2
  printf '%s\n' "$AI_RESPONSE" >&2
  exit 1
fi

echo "Portable runtime smoke passed."
