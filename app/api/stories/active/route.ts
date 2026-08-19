import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORY_PRODUCT_CODE = "listing_story";
const LOCAL_STORY_ID_BASE = 1_000_000_000;

type JsonObject = Record<string, unknown>;

function cleanText(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberValue(value: unknown) {
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

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای دیدن استوری‌های فعال وارد حساب شوید." }, 401);
  }

  const nowIso = new Date().toISOString();

  try {
    const rows = await getDb()
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

    const active = rows
      .map((row) => ({ row, data: parseMetadata(row.metadataJson) }))
      .filter(({ data }) => cleanText(data.expires_at, 60) > nowIso)
      .map(({ row, data }) => {
        const listingId = numberValue(data.listing_id);
        const publicStoryId = LOCAL_STORY_ID_BASE + row.id;
        return {
          story_id: row.id,
          public_story_id: publicStoryId,
          listing_id: listingId,
          title: cleanText(data.title, 180) || "آگهی خودرو",
          listing_owner_type: cleanText(data.listing_owner_type, 30) === "dealer" ? "dealer" : "personal",
          seller_display_name: cleanText(data.seller_display_name, 160),
          dealer_id: numberValue(data.dealer_id) || null,
          starts_at: cleanText(data.starts_at, 60),
          expires_at: cleanText(data.expires_at, 60),
          share_path: `/stories/${publicStoryId}?ref=double-story`,
        };
      });

    return jsonResponse({ success: true, count: active.length, data: active });
  } catch {
    return jsonResponse({ success: false, count: 0, data: [], message: "استوری‌های فعال دریافت نشدند." }, 500);
  }
}
