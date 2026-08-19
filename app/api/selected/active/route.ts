import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCT_CODES = [
  "home_selected_showroom",
  "home_selected_luxury",
  "home_selected_freezone",
  "home_selected_parts",
  "home_selected_repair",
  "home_selected_services",
] as const;

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

function text(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function id(value: unknown) {
  const number = Math.round(Number(value || 0));
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

export async function GET() {
  const nowIso = new Date().toISOString();

  try {
    const rows = await getDb()
      .select()
      .from(commerceOrders)
      .where(
        and(
          eq(commerceOrders.orderType, "promotion"),
          eq(commerceOrders.status, "paid"),
          inArray(commerceOrders.productCode, [...PRODUCT_CODES]),
        ),
      )
      .orderBy(desc(commerceOrders.id))
      .limit(200);

    const seen = new Set<string>();
    const data = rows.flatMap((row) => {
      const metadata = parseMetadata(row.metadataJson);
      const startsAt = text(metadata.starts_at, 60);
      const expiresAt = text(metadata.expires_at, 60);
      if (!startsAt || !expiresAt || startsAt > nowIso || expiresAt <= nowIso) return [];

      const placementKey = text(metadata.placement_key, 40);
      const targetId = id(metadata.target_id);
      const targetName = text(metadata.target_name, 180);
      if (!placementKey || (!targetId && !targetName)) return [];

      const identity = `${placementKey}:${targetId || targetName}`;
      if (seen.has(identity)) return [];
      seen.add(identity);

      return [
        {
          order_no: row.orderNo,
          placement_key: placementKey,
          target_type: text(metadata.target_type, 40),
          target_id: targetId || null,
          target_name: targetName,
          listing_id: id(metadata.listing_id) || null,
          dealer_id: id(metadata.dealer_id) || null,
          activity_id: id(metadata.activity_id) || null,
          business_type: text(metadata.business_type, 40),
          starts_at: startsAt,
          expires_at: expiresAt,
        },
      ];
    });

    return jsonResponse({ success: true, data });
  } catch {
    return jsonResponse(
      { success: false, message: "جایگاه‌های منتخب فعال در دسترس نیستند.", data: [] },
      503,
    );
  }
}
