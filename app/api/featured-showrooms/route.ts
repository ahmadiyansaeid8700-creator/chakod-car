import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../db";
import { featuredShowroomPlacements } from "../../../db/schema";
import { jsonResponse } from "../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const province = String(request.nextUrl.searchParams.get("province") || "").trim().slice(0, 80);
  const today = new Date().toISOString().slice(0, 10);

  try {
    const conditions = [
      inArray(featuredShowroomPlacements.status, ["approved", "scheduled", "active"]),
      lte(featuredShowroomPlacements.startDate, today),
      gte(featuredShowroomPlacements.endDate, today),
    ];
    if (province) conditions.push(eq(featuredShowroomPlacements.province, province));

    const rows = await getDb()
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

    return jsonResponse({ success: true, data: rows });
  } catch {
    return jsonResponse(
      { success: false, message: "فهرست نمایشگاه های منتخب در دسترس نیست.", data: [] },
      503,
    );
  }
}
