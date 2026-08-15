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
import { getFinanceOwnerKey } from "../../../../lib/finance-core";
import { getRuntimeEnv } from "../../../../lib/runtime-env";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCT_CODE = "home_selected_showroom";
const MAX_SELECTED_LISTINGS = 6;

type JsonObject = Record<string, unknown>;

type ManagedListing = {
  id: number;
  title: string;
  image: string;
  price_toman: number;
};

type ContentRow = {
  id: number;
  order_id: number;
  owner_key: string;
  dealer_id: number;
  desktop_banner_url: string;
  mobile_banner_url: string;
  listing_ids_json: string;
  creative_status: string;
  created_at: string;
  updated_at: string;
};

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, maxLength = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseListingIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map(safeId).filter(Boolean))).slice(0, MAX_SELECTED_LISTINGS);
  } catch {
    return [];
  }
}

function absoluteMediaUrl(value: unknown) {
  const raw = cleanText(value, 1200);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL(raw, authApiUrl("/")).toString();
  } catch {
    return raw;
  }
}

function imageFromListing(item: JsonObject) {
  const cover = item.cover_image;
  if (typeof cover === "string") return absoluteMediaUrl(cover);
  if (isRecord(cover)) return absoluteMediaUrl(cover.image_url || cover.url);

  const images = Array.isArray(item.images) ? item.images.filter(isRecord) : [];
  const preferred = images.find((image) => Boolean(image.is_cover)) || images[0];
  return preferred ? absoluteMediaUrl(preferred.image_url || preferred.url) : "";
}

async function ensureContentSchema() {
  const d1 = getRuntimeEnv().DB;
  await d1.prepare(`CREATE TABLE IF NOT EXISTS selected_showroom_content (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    order_id integer NOT NULL UNIQUE,
    owner_key text NOT NULL,
    dealer_id integer NOT NULL,
    desktop_banner_url text DEFAULT '' NOT NULL,
    mobile_banner_url text DEFAULT '' NOT NULL,
    listing_ids_json text DEFAULT '[]' NOT NULL,
    creative_status text DEFAULT 'pending' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`).run();
  await d1.prepare(
    "CREATE INDEX IF NOT EXISTS selected_showroom_content_owner_idx ON selected_showroom_content (owner_key, dealer_id)",
  ).run();
}

async function readUserId() {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return 0;
  return safeId(raw.user.id);
}

async function ownedDealer(userId: number, dealerId: number) {
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
  return activity && activity.status === "active" ? activity : null;
}

async function activeOrder(ownerKey: string, dealerId: number) {
  const rows = await getDb()
    .select()
    .from(commerceOrders)
    .where(
      and(
        eq(commerceOrders.ownerKey, ownerKey),
        eq(commerceOrders.orderType, "promotion"),
        eq(commerceOrders.productCode, PRODUCT_CODE),
        eq(commerceOrders.status, "paid"),
      ),
    )
    .orderBy(desc(commerceOrders.id))
    .limit(50);

  const now = Date.now();
  return (
    rows.find((order) => {
      const metadata = parseMetadata(order.metadataJson);
      if (safeId(metadata.dealer_id || metadata.target_id) !== dealerId) return false;
      const expiresAt = new Date(cleanText(metadata.expires_at, 80)).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    }) || null
  );
}

async function loadDealerListings(request: NextRequest, dealerId: number): Promise<ManagedListing[]> {
  const params = new URLSearchParams({
    page: "1",
    per_page: "100",
    status: "active",
    owner: "all",
    dealer_id: String(dealerId),
  });
  const response = await fetch(authApiUrl(`/api/dashboard-listings.php?${params.toString()}`), {
    method: "GET",
    cache: "no-store",
    headers: requestIdentityHeaders(request),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await parseJsonResponse(response);
  const data = Array.isArray(payload?.data) ? payload.data.filter(isRecord) : [];

  if (!response.ok || payload?.success !== true) return [];

  return data.flatMap((item) => {
    const id = safeId(item.id);
    if (!id) return [];
    const status = isRecord(item.status) ? cleanText(item.status.code, 30) : cleanText(item.status, 30);
    if (status && status.toLowerCase() !== "active") return [];
    return [
      {
        id,
        title: cleanText(item.title, 180) || `آگهی ${id}`,
        image: imageFromListing(item),
        price_toman: Math.max(0, Math.round(Number(item.price_toman || 0))),
      },
    ];
  });
}

async function loadContent(orderId: number) {
  await ensureContentSchema();
  return (await getRuntimeEnv().DB
    .prepare("SELECT * FROM selected_showroom_content WHERE order_id = ? LIMIT 1")
    .bind(orderId)
    .first()) as ContentRow | null;
}

async function contextForRequest(request: NextRequest, dealerId: number) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) return { error: jsonResponse({ success: false, message: "برای مدیریت منتخب وارد حساب شوید." }, 401) };

  const userId = await readUserId();
  if (!userId) return { error: jsonResponse({ success: false, message: "هویت حساب قابل بررسی نیست." }, 401) };

  const dealer = await ownedDealer(userId, dealerId);
  if (!dealer) return { error: jsonResponse({ success: false, message: "این نمایشگاه متعلق به حساب شما نیست یا فعال نیست." }, 403) };

  const order = await activeOrder(ownerKey, dealerId);
  if (!order) return { error: jsonResponse({ success: false, message: "جایگاه منتخب فعال برای این نمایشگاه پیدا نشد." }, 404) };

  return { ownerKey, dealer, order };
}

export async function GET(request: NextRequest) {
  const dealerId = safeId(request.nextUrl.searchParams.get("dealer_id"));
  if (!dealerId) return jsonResponse({ success: false, message: "شناسه نمایشگاه معتبر نیست." }, 400);

  try {
    const context = await contextForRequest(request, dealerId);
    if ("error" in context) return context.error;

    const [content, listings] = await Promise.all([
      loadContent(context.order.id),
      loadDealerListings(request, dealerId),
    ]);

    const savedIds = content ? parseListingIds(content.listing_ids_json) : [];
    const validIds = new Set(listings.map((listing) => listing.id));
    const selectedIds = savedIds.filter((id) => validIds.has(id));
    const defaults = selectedIds.length ? selectedIds : listings.slice(0, MAX_SELECTED_LISTINGS).map((listing) => listing.id);
    const metadata = parseMetadata(context.order.metadataJson);

    return jsonResponse({
      success: true,
      order_no: context.order.orderNo,
      expires_at: cleanText(metadata.expires_at, 80),
      dealer: {
        id: dealerId,
        name: context.dealer.name,
        province: context.dealer.province,
        city: context.dealer.city,
      },
      content: {
        desktop_banner_url: content?.desktop_banner_url || "",
        mobile_banner_url: content?.mobile_banner_url || "",
        listing_ids: defaults,
        creative_status: content?.creative_status || "pending",
        saved: Boolean(content),
      },
      listings,
      max_selected_listings: MAX_SELECTED_LISTINGS,
    });
  } catch {
    return jsonResponse({ success: false, message: "مدیریت محتوای منتخب فعلاً در دسترس نیست." }, 503);
  }
}

export async function PUT(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  let input: JsonObject;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات ویترین معتبر نیست." }, 400);
  }

  const dealerId = safeId(input.dealer_id);
  const desktopBannerUrl = cleanText(input.desktop_banner_url, 1200);
  const mobileBannerUrl = cleanText(input.mobile_banner_url, 1200);
  const requestedIds = Array.isArray(input.listing_ids)
    ? Array.from(new Set(input.listing_ids.map(safeId).filter(Boolean))).slice(0, MAX_SELECTED_LISTINGS)
    : [];

  if (!dealerId) return jsonResponse({ success: false, message: "شناسه نمایشگاه معتبر نیست." }, 400);
  if (!requestedIds.length) return jsonResponse({ success: false, message: "حداقل یک خودروی فعال برای ویترین انتخاب کنید." }, 422);

  try {
    const context = await contextForRequest(request, dealerId);
    if ("error" in context) return context.error;

    const listings = await loadDealerListings(request, dealerId);
    const validIds = new Set(listings.map((listing) => listing.id));
    if (requestedIds.some((id) => !validIds.has(id))) {
      return jsonResponse({ success: false, message: "یکی از خودروهای انتخاب‌شده دیگر فعال یا متعلق به این نمایشگاه نیست." }, 409);
    }

    await ensureContentSchema();
    const nowIso = new Date().toISOString();
    const creativeStatus = desktopBannerUrl || mobileBannerUrl ? "pending" : "none";
    await getRuntimeEnv().DB
      .prepare(`INSERT INTO selected_showroom_content (
        order_id, owner_key, dealer_id, desktop_banner_url, mobile_banner_url,
        listing_ids_json, creative_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        desktop_banner_url = excluded.desktop_banner_url,
        mobile_banner_url = excluded.mobile_banner_url,
        listing_ids_json = excluded.listing_ids_json,
        creative_status = excluded.creative_status,
        updated_at = excluded.updated_at`)
      .bind(
        context.order.id,
        context.ownerKey,
        dealerId,
        desktopBannerUrl,
        mobileBannerUrl,
        JSON.stringify(requestedIds),
        creativeStatus,
        nowIso,
        nowIso,
      )
      .run();

    return jsonResponse({
      success: true,
      message: "ویترین نمایشگاه منتخب ذخیره شد.",
      content: {
        desktop_banner_url: desktopBannerUrl,
        mobile_banner_url: mobileBannerUrl,
        listing_ids: requestedIds,
        creative_status: creativeStatus,
        saved: true,
      },
    });
  } catch {
    return jsonResponse({ success: false, message: "ذخیره ویترین منتخب کامل نشد." }, 503);
  }
}
