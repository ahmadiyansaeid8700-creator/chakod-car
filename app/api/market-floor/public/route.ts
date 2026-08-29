import { and, desc, eq, gt, lte } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "../../../../db";
import { marketFloorEntries } from "../../../../db/schema";
import { MARKET_FLOOR_DURATION_HOURS, ensureMarketFloorSchema } from "../../../../lib/market-floor";
import {
  PRELAUNCH_MARKET_FLOOR,
  PRELAUNCH_SERVER_FIXTURES_ENABLED,
} from "../../../../lib/prelaunch-fixtures";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  await ensureMarketFloorSchema();
  const province = String(request.nextUrl.searchParams.get("province") || "").trim();
  const now = new Date().toISOString();
  const db = getDb();
  await db.update(marketFloorEntries).set({ status: "expired", updatedAt: now }).where(and(eq(marketFloorEntries.status, "active"), lte(marketFloorEntries.cycleEndsAt, now)));
  const where = province
    ? and(eq(marketFloorEntries.status, "active"), gt(marketFloorEntries.cycleEndsAt, now), eq(marketFloorEntries.province, province))
    : and(eq(marketFloorEntries.status, "active"), gt(marketFloorEntries.cycleEndsAt, now));
  const rows = await db.select().from(marketFloorEntries).where(where).orderBy(desc(marketFloorEntries.score)).limit(province ? 10 : 310);
  const liveRows = rows.map((row) => ({ ...row, listing: JSON.parse(row.listingSnapshotJson) }));
  const fixtures = PRELAUNCH_SERVER_FIXTURES_ENABLED
    ? PRELAUNCH_MARKET_FLOOR.filter((item) => !province || item.province === province)
    : [];
  const data = [...fixtures, ...liveRows];
  return Response.json(
    {
      success: true,
      duration_hours: MARKET_FLOOR_DURATION_HOURS,
      count: data.length,
      data,
      ...(PRELAUNCH_SERVER_FIXTURES_ENABLED ? { staging_demo: true } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
