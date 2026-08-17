const baseUrl = String(process.env.CHAKOD_BASE_URL || "").trim().replace(/\/+$/, "");
const secret = String(process.env.INSTAGRAM_PUBLISHER_SECRET || "").trim();

if (!baseUrl) {
  console.error("CHAKOD_BASE_URL is required.");
  process.exit(1);
}

if (!secret) {
  console.error("INSTAGRAM_PUBLISHER_SECRET is required.");
  process.exit(1);
}

const endpoint = `${baseUrl}/api/internal/instagram-story-publisher`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Accept: "application/json",
    "X-Chakod-Instagram-Secret": secret,
  },
  signal: AbortSignal.timeout(30_000),
});

const body = await response.text();
let payload;
try {
  payload = JSON.parse(body);
} catch {
  payload = { raw: body.slice(0, 1000) };
}

if (!response.ok) {
  console.error(`Instagram publisher HTTP ${response.status}`, payload);
  process.exit(1);
}

console.log(JSON.stringify(payload));
