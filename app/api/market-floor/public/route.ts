import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "../../../../db";
import { marketFloorEntries } from "../../../../db/schema";
import { marketFloorCycle } from "../../../../lib/market-floor";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const province = String(request.nextUrl.searchParams.get("province") || "").trim();
  const cycle = marketFloorCycle();
  const where = province
    ? and(eq(marketFloorEntries.status, "active"), eq(marketFloorEntries.cycleKey, cycle.key), eq(marketFloorEntries.province, province))
    : and(eq(marketFloorEntries.status, "active"), eq(marketFloorEntries.cycleKey, cycle.key));
  const rows = await getDb().select().from(marketFloorEntries).where(where).orderBy(desc(marketFloorEntries.score)).limit(province ? 10 : 310);
  return Response.json({ success: true, cycle, count: rows.length, data: rows.map((row) => ({ ...row, listing: JSON.parse(row.listingSnapshotJson) })) }, { headers: { "Cache-Control": "no-store" } });
}
