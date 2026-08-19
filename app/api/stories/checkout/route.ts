import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";
import {
  createPublicReference,
  getFinanceOwnerKey,
} from "../../../../lib/finance-core";
import {
  getInstagramStoryCapacitySnapshot,
  instagramStoryEligibility,
  syncInstagramStoryCandidate,
} from "../../../../lib/instagram-story-publishing";
import {
  isUsableListingPhone,
  normalizeListingPhone,
} from "../../../../lib/listing-publication-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORY_TRIAL_PRICE_TOMAN = 100_000;
const STORY_TEST_COUPON = "STORY100";
const STORY_DURATION_HOURS = 24;
const MAX_ACTIVE_STORIES_PER_OWNER = 10;
const STORY_PRODUCT_CODE = "listing_story";
const LOCAL_STORY_ID_BASE = 1_000_000_000;

type JsonObject = Record<string, unknown>;

type ManagedListing = {
  id?: number;
  title?: string | null;
  brand?: string | null;
  brand_name?: string | null;
  model?: string | null;
  model_name?: string | null;
  year?: string | number | null;
  production_year?: string | number | null;
  price_toman?: string | number | null;
  province?: string | null;
  province_name?: string | null;
  city?: string | null;
  city_name?: string | null;
  neighborhood?: string | null;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string | null;
  dealer_id?: number | null;
  status?: string | { code?: string } | null;
  cover_image?: { image_url?: string | null } | null;
  images?: Array<{ image_url?: string | null; is_cover?: boolean }>;
};

function cleanText(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validListingId(value: unknown) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function statusCode(listing: ManagedListing) {
  if (typeof listing.status === "string") return listing.status.trim().toLowerCase();
  return String(listing.status?.code || "").trim().toLowerCase();
}

function numericValue(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : {};
  } catch {
    return {};
  }
}

function isLiveStoryMetadata(metadata: JsonObject, nowIso: string) {
  return cleanText(metadata.expires_at, 60) > nowIso;
}

function isTestCouponHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "staging.chakod.com" || normalized === "localhost" || normalized === "127.0.0.1";
}

function quoteStory(request: NextRequest, code: string) {
  const normalized = code.trim().toUpperCase();
  const valid = normalized === STORY_TEST_COUPON && isTestCouponHost(request.nextUrl.hostname);
  const discount = valid ? STORY_TRIAL_PRICE_TOMAN : 0;
  return {
    coupon_code: normalized,
    coupon_valid: valid,
    original_amount_toman: STORY_TRIAL_PRICE_TOMAN,
    discount_amount_toman: discount,
    final_amount_toman: STORY_TRIAL_PRICE_TOMAN - discount,
    coupon_message: !normalized
      ? ""
      : valid
        ? "کد تست استوری اعمال شد؛ این استوری رایگان فعال می‌شود."
        : "کد تخفیف معتبر نیست یا برای این محیط قابل استفاده نیست.",
  };
}

function publicListingPhone(data: JsonObject) {
  const raw =
    cleanText(data.contact_phone, 80)
    || cleanText(data.seller_phone, 80)
    || cleanText(data.phone, 80)
    || cleanText(data.mobile, 80);
  return normalizeListingPhone(raw);
}

async function verifyPublicListingReady(listingId: number) {
  const response = await fetch(
    authApiUrl(`/api/listing-detail.php?id=${encodeURIComponent(String(listingId))}`),
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    },
  );
  const payload = (await parseJsonResponse(response)) as JsonObject | null;
  const data = payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? (payload.data as JsonObject)
    : null;

  return Boolean(
    response.ok
    && payload?.success === true
    && data
    && isUsableListingPhone(publicListingPhone(data)),
  );
}

async function loadOwnedActiveListing(request: NextRequest, listingId: number) {
  const query = new URLSearchParams({ listing_id: String(listingId) });
  const response = await fetch(authApiUrl(`/api/listing-manage.php?${query.toString()}`), {
    method: "GET",
    cache: "no-store",
    headers: requestIdentityHeaders(request),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await parseJsonResponse(response)) as JsonObject | null;

  if (!response.ok || !payload || payload.success !== true) {
    return { error: "آگهی متعلق به این حساب پیدا نشد.", status: response.status === 401 ? 401 : 404 } as const;
  }

  const access = payload.access && typeof payload.access === "object" && !Array.isArray(payload.access)
    ? (payload.access as JsonObject)
    : null;
  if (access?.can_manage === false || access?.can_view === false) {
    return { error: "اجازه ساخت استوری برای این آگهی را ندارید.", status: 403 } as const;
  }

  const listing = payload.listing && typeof payload.listing === "object" && !Array.isArray(payload.listing)
    ? (payload.listing as ManagedListing)
    : null;
  if (!listing || validListingId(listing.id) !== listingId) {
    return { error: "اطلاعات آگهی معتبر نیست.", status: 404 } as const;
  }

  if (statusCode(listing) !== "active") {
    return { error: "فقط آگهی فعال می‌تواند استوری شود.", status: 409 } as const;
  }

  const publicReady = await verifyPublicListingReady(listingId);
  if (!publicReady) {
    return {
      error: "این آگهی هنوز برای نمایش عمومی کامل نیست. ابتدا اطلاعات تماس آگهی را کامل کن، سپس دبل استوری بساز.",
      status: 409,
    } as const;
  }

  return { listing } as const;
}

function previewPayload(listing: ManagedListing) {
  const images = Array.isArray(listing.images) ? listing.images : [];
  const cover = cleanText(
    listing.cover_image?.image_url || images.find((item) => item.is_cover)?.image_url || images[0]?.image_url,
    1000,
  );

  return {
    id: validListingId(listing.id),
    title: cleanText(listing.title, 180) || "آگهی خودرو",
    brand: cleanText(listing.brand || listing.brand_name, 100),
    model: cleanText(listing.model || listing.model_name, 100),
    year: cleanText(String(listing.year || listing.production_year || ""), 20),
    price_toman: numericValue(listing.price_toman),
    province: cleanText(listing.province || listing.province_name, 100),
    city: cleanText(listing.city || listing.city_name, 100),
    neighborhood: cleanText(listing.neighborhood, 120),
    listing_owner_type: listing.listing_owner_type === "dealer" ? "dealer" : "personal",
    seller_display_name: cleanText(listing.seller_display_name, 160),
    dealer_id: validListingId(listing.dealer_id) || null,
    cover_image_url: cover,
    public_url: `/cars/${validListingId(listing.id)}`,
  };
}

async function instagramPreview(listing: ReturnType<typeof previewPayload>) {
  const eligibility = instagramStoryEligibility(listing.price_toman, listing.cover_image_url);
  try {
    return {
      ...eligibility,
      capacity: await getInstagramStoryCapacitySnapshot(),
    };
  } catch {
    return {
      ...eligibility,
      capacity: null,
    };
  }
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) return jsonResponse({ success: false, message: "برای ساخت استوری وارد حساب شوید." }, 401);

  const listingId = validListingId(request.nextUrl.searchParams.get("listing_id"));
  if (!listingId) return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);

  try {
    const owned = await loadOwnedActiveListing(request, listingId);
    if ("error" in owned) return jsonResponse({ success: false, message: owned.error }, owned.status);

    const listing = previewPayload(owned.listing);
    const quote = quoteStory(request, request.nextUrl.searchParams.get("discount_code") || "");
    return jsonResponse({
      success: true,
      listing,
      pricing: quote,
      instagram: await instagramPreview(listing),
      duration_hours: STORY_DURATION_HOURS,
      test_coupon_available: isTestCouponHost(request.nextUrl.hostname),
    });
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس آگهی برقرار نشد." }, 502);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) return jsonResponse({ success: false, message: "برای ساخت استوری وارد حساب شوید." }, 401);

  let input: JsonObject;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : {};
  } catch {
    return jsonResponse({ success: false, message: "درخواست استوری معتبر نیست." }, 400);
  }

  const listingId = validListingId(input.listing_id);
  if (!listingId) return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);

  const quote = quoteStory(request, cleanText(input.discount_code, 40));
  if (!quote.coupon_valid || quote.final_amount_toman !== 0) {
    return jsonResponse(
      {
        success: false,
        code: "payment_required",
        message: "برای نسخه آزمایشی، کد رایگان استوری را وارد کنید. پرداخت آنلاین در مرحله بعد به همین صفحه متصل می‌شود.",
        pricing: quote,
      },
      402,
    );
  }

  try {
    const owned = await loadOwnedActiveListing(request, listingId);
    if ("error" in owned) return jsonResponse({ success: false, message: owned.error }, owned.status);

    const listing = previewPayload(owned.listing);
    const db = getDb();
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + STORY_DURATION_HOURS * 60 * 60 * 1000).toISOString();

    const storyOrders = await db
      .select()
      .from(commerceOrders)
      .where(
        and(
          eq(commerceOrders.ownerKey, ownerKey),
          eq(commerceOrders.orderType, "promotion"),
          eq(commerceOrders.productCode, STORY_PRODUCT_CODE),
          eq(commerceOrders.status, "paid"),
        ),
      )
      .orderBy(desc(commerceOrders.id))
      .limit(50);

    const liveOrders = storyOrders.filter((order) => isLiveStoryMetadata(parseMetadata(order.metadataJson), nowIso));
    const existing = liveOrders.find((order) => Number(parseMetadata(order.metadataJson).listing_id || 0) === listingId);

    const metadata = {
      source: "story_checkout",
      service_key: STORY_PRODUCT_CODE,
      listing_id: listing.id,
      title: listing.title,
      brand: listing.brand,
      model: listing.model,
      year: listing.year,
      price_toman: listing.price_toman,
      province: listing.province,
      city: listing.city,
      neighborhood: listing.neighborhood,
      listing_owner_type: listing.listing_owner_type,
      seller_display_name: listing.seller_display_name,
      dealer_id: listing.dealer_id,
      cover_image_url: listing.cover_image_url,
      public_url: listing.public_url,
      public_ready: true,
      coupon_code: quote.coupon_code,
      starts_at: nowIso,
      expires_at: expiresAt,
    };

    let storyId = existing?.id || 0;
    if (existing) {
      await db
        .update(commerceOrders)
        .set({
          amountToman: quote.original_amount_toman,
          discountToman: quote.discount_amount_toman,
          finalAmountToman: quote.final_amount_toman,
          metadataJson: JSON.stringify(metadata),
          updatedAt: nowIso,
        })
        .where(eq(commerceOrders.id, existing.id));
    } else {
      if (liveOrders.length >= MAX_ACTIVE_STORIES_PER_OWNER) {
        return jsonResponse(
          { success: false, message: "هر حساب هم‌زمان حداکثر ۱۰ استوری فعال می‌تواند داشته باشد." },
          409,
        );
      }

      const [created] = await db
        .insert(commerceOrders)
        .values({
          orderNo: createPublicReference("STR"),
          idempotencyKey: createPublicReference("STI"),
          ownerKey,
          orderType: "promotion",
          productCode: STORY_PRODUCT_CODE,
          amountToman: quote.original_amount_toman,
          discountToman: quote.discount_amount_toman,
          finalAmountToman: quote.final_amount_toman,
          currency: "TOMAN",
          status: "paid",
          metadataJson: JSON.stringify(metadata),
          updatedAt: nowIso,
        })
        .returning({ id: commerceOrders.id });
      storyId = created?.id || 0;
    }

    if (!storyId) {
      return jsonResponse({ success: false, message: "شناسه استوری ساخته نشد. دوباره تلاش کنید." }, 500);
    }

    const publicStoryId = LOCAL_STORY_ID_BASE + storyId;
    const sharePath = `/stories/${publicStoryId}?ref=double-story`;
    const shareUrl = new URL(sharePath, request.nextUrl.origin).toString();
    const eligibility = instagramStoryEligibility(listing.price_toman, listing.cover_image_url);

    let instagram: Record<string, unknown> = {
      ...eligibility,
      queue_status: eligibility.eligible ? "queue_unavailable" : "ineligible",
    };
    try {
      instagram = await syncInstagramStoryCandidate({
        storyOrderId: storyId,
        ownerKey,
        listingId: listing.id,
        priceToman: listing.price_toman,
        title: listing.title,
        imageUrl: listing.cover_image_url,
        publicUrl: shareUrl,
        sourceExpiresAt: expiresAt,
      });
    } catch {
      // Instagram is an optional distribution channel. A queue outage must not undo a paid Chakod story.
    }

    return jsonResponse({
      success: true,
      story_id: storyId,
      public_story_id: publicStoryId,
      share_path: sharePath,
      share_url: shareUrl,
      message: "دبل استوری فعال شد؛ حالا لینک عمومی آن را هرجا خواستی منتشر کن.",
      expires_at: expiresAt,
      pricing: quote,
      instagram,
    });
  } catch {
    return jsonResponse({ success: false, message: "فعال‌سازی استوری انجام نشد. دوباره تلاش کنید." }, 500);
  }
}
