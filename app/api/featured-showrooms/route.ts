import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../db";
import { commerceOrders, featuredShowroomPlacements } from "../../../db/schema";
import { jsonResponse } from "../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

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

export async function GET(request: NextRequest) {
  const province = String(request.nextUrl.searchParams.get("province") || "").trim().slice(0, 80);
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  try {
    const db = getDb();
    const conditions = [
      inArray(featuredShowroomPlacements.status, ["approved", "scheduled", "active"]),
      lte(featuredShowroomPlacements.startDate, today),
      gte(featuredShowroomPlacements.endDate, today),
    ];
    if (province) conditions.push(eq(featuredShowroomPlacements.province, province));

    const [rows, selectedOrders] = await Promise.all([
      db
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
        .limit(24),
      db
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
    ]);

    const selected = selectedOrders.flatMap((order) => {
      const metadata = parseMetadata(order.metadataJson);
      const dealerId = safeId(metadata.dealer_id || metadata.target_id);
      const startsAt = cleanText(metadata.starts_at, 60);
      const expiresAt = cleanText(metadata.expires_at, 60);
      const selectedProvince = cleanText(metadata.province, 80);
      if (!dealerId || !startsAt || !expiresAt || startsAt > nowIso || expiresAt <= nowIso) return [];
      if (province && selectedProvince && selectedProvince !== province) return [];

      return [
        {
          id: 1_000_000_000 + order.id,
          dealer_id: dealerId,
          dealer_name: cleanText(metadata.target_name) || `نمایشگاه ${dealerId}`,
          province: selectedProvince,
          start_date: startsAt.slice(0, 10),
          end_date: expiresAt.slice(0, 10),
          status: "active",
          approved_at: startsAt,
        },
      ];
    });

    const merged = new Map<number, (typeof selected)[number] | (typeof rows)[number]>();
    selected.forEach((item) => {
      if (!merged.has(item.dealer_id)) merged.set(item.dealer_id, item);
    });
    rows.forEach((item) => {
      if (!merged.has(item.dealer_id)) merged.set(item.dealer_id, item);
    });

    return jsonResponse({ success: true, data: Array.from(merged.values()).slice(0, 24) });
  } catch {
    return jsonResponse(
      { success: false, message: "فهرست نمایشگاه های منتخب در دسترس نیست.", data: [] },
      503,
    );
  }
}
