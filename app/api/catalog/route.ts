import { PRELAUNCH_LISTINGS } from "../../../lib/prelaunch-fixtures";
import { prelaunchServerFixturesEnabled } from "../../../lib/prelaunch-server-fixtures";

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

type FixtureListing = (typeof PRELAUNCH_LISTINGS)[number];

type CatalogPayload = {
  success?: boolean;
  message?: string;
  data?: unknown[];
  listings?: unknown[];
  total?: number;
  page?: number;
  total_pages?: number;
  facets?: Record<string, unknown>;
  [key: string]: unknown;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLocaleLowerCase("fa");
}

function numberParam(params: URLSearchParams, key: string) {
  const value = Number(params.get(key) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function matchesFixture(listing: FixtureListing, params: URLSearchParams) {
  const segment = params.get("segment") || "all";
  if (segment !== "all") {
    if (segment === "economic") {
      if (!["economic", "regular"].includes(String(listing.market_segment))) return false;
    } else if (String(listing.market_segment) !== segment) return false;
  }

  const textFields: Array<[string, unknown]> = [
    ["province", listing.province],
    ["city", listing.city],
    ["category", listing.category_code],
    ["brand", listing.brand],
    ["model", listing.model],
    ["body_status", listing.body_status],
    ["transmission", listing.transmission],
    ["fuel_type", listing.fuel_type],
    ["seller_type", listing.seller_type],
  ];

  for (const [key, actual] of textFields) {
    const expected = params.get(key);
    if (expected && normalized(actual) !== normalized(expected)) return false;
  }

  const q = normalized(params.get("q"));
  if (q) {
    const haystack = normalized(
      [listing.title, listing.brand, listing.model, listing.province, listing.city, listing.dealer_name]
        .filter(Boolean)
        .join(" "),
    );
    if (!haystack.includes(q)) return false;
  }

  const price = Number(listing.price_toman || 0);
  const year = Number(listing.production_year || 0);
  const mileage = Number(listing.mileage_km || 0);
  const minPrice = numberParam(params, "min_price");
  const maxPrice = numberParam(params, "max_price");
  const minYear = numberParam(params, "min_year");
  const maxYear = numberParam(params, "max_year");
  const minMileage = numberParam(params, "min_mileage");
  const maxMileage = numberParam(params, "max_mileage");

  return !(
    (minPrice && price < minPrice) ||
    (maxPrice && price > maxPrice) ||
    (minYear && year < minYear) ||
    (maxYear && year > maxYear) ||
    (minMileage && mileage < minMileage) ||
    (maxMileage && mileage > maxMileage)
  );
}

function fixturePage(params: URLSearchParams) {
  const limit = Math.min(24, Math.max(1, Number(params.get("limit")) || 12));
  const page = Math.max(1, Number(params.get("page")) || 1);
  const filtered = PRELAUNCH_LISTINGS.filter((listing) => matchesFixture(listing, params));
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    total_pages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}

function mergeFixtures(payload: CatalogPayload | null, params: URLSearchParams) {
  const fixture = fixturePage(params);
  const upstreamItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.listings)
      ? payload.listings
      : [];
  const merged = new Map<string, unknown>();
  fixture.data.forEach((item) => merged.set(String(item.id), item));
  upstreamItems.forEach((item) => {
    const id = item && typeof item === "object" && "id" in item ? String((item as { id?: unknown }).id || "") : "";
    if (id && !merged.has(id)) merged.set(id, item);
  });

  const limit = Math.min(24, Math.max(1, Number(params.get("limit")) || 12));
  const items = Array.from(merged.values()).slice(0, limit);

  return {
    ...(payload || {}),
    success: true,
    data: items,
    total: Math.max(Number(payload?.total || upstreamItems.length) + fixture.total, items.length),
    page: fixture.page,
    total_pages: Math.max(Number(payload?.total_pages || 1), fixture.total_pages),
    facets: payload?.facets || {},
    staging_demo: true,
  };
}

export async function GET(request: Request) {
  const fixturesEnabled = prelaunchServerFixturesEnabled();
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
    const payload = (await response.json().catch(() => null)) as CatalogPayload | null;

    if (fixturesEnabled) {
      return Response.json(mergeFixtures(payload, upstreamUrl.searchParams), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (!payload) {
      return Response.json(
        { success: false, message: "ارتباط با بازار خودرو برقرار نشد." },
        { status: response.status || 502 },
      );
    }

    return Response.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    if (fixturesEnabled) {
      return Response.json(mergeFixtures(null, upstreamUrl.searchParams), {
        headers: { "Cache-Control": "no-store" },
      });
    }

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
