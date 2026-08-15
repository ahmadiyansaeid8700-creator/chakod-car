import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { accountActivities, commerceOrders } from "../../../../db/schema";
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
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_COUPON = "SELECTED100";
const TEST_FALLBACK_PRICE_TOMAN = 100_000;
const TEST_FALLBACK_DURATION_DAYS = 7;
const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;

const PLACEMENTS = {
  showroom: {
    title: "نمایشگاه منتخب",
    productCode: "home_selected_showroom",
    serviceKey: "dealership_placement",
    targetType: "dealer",
    activityType: "dealer",
  },
  luxury: {
    title: "خودرو لوکس",
    productCode: "home_selected_luxury",
    serviceKey: "listing_featured",
    targetType: "listing",
    activityType: "",
  },
  freezone: {
    title: "خودرو منطقه آزاد",
    productCode: "home_selected_freezone",
    serviceKey: "listing_featured",
    targetType: "listing",
    activityType: "",
  },
  parts_store: {
    title: "منتخب لوازم یدکی",
    productCode: "home_selected_parts",
    serviceKey: "business_placement",
    targetType: "business",
    activityType: "parts_store",
  },
  repair_shop: {
    title: "تعمیرگاه منتخب",
    productCode: "home_selected_repair",
    serviceKey: "business_placement",
    targetType: "business",
    activityType: "repair_shop",
  },
  car_service: {
    title: "خدمات منتخب",
    productCode: "home_selected_services",
    serviceKey: "business_placement",
    targetType: "business",
    activityType: "car_service",
  },
} as const;

type PlacementKey = keyof typeof PLACEMENTS;
type JsonObject = Record<string, unknown>;

type ManagedListing = {
  id?: number;
  title?: string | null;
  brand?: string | null;
  brand_name?: string | null;
  model?: string | null;
  model_name?: string | null;
  price_toman?: string | number | null;
  category_code?: string | null;
  category_name?: string | null;
  market_segment?: string | null;
  province?: string | null;
  city?: string | null;
  status?: string | { code?: string } | null;
};

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function isPlacementKey(value: string): value is PlacementKey {
  return Object.prototype.hasOwnProperty.call(PLACEMENTS, value);
}

function isTestHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "staging.chakod.com" ||
    normalized === "localhost" ||
    normalized === "127.0.0.1"
  );
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function statusCode(listing: ManagedListing) {
  return typeof listing.status === "string"
    ? listing.status.trim().toLowerCase()
    : String(listing.status?.code || "").trim().toLowerCase();
}

function listingIsFreezone(listing: ManagedListing) {
  const text = normalizeText(
    [
      listing.market_segment,
      listing.category_code,
      listing.category_name,
      listing.title,
      listing.province,
      listing.city,
    ].join(" "),
  );
  return (
    normalizeText(listing.market_segment) === "freezone" ||
    ["freezone", "منطقهآزاد", "کیش", "قشم", "اروند", "انزلی", "ارس", "ماکو", "چابهار"].some(
      (term) => text.includes(normalizeText(term)),
    )
  );
}

function listingIsLuxury(listing: ManagedListing) {
  if (listingIsFreezone(listing)) return false;
  const text = normalizeText(
    `${listing.brand || listing.brand_name || ""} ${listing.model || listing.model_name || ""} ${listing.title || ""}`,
  );
  const luxuryTerms = [
    "porsche", "پورشه", "mercedesbenz", "مرسدسبنز", "bmw", "بیامو", "audi", "آئودی",
    "lexus", "لکسوس", "landrover", "لندرور", "rangerover", "رنجروور", "jaguar", "جگوار",
    "volvo", "ولوو", "maserati", "مازراتی", "ferrari", "فراری", "lamborghini", "لامبورگینی",
    "bentley", "بنتلی", "rollsroyce", "رولزرویس", "astonmartin", "استونمارتین", "mclaren", "مکلارن",
    "maybach", "مایباخ", "tesla", "تسلا", "genesis", "جنسیس", "infiniti", "اینفینیتی",
    "cadillac", "کادیلاک", "hongqi", "هونگچی", "tank", "تانک", "fownix", "فونیکس",
    "extreme", "اکستریم", "lucano", "لوکانو",
  ];
  return (
    normalizeText(listing.market_segment) === "luxury" ||
    normalizeText(listing.category_code) === "luxury" ||
    luxuryTerms.some((term) => text.includes(normalizeText(term))) ||
    Number(listing.price_toman || 0) >= 2_000_000_000
  );
}

async function loadOwnedListing(request: NextRequest, listingId: number) {
  const query = new URLSearchParams({ listing_id: String(listingId) });
  const response = await fetch(authApiUrl(`/api/listing-manage.php?${query.toString()}`), {
    method: "GET",
    cache: "no-store",
    headers: requestIdentityHeaders(request),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await parseJsonResponse(response);
  const listing = isRecord(payload?.listing) ? (payload.listing as ManagedListing) : null;

  if (!response.ok || payload?.success !== true || !listing || safeId(listing.id) !== listingId) {
    return { ok: false as const, status: response.status === 401 ? 401 : 404, message: "آگهی متعلق به این حساب پیدا نشد." };
  }
  if (statusCode(listing) !== "active") {
    return { ok: false as const, status: 409, message: "فقط آگهی فعال می‌تواند در بخش منتخب صفحه اول قرار بگیرد." };
  }
  return { ok: true as const, listing };
}

async function readUserId() {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return 0;
  return safeId(raw.user.id);
}

async function loadOwnedActivity(userId: number, targetId: number, expectedType: string) {
  const [activity] = await getDb()
    .select()
    .from(accountActivities)
    .where(and(eq(accountActivities.ownerUserId, userId), eq(accountActivities.id, targetId)))
    .limit(1);

  if (!activity || activity.activityType !== expectedType) return null;
  if (activity.status === "disabled") return null;
  return activity;
}

async function loadOwnedDealer(userId: number, dealerId: number) {
  const [activity] = await getDb()
    .select()
    .from(accountActivities)
    .where(
      and(
        eq(accountActivities.ownerUserId, userId),
        eq(accountActivities.activityType, "dealer"),
        eq(accountActivities.externalDealerId, dealerId),
      ),
    )
    .limit(1);
  if (!activity || activity.status === "disabled") return null;
  return activity;
}

function durationDays(service: JsonObject | null) {
  if (!service) return TEST_FALLBACK_DURATION_DAYS;
  const value = Math.max(1, Math.round(Number(service.duration_value || 0)));
  const unit = cleanText(service.duration_unit, 30).toLowerCase();
  if (!value) return TEST_FALLBACK_DURATION_DAYS;
  if (unit.includes("hour") || unit.includes("ساعت")) return Math.max(1, Math.ceil(value / 24));
  if (unit.includes("week") || unit.includes("هفته")) return value * 7;
  if (unit.includes("month") || unit.includes("ماه")) return value * 30;
  if (unit.includes("year") || unit.includes("سال")) return value * 365;
  return value;
}

async function loadPricing(request: NextRequest, serviceKey: string) {
  try {
    const response = await fetch(authApiUrl("/api/commerce.php"), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await parseJsonResponse(response);
    const services = Array.isArray(payload?.services) ? payload.services.filter(isRecord) : [];
    const service = services.find((item) => cleanText(item.service_key, 80) === serviceKey) || null;
    const amount = Math.round(Number(service?.amount_toman || 0));
    return {
      amountToman: Number.isSafeInteger(amount) && amount > 0 ? amount : TEST_FALLBACK_PRICE_TOMAN,
      durationDays: durationDays(service),
      serviceFound: Boolean(service),
    };
  } catch {
    return {
      amountToman: TEST_FALLBACK_PRICE_TOMAN,
      durationDays: TEST_FALLBACK_DURATION_DAYS,
      serviceFound: false,
    };
  }
}

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای رزرو بخش منتخب وارد حساب شوید." }, 401);
  }

  if (!isTestHost(request.nextUrl.hostname)) {
    return jsonResponse(
      {
        success: false,
        code: "test_checkout_only",
        message: "تخفیف ۱۰۰٪ منتخب فقط در Staging و localhost فعال است و روی Production اعمال نمی‌شود.",
      },
      409,
    );
  }

  let input: JsonObject;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات رزرو معتبر نیست." }, 400);
  }

  const placementKey = cleanText(input.placement_key, 40);
  const targetId = safeId(input.target_id);
  const idempotencyKey = cleanText(input.idempotency_key, 100);
  const discountCode = cleanText(input.discount_code, 40).toUpperCase();

  if (!isPlacementKey(placementKey)) {
    return jsonResponse({ success: false, message: "نوع جایگاه منتخب معتبر نیست." }, 400);
  }
  if (!targetId) {
    return jsonResponse({ success: false, message: "هدف جایگاه منتخب را انتخاب کنید." }, 400);
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه امن سفارش معتبر نیست." }, 400);
  }
  if (discountCode !== TEST_COUPON) {
    return jsonResponse(
      { success: false, message: "برای تست Staging کد تخفیف ۱۰۰٪ معتبر نیست." },
      402,
    );
  }

  const config = PLACEMENTS[placementKey];

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing) {
      if (existing.ownerKey !== ownerKey) {
        return jsonResponse({ success: false, message: "شناسه سفارش قابل استفاده نیست." }, 409);
      }
      return jsonResponse({
        success: true,
        reused: true,
        order: {
          order_no: existing.orderNo,
          original_amount_toman: existing.amountToman,
          discount_amount_toman: existing.discountToman,
          amount_toman: existing.finalAmountToman,
          status: existing.status,
          metadata: parseMetadata(existing.metadataJson),
        },
        checkout_url: `/account/payments/checkout/order/${encodeURIComponent(existing.orderNo)}`,
      });
    }

    const userId = await readUserId();
    if (!userId) {
      return jsonResponse({ success: false, message: "هویت حساب برای رزرو قابل بررسی نیست." }, 401);
    }

    let targetName = "";
    let listingId: number | null = null;
    let dealerId: number | null = null;
    let activityId: number | null = null;
    let businessType = "";

    if (config.targetType === "listing") {
      const owned = await loadOwnedListing(request, targetId);
      if (!owned.ok) return jsonResponse({ success: false, message: owned.message }, owned.status);

      if (placementKey === "luxury" && !listingIsLuxury(owned.listing)) {
        return jsonResponse({ success: false, message: "این آگهی در دسته خودرو لوکس صفحه اول قرار نمی‌گیرد." }, 409);
      }
      if (placementKey === "freezone" && !listingIsFreezone(owned.listing)) {
        return jsonResponse({ success: false, message: "این آگهی در دسته خودرو منطقه آزاد صفحه اول قرار نمی‌گیرد." }, 409);
      }

      listingId = targetId;
      targetName = cleanText(owned.listing.title, 180) || `آگهی ${targetId}`;
    } else if (config.targetType === "dealer") {
      const activity = await loadOwnedDealer(userId, targetId);
      if (!activity) {
        return jsonResponse({ success: false, message: "این نمایشگاه در فهرست مجموعه‌های قابل مدیریت شما نیست." }, 403);
      }
      dealerId = targetId;
      activityId = activity.id;
      businessType = "dealer";
      targetName = activity.name;
    } else {
      const activity = await loadOwnedActivity(userId, targetId, config.activityType);
      if (!activity) {
        return jsonResponse({ success: false, message: "این کسب‌وکار برای جایگاه انتخاب‌شده قابل استفاده نیست." }, 403);
      }
      activityId = activity.id;
      businessType = activity.activityType;
      targetName = activity.name;
    }

    const pricing = await loadPricing(request, config.serviceKey);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + pricing.durationDays * 86_400_000);
    const nowIso = now.toISOString();
    const metadata = {
      source: "selected_checkout",
      public_product_code: "homepage_selected",
      service_title: config.title,
      placement_key: placementKey,
      target_type: config.targetType,
      target_id: targetId,
      target_name: targetName,
      listing_id: listingId,
      dealer_id: dealerId,
      activity_id: activityId,
      business_type: businessType,
      underlying_service_key: config.serviceKey,
      pricing_source: pricing.serviceFound ? "commerce" : "staging_fallback",
      duration_days: pricing.durationDays,
      coupon_code: TEST_COUPON,
      test_discount_percent: 100,
      starts_at: nowIso,
      expires_at: expiresAt.toISOString(),
    };

    const [order] = await db
      .insert(commerceOrders)
      .values({
        orderNo: createPublicReference("SEL"),
        idempotencyKey,
        ownerKey,
        orderType: "promotion",
        productCode: config.productCode,
        amountToman: pricing.amountToman,
        discountToman: pricing.amountToman,
        finalAmountToman: 0,
        currency: "TOMAN",
        status: "paid",
        metadataJson: JSON.stringify(metadata),
        updatedAt: nowIso,
      })
      .returning();

    return jsonResponse(
      {
        success: true,
        reused: false,
        message: `${config.title} با تخفیف تست ۱۰۰٪ فعال شد.`,
        order: {
          order_no: order.orderNo,
          original_amount_toman: order.amountToman,
          discount_amount_toman: order.discountToman,
          amount_toman: order.finalAmountToman,
          status: order.status,
          metadata,
        },
        checkout_url: `/account/payments/checkout/order/${encodeURIComponent(order.orderNo)}`,
      },
      201,
    );
  } catch {
    return jsonResponse({ success: false, message: "فعال‌سازی جایگاه منتخب کامل نشد." }, 503);
  }
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده جایگاه‌های منتخب وارد حساب شوید." }, 401);
  }

  try {
    const rows = await getDb()
      .select()
      .from(commerceOrders)
      .where(and(eq(commerceOrders.ownerKey, ownerKey), eq(commerceOrders.orderType, "promotion")))
      .orderBy(desc(commerceOrders.id))
      .limit(100);

    const products = new Set(Object.values(PLACEMENTS).map((item) => item.productCode));
    const orders = rows
      .filter((row) => products.has(row.productCode as (typeof PLACEMENTS)[PlacementKey]["productCode"]))
      .map((row) => ({
        order_no: row.orderNo,
        product_code: row.productCode,
        original_amount_toman: row.amountToman,
        discount_amount_toman: row.discountToman,
        amount_toman: row.finalAmountToman,
        status: row.status,
        metadata: parseMetadata(row.metadataJson),
      }));

    return jsonResponse({
      success: true,
      test_coupon: isTestHost(request.nextUrl.hostname) ? TEST_COUPON : "",
      test_discount_percent: isTestHost(request.nextUrl.hostname) ? 100 : 0,
      orders,
    });
  } catch {
    return jsonResponse({ success: false, message: "جایگاه‌های منتخب در دسترس نیستند." }, 503);
  }
}
