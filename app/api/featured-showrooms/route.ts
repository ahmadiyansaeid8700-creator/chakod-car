import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../db";
import { commerceOrders, featuredShowroomPlacements } from "../../../db/schema";
import { jsonResponse } from "../../../lib/chakod-auth-proxy";
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

export async function GET(request: NextRequest) {
  const province = String(request.nextUrl.searchParams.get("province") || "").trim().slice(0, 80);
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  try {
    const [legacyRows, selectedOrders, contentRows] = await Promise.all([
      loadLegacyPlacements(today, province),
      getDb()
        .select()
        .from(commerceOrders)
        .where(
          and(
            eq(commerceOrders.orderType, "promotion"),
            eq(commerceOrders.productCode, "home_selected_showroom"),
            eq(commerceOrders.status, "paid"),
          ),
        )
        .orderBy(desc(commerceOrders.id))
        .limit(100),
      loadContentRows(),
    ]);

    const contentByOrderId = new Map(contentRows.map((item) => [Number(item.order_id), item]));
    const seenSelectedDealers = new Set<number>();

    const selected = selectedOrders.flatMap((order) => {
      const metadata = parseMetadata(order.metadataJson);
      const dealerId = safeId(metadata.dealer_id || metadata.target_id);
      const startsAt = cleanText(metadata.starts_at, 60);
      const expiresAt = cleanText(metadata.expires_at, 60);
      const selectedProvince = cleanText(metadata.province, 80);

      // Older selected-showroom orders were created before starts_at was persisted.
      // A paid order with a future expires_at is already active unless an explicit
      // future starts_at exists. This keeps previously purchased placements visible
      // without requiring the owner to buy the placement again.
      if (!dealerId || !expiresAt || expiresAt <= nowIso) return [];
      if (startsAt && startsAt > nowIso) return [];
      if (province && selectedProvince && selectedProvince !== province) return [];
      if (seenSelectedDealers.has(dealerId)) return [];
      seenSelectedDealers.add(dealerId);

      const content = contentByOrderId.get(order.id);
      const effectiveStartsAt = startsAt || nowIso;

      return [
        {
          id: 1_000_000_000 + order.id,
          order_id: order.id,
          dealer_id: dealerId,
          dealer_name: cleanText(metadata.target_name) || `نمایشگاه ${dealerId}`,
          province: selectedProvince,
          start_date: effectiveStartsAt.slice(0, 10),
          end_date: expiresAt.slice(0, 10),
          status: "active",
          approved_at: effectiveStartsAt,
          desktop_banner_url: cleanText(content?.desktop_banner_url, 1200),
          mobile_banner_url: cleanText(content?.mobile_banner_url, 1200),
          listing_ids: content ? parseIds(content.listing_ids_json) : [],
          creative_status: content ? "published" : "none",
        },
      ];
    });

    const merged = new Map<number, (typeof selected)[number] | (LegacyPlacement & {
      desktop_banner_url: string;
      mobile_banner_url: string;
      listing_ids: number[];
      creative_status: string;
    })>();

    selected.forEach((item) => {
      if (!merged.has(item.dealer_id)) merged.set(item.dealer_id, item);
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

    return jsonResponse({ success: true, data: Array.from(merged.values()).slice(0, 24) });
  } catch {
    return jsonResponse(
      { success: false, message: "فهرست نمایشگاه های منتخب در دسترس نیست.", data: [] },
      503,
    );
  }
}
