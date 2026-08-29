import { PRELAUNCH_LISTINGS } from "../../../lib/prelaunch-fixtures";
import { prelaunchServerFixturesEnabled } from "../../../lib/prelaunch-server-fixtures";

export const API_BASE = "https://api.chakod.com";
export const SITE_BASE = "https://chakod.com";

export type ListingImage = {
  id?: number | string;
  image_id?: number | string;
  image_url?: string | null;
  url?: string | null;
  is_cover?: boolean | number;
  sort_order?: number | string;
};

export type ListingData = {
  id: number;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  listing_owner_type?: string | null;
  seller_type?: string | null;
  seller_display_name?: string | null;
  seller_phone?: string | null;
  phone?: string | null;
  mobile?: string | null;
  contact_phone?: string | null;
  show_seller_name?: boolean | number | null;
  dealer_id?: number | string | null;
  dealer_name?: string | null;
  dealer_logo_url?: string | null;
  dealer_description?: string | null;
  dealer_is_verified?: boolean | number | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  category_name?: string | null;
  category_code?: string | null;
  plan_name?: string | null;
  plan_code?: string | null;
  is_highlighted?: boolean | number | null;
  show_on_home?: boolean | number | null;
  brand?: string | null;
  brand_name?: string | null;
  vehicle_brand?: string | null;
  model?: string | null;
  model_name?: string | null;
  vehicle_model?: string | null;
  trim_name?: string | null;
  production_year?: number | null;
  mileage_km?: number | null;
  price_toman?: number | null;
  price_is_negotiable?: boolean | number | null;
  gearbox?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  body_status?: string | null;
  body_condition?: string | null;
  technical_condition?: string | null;
  color?: string | null;
  body_color?: string | null;
  engine_condition?: string | null;
  chassis_condition?: string | null;
  insurance_months?: number | string | null;
  province?: string | null;
  province_name?: string | null;
  city?: string | null;
  city_name?: string | null;
  neighborhood?: string | null;
  location_label?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  views_count?: number | null;
  favorite_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  ai_quality_score?: number | string | null;
  ai_confidence?: number | string | null;
  cover_image?: string | ListingImage | null;
  images?: ListingImage[] | null;
  [key: string]: unknown;
};

export type ListingListResponse = {
  success: boolean;
  data?: ListingData[];
  listings?: ListingData[];
  message?: string;
};

export type ListingApiResponse = {
  success: boolean;
  message?: string;
  data?: ListingData;
  images?: ListingImage[];
};

export class ListingFetchError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ListingFetchError";
    this.status = status;
  }
}

function fixtureListingResponse(listingId: number): ListingApiResponse | null {
  if (!prelaunchServerFixturesEnabled()) return null;
  const fixture = PRELAUNCH_LISTINGS.find((item) => Number(item.id) === listingId);
  if (!fixture) return null;

  const data = fixture as unknown as ListingData;
  const images = Array.isArray(fixture.images)
    ? fixture.images as unknown as ListingImage[]
    : [{ image_url: String(fixture.cover_image || ""), is_cover: true, sort_order: 0 }];

  return {
    success: true,
    message: "Staging demo fixture",
    data: {
      ...data,
      show_seller_name: Boolean(fixture.dealer_id),
      seller_phone: null,
      phone: null,
      mobile: null,
      contact_phone: null,
      dealer_is_verified: Boolean(fixture.dealer_id),
      is_dealer_verified: Boolean(fixture.dealer_id),
      location_label: [fixture.city, fixture.neighborhood].filter(Boolean).join("، "),
      images,
    },
    images,
  };
}

export function normalizeAssetUrl(value?: string | null) {
  if (!value) return "";
  const url = String(value).trim();
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  if (normalized.startsWith("/uploads/")) return `${SITE_BASE}${normalized}`;
  return `${API_BASE}${normalized}`;
}

export function collectListingImages(response: ListingApiResponse) {
  const listing = response.data;
  const candidates: ListingImage[] = [
    ...(Array.isArray(response.images) ? response.images : []),
    ...(Array.isArray(listing?.images) ? listing.images : []),
  ];

  const cover = listing?.cover_image;
  if (typeof cover === "string" && cover.trim()) {
    candidates.unshift({
      id: `cover-${listing?.id}`,
      image_url: cover,
      is_cover: true,
      sort_order: -1,
    });
  } else if (cover && typeof cover === "object") {
    candidates.unshift({
      ...cover,
      id: cover.id ?? cover.image_id ?? `cover-${listing?.id}`,
      is_cover: true,
      sort_order: -1,
    });
  }

  const seen = new Set<string>();
  return candidates
    .map((item, index) => {
      const rawUrl = item.image_url || item.url || "";
      const imageUrl = normalizeAssetUrl(rawUrl);
      return {
        id: String(item.id ?? item.image_id ?? `${index}-${imageUrl}`),
        image_url: imageUrl,
        is_cover: Boolean(item.is_cover),
        sort_order: Number(item.sort_order ?? index),
      };
    })
    .filter((item) => {
      if (!item.image_url || seen.has(item.image_url)) return false;
      seen.add(item.image_url);
      return true;
    })
    .sort((a, b) => {
      if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
}

export async function fetchListingDetail(
  listingId: number,
  signal?: AbortSignal,
): Promise<ListingApiResponse> {
  const fixture = fixtureListingResponse(listingId);
  if (fixture) return fixture;

  const response = await fetch(
    `${API_BASE}/api/listing-detail.php?id=${encodeURIComponent(listingId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    },
  );

  const json = (await response.json().catch(() => null)) as ListingApiResponse | null;

  if (!json) {
    throw new ListingFetchError("پاسخ دریافتی از سرور معتبر نیست.", response.status);
  }

  if (!response.ok || !json.success || !json.data) {
    const fallback =
      response.status === 404
        ? json.message === "Listing is not available"
          ? "این آگهی هنوز تأیید و منتشر نشده است."
          : "آگهی موردنظر پیدا نشد."
        : "دریافت اطلاعات آگهی انجام نشد.";

    throw new ListingFetchError(json.message || fallback, response.status);
  }

  return json;
}

export async function fetchListingSummary(
  listingId: number,
  signal?: AbortSignal,
): Promise<ListingApiResponse> {
  const fixture = fixtureListingResponse(listingId);
  if (fixture) return fixture;

  const response = await fetch(
    `${API_BASE}/api/listings.php?limit=100&sort=vip`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    },
  );

  const json = (await response.json().catch(() => null)) as ListingListResponse | null;
  const items = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.listings)
      ? json.listings
      : [];
  const listing = items.find((item) => Number(item.id) === listingId);

  if (!response.ok || !json?.success || !listing) {
    throw new ListingFetchError(
      json?.message || "خلاصه آگهی در فهرست عمومی پیدا نشد.",
      response.status,
    );
  }

  return { success: true, data: listing };
}

export function mergeListingResponses(
  primary: ListingApiResponse,
  fallback: ListingApiResponse | null,
): ListingApiResponse {
  if (!primary.data || !fallback?.data) return primary;

  const primaryImages = Array.isArray(primary.data.images) ? primary.data.images : [];
  const fallbackImages = Array.isArray(fallback.data.images) ? fallback.data.images : [];

  return {
    ...fallback,
    ...primary,
    data: {
      ...fallback.data,
      ...primary.data,
      cover_image: primary.data.cover_image || fallback.data.cover_image || null,
      images: primaryImages.length > 0 ? primaryImages : fallbackImages,
    },
    images:
      Array.isArray(primary.images) && primary.images.length > 0
        ? primary.images
        : fallback.images,
  };
}
