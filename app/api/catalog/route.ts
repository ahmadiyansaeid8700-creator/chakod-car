const CATALOG_API_URL = "https://api.chakod.com/api/listings.php";

const ALLOWED_PARAMS = new Set([
  "segment",
  "limit",
  "page",
  "q",
  "province",
  "city",
  "category",
  "brand",
  "model",
  "min_price",
  "max_price",
  "min_year",
  "max_year",
  "min_mileage",
  "max_mileage",
  "body_status",
  "transmission",
  "fuel_type",
  "seller_type",
  "sort",
]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(CATALOG_API_URL);

  requestUrl.searchParams.forEach((value, key) => {
    if (ALLOWED_PARAMS.has(key) && value.trim()) {
      upstreamUrl.searchParams.set(key, value.trim());
    }
  });

  upstreamUrl.searchParams.set(
    "limit",
    String(Math.min(24, Math.max(1, Number(upstreamUrl.searchParams.get("limit")) || 12))),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.text();

    return new Response(payload, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        success: false,
        message: "ارتباط با بازار خودرو برقرار نشد.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
