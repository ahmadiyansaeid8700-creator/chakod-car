import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import { PRELAUNCH_STORIES } from "../../../../lib/prelaunch-fixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORY_PRODUCT_CODE = "listing_story";
const LOCAL_STORY_ID_BASE = 1_000_000_000;

type JsonObject = Record<string, unknown>;

function clean(value: unknown, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function numberValue(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function metadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : {};
  } catch {
    return {};
  }
}

function publicOwnerKey(ownerKey: string) {
  return createHash("sha256")
    .update(`chakod-story-owner:${ownerKey}`)
    .digest("hex")
    .slice(0, 24);
}

function listingPublicUrl(value: unknown, listingId: number) {
  if (!listingId) return "/cars";
  const current = clean(value, 500);
  if (!current || /^\/cars\/\d+(?:[/?#]|$)/i.test(current)) {
    return `/listing/${listingId}`;
  }
  return current;
}

export async function GET(request: NextRequest) {
  const fixturesEnabled = process.env.PRELAUNCH_FIXTURES === "true";
  const now = new Date().toISOString();
  const province = clean(request.nextUrl.searchParams.get("province"));
  const requestedCities = request.nextUrl.searchParams
    .getAll("cities[]")
    .map((item) => clean(item))
    .filter(Boolean);
  const requestedStoryId = numberValue(request.nextUrl.searchParams.get("story_id"));
  const requestedOrderId = requestedStoryId >= LOCAL_STORY_ID_BASE
    ? requestedStoryId - LOCAL_STORY_ID_BASE
    : 0;

  const fixtureStories = fixturesEnabled
    ? PRELAUNCH_STORIES.filter((story) => {
        if (requestedStoryId > 0 && Number(story.story_id) !== requestedStoryId) return false;
        if (province && clean(story.province) !== province) return false;
        if (requestedCities.length > 0 && story.city && !requestedCities.includes(clean(story.city))) return false;
        return !story.expires_at || story.expires_at > now;
      })
    : [];

  if (requestedStoryId > 0 && fixtureStories.length > 0) {
    return Response.json(
      { success: true, count: fixtureStories.length, data: fixtureStories },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (requestedStoryId > 0 && requestedOrderId <= 0) {
    return Response.json(
      { success: false, count: 0, data: [], message: "شناسه استوری معتبر نیست." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const baseWhere = and(
      eq(commerceOrders.orderType, "promotion"),
      eq(commerceOrders.productCode, STORY_PRODUCT_CODE),
      eq(commerceOrders.status, "paid"),
    );

    const rows = requestedOrderId > 0
      ? await getDb()
          .select()
          .from(commerceOrders)
          .where(and(baseWhere, eq(commerceOrders.id, requestedOrderId)))
          .limit(1)
      : await getDb()
          .select()
          .from(commerceOrders)
          .where(baseWhere)
          .orderBy(desc(commerceOrders.id))
          .limit(120);

    const stories = rows
      .map((row) => ({ row, data: metadata(row.metadataJson) }))
      .filter(({ data }) => requestedOrderId > 0 || clean(data.expires_at, 60) > now)
      .filter(({ data }) => {
        const storyProvince = clean(data.province);
        const storyCity = clean(data.city);
        if (province && storyProvince !== province) return false;
        if (requestedCities.length > 0 && storyCity && !requestedCities.includes(storyCity)) return false;
        return true;
      })
      .slice(0, requestedOrderId > 0 ? 1 : 80);

    const liveStories = stories.map(({ row, data }) => {
      const storyId = LOCAL_STORY_ID_BASE + row.id;
      const listingId = numberValue(data.listing_id);
      const dealerId = numberValue(data.dealer_id) || null;
      const ownerType = clean(data.listing_owner_type) === "dealer" ? "dealer" : "personal";
      const coverImageUrl = clean(data.cover_image_url, 1000);
      const startsAt = clean(data.starts_at, 60);
      const expiresAt = clean(data.expires_at, 60);

      return {
        story_id: storyId,
        listing_id: listingId,
        title: clean(data.title, 180) || "آگهی خودرو",
        brand: clean(data.brand, 100),
        model: clean(data.model, 100),
        year: clean(data.year, 20),
        price_toman: numberValue(data.price_toman),
        province: clean(data.province, 100),
        city: clean(data.city, 100),
        neighborhood: clean(data.neighborhood, 120),
        listing_owner_type: ownerType,
        seller_display_name: clean(data.seller_display_name, 160),
        dealer_id: dealerId,
        story_owner_key:
          ownerType === "dealer" && dealerId
            ? null
            : `story:${publicOwnerKey(row.ownerKey)}`,
        cover_image: coverImageUrl ? { image_id: storyId, image_url: coverImageUrl } : null,
        media_type: "image",
        media_url: coverImageUrl || null,
        thumbnail_url: coverImageUrl || null,
        public_url: listingPublicUrl(data.public_url, listingId),
        share_url: `/stories/${storyId}?ref=double-story`,
        starts_at: startsAt || null,
        expires_at: expiresAt || null,
        is_active: Boolean(expiresAt && expiresAt > now),
      };
    });

    const data = requestedStoryId > 0 ? liveStories : [...fixtureStories, ...liveStories];
    return Response.json(
      { success: true, count: data.length, data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    if (fixtureStories.length > 0) {
      return Response.json(
        { success: true, count: fixtureStories.length, data: fixtureStories },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      { success: false, count: 0, data: [], message: "استوری‌های آزمایشی دریافت نشدند." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
