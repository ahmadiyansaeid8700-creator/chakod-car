import { and, desc, eq, gt } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { storyPromotions } from "../../../../db/story-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: string | null, max = 120) {
  return String(value || "").trim().slice(0, max);
}

export async function GET(request: NextRequest) {
  const now = new Date().toISOString();
  const province = clean(request.nextUrl.searchParams.get("province"));
  const requestedCities = request.nextUrl.searchParams
    .getAll("cities[]")
    .map((item) => clean(item))
    .filter(Boolean);

  try {
    const rows = await getDb()
      .select()
      .from(storyPromotions)
      .where(and(eq(storyPromotions.status, "active"), gt(storyPromotions.expiresAt, now)))
      .orderBy(desc(storyPromotions.createdAt))
      .limit(80);

    const filtered = rows.filter((row) => {
      if (province && row.province !== province) return false;
      if (requestedCities.length > 0 && row.city && !requestedCities.includes(row.city)) return false;
      return true;
    });

    return Response.json(
      {
        success: true,
        count: filtered.length,
        data: filtered.map((row) => ({
          story_id: 1_000_000_000 + row.id,
          listing_id: row.listingId,
          title: row.title,
          brand: row.brand,
          model: row.model,
          year: row.year,
          price_toman: row.priceToman,
          province: row.province,
          city: row.city,
          neighborhood: row.neighborhood,
          listing_owner_type: row.listingOwnerType === "dealer" ? "dealer" : "personal",
          seller_display_name: row.sellerDisplayName,
          dealer_id: row.dealerId,
          story_owner_key: `staging:${row.ownerKey}`,
          cover_image: row.coverImageUrl
            ? { image_id: 1_000_000_000 + row.id, image_url: row.coverImageUrl }
            : null,
          media_type: "image",
          media_url: row.coverImageUrl || null,
          thumbnail_url: row.coverImageUrl || null,
          public_url: row.publicUrl,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { success: false, count: 0, data: [], message: "استوری‌های آزمایشی دریافت نشدند." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
