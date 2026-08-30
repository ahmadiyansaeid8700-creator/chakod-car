import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../db";
import { accountActivities, commerceOrders, featuredShowroomPlacements } from "../../../db/schema";
import { jsonResponse } from "../../../lib/chakod-auth-proxy";
import { PRELAUNCH_LISTINGS, PRELAUNCH_SHOWROOMS } from "../../../lib/prelaunch-fixtures";
import { prelaunchServerFixturesEnabled } from "../../../lib/prelaunch-server-fixtures";
import { getRuntimeEnv } from "../../../lib/runtime-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type ContentRow = {
  order_id: number;
  dealer_id: number;
  desktop_banner_url: string;
  mobile_banner_url: string;
  listing_ids_json: string;
  creative_status: string;
};

type LegacyPlacement = {
  id: number;
  dealer_id: number;
  dealer_name: string;
  province: string;
  start_date: string;
  end_date: string;
  status: string;
  approved_at: string | null;
};

const API_MEDIA_ORIGIN = "https://api.chakod.com";
const SITE_MEDIA_ORIGIN = "https://chakod.com";

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function cleanText(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function publicMediaUrl(value: unknown) {
  const raw = cleanText(value, 1200);
  if (!raw) return "";

  const normalizedRaw = raw.startsWith("//") ? `https:${raw}` : raw;
  if (/^https?:\/\//i.test(normalizedRaw)) {
    try {
      const url = new URL(normalizedRaw);
      const hostname = url.hostname.toLowerCase();
      if (url.protocol === "http:" && (hostname === "chakod.com" || hostname === "api.chakod.com")) {
        url.protocol = "https:";
      }
      if (hostname === "api.chakod.com" && url.pathname.startsWith("/uploads/")) {
        url.hostname = "chakod.com";
        url.protocol = "https:";
      }
      return url.toString();
    } catch {
      return normalizedRaw;
    }
  }

  const path = normalizedRaw.startsWith("/") ? normalizedRaw : `/${normalizedRaw}`;
  try {
    return new URL(path, path.startsWith("/uploads/") ? SITE_MEDIA_ORIGIN : API_MEDIA_ORIGIN).toString();
  } catch {
    return normalizedRaw;
  }
}

function parseIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map(safeId).filter(Boolean))).slice(0, 6);
  } catch {
    return [];
  }
}

async function loadContentRows() {
  try {
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
    const result = await d1
      .prepare(
        "SELECT order_id, dealer_id, desktop_banner_url, mobile_banner_url, listing_ids_json, creative_status FROM selected_showroom_content ORDER BY updated_at DESC LIMIT 200",
      )
      .all();
    return (result.results || []) as unknown as ContentRow[];
  } catch {
    return [];
  }
}

async function loadLegacyPlacements(today: string, province: string): Promise<LegacyPlacement[]> {
  try {
    const conditions = [
      inArray(featuredShowroomPlacements.status, ["approved", "scheduled", "active"]),
      lte(featuredShowroomPlacements.startDate, today),
      gte(featuredShowroomPlacements.endDate, today),
    ];
    if (province) conditions.push(eq(featuredShowroomPlacements.province, province));

    return await getDb()
      .select({
        id: featuredShowroomPlacements.id,
        dealer_id: featuredShowroomPlacements.dealerId,
        dealer_name: featuredShowroomPlacements.dealerName,
        province: featuredShowroomPlacements.province,
        start_date: featuredShowroomPlacements.startDate,
        end_date: featuredShowroomPlacements.endDate,
        status: featuredShowroomPlacements.status,
        approved_at: featuredShowroomPlacements.approvedAt,
      })
      .from(featuredShowroomPlacements)
      .where(and(...conditions))
      .orderBy(desc(featuredShowroomPlacements.approvedAt), desc(featuredShowroomPlacements.id))
      .limit(24);
  } catch {
    return [];
  }
}

function isSelectedShowroomOrder(
  order: { id: number; productCode: string },
  metadata: JsonObject,
  contentByOrderId: Map<number, ContentRow>,
) {
  if (order.productCode === "home_selected_showroom") return true;
  if (cleanText(metadata.placement_key, 60) === "showroom") return true;
  if (
    cleanText(metadata.target_type, 60) === "dealer" &&
    cleanText(metadata.public_product_code, 80) === "homepage_selected"
  ) {
    return true;
  }
  return contentByOrderId.has(order.id);
}

export async function GET(request: NextRequest) {
  const province = String(request.nextUrl.searchParams.get("province") || "").trim().slice(0, 80);
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  try {
    const [legacyRows, paidPromotionOrders, contentRows, dealerActivities] = await Promise.all([
      loadLegacyPlacements(today, province),
      getDb()
        .select()
        .from(commerceOrders)
        .where(
          and(
            eq(commerceOrders.orderType, "promotion"),
            eq(commerceOrders.status, "paid"),
          ),
        )
        .orderBy(desc(commerceOrders.id))
        .limit(200),
      loadContentRows(),
      getDb()
        .select({
          id: accountActivities.id,
          name: accountActivities.name,
          externalDealerId: accountActivities.externalDealerId,
          status: accountActivities.status,
        })
        .from(accountActivities)
        .where(eq(accountActivities.activityType, "dealer"))
        .limit(500),
    ]);

    const contentByOrderId = new Map(contentRows.map((item) => [Number(item.order_id), item]));
    const contentByDealerId = new Map<number, ContentRow>();
    for (const item of contentRows) {
      const dealerId = safeId(item.dealer_id);
      if (dealerId && !contentByDealerId.has(dealerId)) contentByDealerId.set(dealerId, item);
    }
    const activityById = new Map(dealerActivities.map((item) => [Number(item.id), item]));
    const seenSelectedDealers = new Set<number>();

    const selected = paidPromotionOrders.flatMap((order) => {
      const metadata = parseMetadata(order.metadataJson);
      if (!isSelectedShowroomOrder(order, metadata, contentByOrderId)) return [];

      const activityId = safeId(metadata.activity_id);
      const activity = activityId ? activityById.get(activityId) : null;
      if (
        activityId &&
        (!activity || activity.status !== "active" || !safeId(activity.externalDealerId))
      ) {
        return [];
      }

      const exactContent = contentByOrderId.get(order.id);
      const storedDealerId = safeId(metadata.dealer_id || metadata.target_id || exactContent?.dealer_id);
      const currentActivityDealerId = activityId ? safeId(activity?.externalDealerId) : 0;

      // A selected-showroom subscription is tied to the dealer that was selected at checkout.
      // If account reconciliation later proves that activity belongs to another dealer, the old
      // placement is stale and must disappear instead of being silently transferred.
      if (activityId && storedDealerId && storedDealerId !== currentActivityDealerId) return [];

      const dealerId = activityId ? currentActivityDealerId : storedDealerId;
      const content =
        exactContent && safeId(exactContent.dealer_id) === dealerId
          ? exactContent
          : contentByDealerId.get(dealerId);
      const startsAt = cleanText(metadata.starts_at, 60);
      const expiresAt = cleanText(metadata.expires_at, 60);
      const selectedProvince = cleanText(metadata.province, 80);

      if (!dealerId || !expiresAt || expiresAt <= nowIso) return [];
      if (startsAt && startsAt > nowIso) return [];
      if (province && selectedProvince && selectedProvince !== province) return [];
      if (seenSelectedDealers.has(dealerId)) return [];
      seenSelectedDealers.add(dealerId);

      const effectiveStartsAt = startsAt || order.createdAt || nowIso;

      return [
        {
          id: 1_000_000_000 + order.id,
          order_id: order.id,
          dealer_id: dealerId,
          dealer_name: cleanText(activity?.name) || cleanText(metadata.target_name) || `نمایشگاه ${dealerId}`,
          province: selectedProvince,
          start_date: effectiveStartsAt.slice(0, 10),
          end_date: expiresAt.slice(0, 10),
          status: "active",
          approved_at: effectiveStartsAt,
          desktop_banner_url: publicMediaUrl(content?.desktop_banner_url),
          mobile_banner_url: publicMediaUrl(content?.mobile_banner_url),
          listing_ids: content ? parseIds(content.listing_ids_json) : [],
          creative_status: content ? "published" : "none",
        },
      ];
    });

    const fixturePlacements = prelaunchServerFixturesEnabled()
      ? PRELAUNCH_SHOWROOMS
          .filter((showroom) => !province || showroom.province === province)
          .map((showroom, index) => ({
            id: 2_000_000_000 + Number(showroom.id),
            dealer_id: Number(showroom.id),
            dealer_name: showroom.name,
            province: showroom.province,
            start_date: today,
            end_date: "2099-12-31",
            status: "active",
            approved_at: nowIso,
            desktop_banner_url: showroom.cover_url,
            mobile_banner_url: showroom.cover_url,
            listing_ids: PRELAUNCH_LISTINGS
              .filter((listing) => Number(listing.dealer_id) === Number(showroom.id))
              .map((listing) => Number(listing.id))
              .slice(0, 3),
            creative_status: "published",
            fixture_order: index,
          }))
      : [];

    const merged = new Map<number, (typeof selected)[number] | (LegacyPlacement & {
      desktop_banner_url: string;
      mobile_banner_url: string;
      listing_ids: number[];
      creative_status: string;
    })>();

    fixturePlacements.forEach((item) => {
      if (!merged.has(item.dealer_id)) merged.set(item.dealer_id, item);
    });

    selected.forEach((item) => {
      merged.set(item.dealer_id, item);
    });

    legacyRows.forEach((item) => {
      if (!merged.has(item.dealer_id)) {
        merged.set(item.dealer_id, {
          ...item,
          desktop_banner_url: "",
          mobile_banner_url: "",
          listing_ids: [],
          creative_status: "legacy",
        });
      }
    });

    const response = jsonResponse({ success: true, data: Array.from(merged.values()).slice(0, 24) });
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return response;
  } catch {
    return jsonResponse(
      { success: false, message: "فهرست نمایشگاه های منتخب در دسترس نیست.", data: [] },
      503,
    );
  }
}
