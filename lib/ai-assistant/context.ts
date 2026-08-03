import "server-only";

import type {
  AdminListingContext,
  AssistantKnowledge,
  AssistantPageContext,
  PublicListingContext,
  PublicSearchIntent,
} from "./contracts";
import {
  buildAdminOperationalInsights,
  buildMarketIntelligence,
  enrichAdminQueue,
  normalizeAssistantText,
  parsePublicSearchIntent,
} from "./intelligence";

const API_BASE = "https://api.chakod.com";
const PUBLIC_LISTINGS_URL = `${API_BASE}/api/listings.php`;
const ADMIN_ME_URL = `${API_BASE}/api/admin-me.php`;
const ADMIN_LISTINGS_URL = `${API_BASE}/api/admin-listings.php`;

type PublicListingPayload = {
  id?: number | string;
  title?: string | null;
  brand?: string | null;
  brand_name?: string | null;
  model?: string | null;
  model_name?: string | null;
  production_year?: number | string | null;
  mileage_km?: number | string | null;
  price_toman?: number | string | null;
  province?: string | null;
  province_name?: string | null;
  city?: string | null;
  city_name?: string | null;
  neighborhood?: string | null;
  body_status?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  seller_type?: string | null;
  views_count?: number | string | null;
};

type PublicCatalogResponse = {
  success?: boolean;
  total?: number | string;
  data?: PublicListingPayload[];
};

type AdminMeResponse = {
  success?: boolean;
  is_admin?: boolean;
  admin?: {
    role?: string | null;
    display_name?: string | null;
    role_title?: string | null;
    permissions?: string[];
  };
};

type AdminListingPayload = {
  id?: number | string;
  title?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  moderation_risk_level?: string | null;
  moderation_score?: number | string | null;
  moderation_reason?: string | null;
  listing_owner_type?: string | null;
  created_at?: string | null;
  public_url?: string | null;
};

type AdminListingsResponse = {
  success?: boolean;
  stats?: Record<string, number | string>;
  pagination?: {
    total?: number | string;
  };
  data?: AdminListingPayload[];
};

export async function buildPublicKnowledge(
  message: string,
  page: AssistantPageContext,
): Promise<AssistantKnowledge> {
  const query = parsePublicSearchIntent(message, page);
  const primaryParams = searchParamsFromIntent(query);
  const fallbackParams = new URLSearchParams({
    segment: "all",
    limit: "24",
    page: "1",
    sort: "vip",
  });

  if (query.province) fallbackParams.set("province", query.province);
  if (query.max_price) {
    fallbackParams.set("max_price", String(query.max_price));
  }

  const listingId = listingIdFromPath(page.path);
  const [catalogResult, fallbackResult, detailResult] = await Promise.allSettled([
    fetchJson<PublicCatalogResponse>(
      `${PUBLIC_LISTINGS_URL}?${primaryParams.toString()}`,
      6_500,
    ),
    fetchJson<PublicCatalogResponse>(
      `${PUBLIC_LISTINGS_URL}?${fallbackParams.toString()}`,
      6_500,
    ),
    listingId
      ? fetchJson<Record<string, unknown>>(
          `${API_BASE}/api/listing-detail.php?id=${listingId}`,
          6_500,
        )
      : Promise.resolve(null),
  ]);

  const catalog =
    catalogResult.status === "fulfilled" ? catalogResult.value : null;
  const fallback =
    fallbackResult.status === "fulfilled" ? fallbackResult.value : null;
  const primaryListings = normalizePublicListings(catalog?.data);
  const fallbackListings = normalizePublicListings(fallback?.data);
  const usedFallback = primaryListings.length === 0 && fallbackListings.length > 0;
  const detail =
    detailResult.status === "fulfilled" && detailResult.value
      ? sanitizeDetail(detailResult.value)
      : null;
  const detailListing = detail
    ? normalizePublicListing(detail as PublicListingPayload)
    : null;
  const listings = dedupeListings([
    ...primaryListings,
    ...(usedFallback ? fallbackListings : []),
    ...(detailListing ? [detailListing] : []),
  ]);
  const rankedListings = rankListings(listings, message).slice(0, 24);
  const resolvedQuery = {
    ...query,
    relaxed: usedFallback,
  };

  return {
    mode: "user",
    page,
    catalog: {
      total:
        toFiniteNumber(catalog?.total) ??
        toFiniteNumber(fallback?.total) ??
        rankedListings.length,
      query: resolvedQuery,
      listings: rankedListings,
      detail,
      data_status:
        (catalog?.success || fallback?.success) && rankedListings.length
          ? "ready"
          : "unavailable",
    },
    market: buildMarketIntelligence(
      rankedListings,
      detail,
      resolvedQuery.max_price,
    ),
  };
}

function normalizePublicListings(values: PublicListingPayload[] | undefined) {
  return Array.isArray(values)
    ? values
        .map(normalizePublicListing)
        .filter((item): item is PublicListingContext => item !== null)
    : [];
}

export async function buildAdminKnowledge(
  page: AssistantPageContext,
  sessionToken: string,
): Promise<AssistantKnowledge | null> {
  const token = cleanToken(sessionToken);
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Session-Token": token,
    Accept: "application/json",
  };

  let me: AdminMeResponse;

  try {
    me = await fetchJson<AdminMeResponse>(ADMIN_ME_URL, 6_000, headers);
  } catch {
    return null;
  }

  const permissions = Array.isArray(me.admin?.permissions)
    ? me.admin.permissions.filter((item) => typeof item === "string").slice(0, 30)
    : [];
  const canView =
    permissions.includes("*") ||
    permissions.includes("listings.view") ||
    permissions.includes("listings.manage");

  if (!me.success || !me.is_admin || !canView) return null;

  const pendingUrl = new URL(ADMIN_LISTINGS_URL);
  pendingUrl.search = new URLSearchParams({
    status: "pending",
    risk: "all",
    owner_type: "all",
    page: "1",
    limit: "40",
  }).toString();

  const approvedUrl = new URL(ADMIN_LISTINGS_URL);
  approvedUrl.search = new URLSearchParams({
    status: "approved",
    risk: "all",
    owner_type: "all",
    page: "1",
    limit: "20",
  }).toString();

  const needsEditUrl = new URL(ADMIN_LISTINGS_URL);
  needsEditUrl.search = new URLSearchParams({
    status: "needs_edit",
    risk: "all",
    owner_type: "all",
    page: "1",
    limit: "30",
  }).toString();

  const [pendingResult, approvedResult, needsEditResult] =
    await Promise.allSettled([
    fetchJson<AdminListingsResponse>(pendingUrl.toString(), 7_000, headers),
    fetchJson<AdminListingsResponse>(approvedUrl.toString(), 7_000, headers),
      fetchJson<AdminListingsResponse>(needsEditUrl.toString(), 7_000, headers),
    ]);

  const pending =
    pendingResult.status === "fulfilled" ? pendingResult.value : null;
  const approved =
    approvedResult.status === "fulfilled" ? approvedResult.value : null;
  const needsEdit =
    needsEditResult.status === "fulfilled" ? needsEditResult.value : null;
  const pendingListings = normalizeAdminListings(pending?.data);
  const approvedListings = normalizeAdminListings(approved?.data);
  const needsEditListings = normalizeAdminListings(needsEdit?.data);
  const stats = normalizeStats({
    ...(approved?.stats || {}),
    ...(needsEdit?.stats || {}),
    ...(pending?.stats || {}),
  });
  const attentionQueue = enrichAdminQueue(
    dedupeAdminListings([...pendingListings, ...needsEditListings]),
  );
  const insights = buildAdminOperationalInsights(attentionQueue, stats);
  const successfulSources = [pending, approved, needsEdit].filter(
    (item) => item?.success,
  ).length;

  return {
    mode: "admin",
    page,
    admin: {
      display_name:
        cleanText(me.admin?.display_name, 100) ||
        cleanText(me.admin?.role_title, 100) ||
        "ادمین چاکود",
      role: cleanText(me.admin?.role, 80) || "admin",
      permissions,
    },
    operations: {
      stats,
      pending_total:
        toFiniteNumber(pending?.pagination?.total) ??
        stats.pending ??
        pendingListings.length,
      approved_total:
        toFiniteNumber(approved?.pagination?.total) ??
        stats.approved ??
        approvedListings.length,
      attention_queue: attentionQueue.slice(0, 30),
      recently_approved: approvedListings.slice(0, 12),
      insights,
      data_status:
        successfulSources === 3
          ? "ready"
          : successfulSources > 0
            ? "partial"
            : "unavailable",
    },
  };
}

function normalizePublicListing(
  value: PublicListingPayload,
): PublicListingContext | null {
  const id = toFiniteNumber(value.id);
  if (!id || id <= 0) return null;

  return {
    id,
    title: cleanText(value.title, 220) || `آگهی شماره ${id}`,
    brand:
      cleanText(value.brand, 100) || cleanText(value.brand_name, 100),
    model:
      cleanText(value.model, 100) || cleanText(value.model_name, 100),
    year: toFiniteNumber(value.production_year),
    mileage_km: toFiniteNumber(value.mileage_km),
    price_toman: toFiniteNumber(value.price_toman),
    location: [
      value.province || value.province_name,
      value.city || value.city_name,
      value.neighborhood,
    ]
      .map((item) => cleanText(item, 100))
      .filter(Boolean)
      .join("، "),
    body_status: cleanText(value.body_status, 100),
    transmission: cleanText(value.transmission, 100),
    fuel_type: cleanText(value.fuel_type, 100),
    seller_type: cleanText(value.seller_type, 80),
    views_count: toFiniteNumber(value.views_count),
    href: `/listing/${id}`,
  };
}

function normalizeAdminListings(values: AdminListingPayload[] | undefined) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value): AdminListingContext | null => {
      const id = toFiniteNumber(value.id);
      if (!id || id <= 0) return null;

      const createdAt = cleanText(value.created_at, 80);

      return {
        id,
        title: cleanText(value.title, 220) || `آگهی شماره ${id}`,
        status: cleanText(value.status, 60),
        moderation_status: cleanText(value.moderation_status, 80),
        risk_level: cleanText(value.moderation_risk_level, 40),
        risk_score: toFiniteNumber(value.moderation_score),
        moderation_reason: cleanText(value.moderation_reason, 500),
        owner_type: cleanText(value.listing_owner_type, 60),
        created_at: createdAt,
        age_days: ageInDays(createdAt),
        href: `/listing/${id}`,
        priority_score: 0,
        priority_reasons: [],
      };
    })
    .filter((item): item is AdminListingContext => item !== null);
}

function rankListings(listings: PublicListingContext[], message: string) {
  const normalizedMessage = normalizeAssistantText(message);
  const tokens = normalizedMessage
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 24);

  return [...listings].sort((a, b) => {
    const score = (item: PublicListingContext) => {
      const haystack = normalizeAssistantText(
        [
          item.title,
          item.brand,
          item.model,
          item.location,
          item.body_status,
          item.transmission,
          item.fuel_type,
        ].join(" "),
      );

      return tokens.reduce(
        (total, token) => total + (haystack.includes(token) ? 1 : 0),
        0,
      );
    };

    return score(b) - score(a);
  });
}

function sanitizeDetail(value: Record<string, unknown>) {
  const source =
    value.data && typeof value.data === "object" && !Array.isArray(value.data)
      ? (value.data as Record<string, unknown>)
      : value;
  const allowedKeys = [
    "id",
    "title",
    "brand",
    "brand_name",
    "model",
    "model_name",
    "trim_name",
    "production_year",
    "mileage_km",
    "price_toman",
    "price_is_negotiable",
    "body_condition",
    "body_status",
    "technical_condition",
    "engine_condition",
    "chassis_condition",
    "transmission",
    "fuel_type",
    "province",
    "province_name",
    "city",
    "city_name",
    "neighborhood",
    "description",
    "views_count",
    "favorite_count",
    "created_at",
    "updated_at",
    "seller_type",
    "dealer_verified",
    "dealer_is_verified",
  ];

  return Object.fromEntries(
    allowedKeys
      .filter((key) => source[key] !== undefined && source[key] !== null)
      .map((key) => [
        key,
        typeof source[key] === "string"
          ? cleanText(source[key], key === "description" ? 1_500 : 250)
          : source[key],
      ]),
  );
}

async function fetchJson<T>(
  url: string,
  timeoutMs: number,
  headers: Record<string, string> = { Accept: "application/json" },
) {
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
  return (await response.json()) as T;
}

function normalizeStats(value: Record<string, number | string> | undefined) {
  if (!value) return {};

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 40)
      .map(([key, raw]) => [key.slice(0, 80), toFiniteNumber(raw) ?? 0]),
  );
}

function ageInDays(value: string) {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function listingIdFromPath(path: string) {
  const match = path.match(/^\/listing\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

function cleanToken(value: string) {
  const token = String(value || "").trim();
  return token && token.length <= 4_096 ? token : "";
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function searchParamsFromIntent(intent: PublicSearchIntent) {
  const params = new URLSearchParams({
    segment: "all",
    limit: "24",
    page: "1",
    sort: intent.sort || "vip",
  });
  const values: Record<string, string | number | null> = {
    q: intent.q,
    province: intent.province,
    city: intent.city,
    brand: intent.brand,
    model: intent.model,
    min_price: intent.min_price,
    max_price: intent.max_price,
    min_year: intent.min_year,
    max_year: intent.max_year,
    max_mileage: intent.max_mileage,
    transmission: intent.transmission,
    fuel_type: intent.fuel_type,
    seller_type: intent.seller_type,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== "") params.set(key, String(value));
  });

  return params;
}

function dedupeListings(listings: PublicListingContext[]) {
  return Array.from(
    new Map(listings.map((listing) => [listing.id, listing])).values(),
  );
}

function dedupeAdminListings(listings: AdminListingContext[]) {
  return Array.from(
    new Map(listings.map((listing) => [listing.id, listing])).values(),
  );
}
