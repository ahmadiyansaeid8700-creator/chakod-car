import { NextRequest } from "next/server";

import {
  collectListingImages,
  fetchListingDetail,
  fetchListingSummary,
  mergeListingResponses,
  normalizeAssetUrl,
  type ListingData,
} from "../../listing/[id]/listing-data";
import { jsonResponse } from "../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstText(listing: ListingData, keys: Array<keyof ListingData>) {
  for (const key of keys) {
    const value = listing[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function imageValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return normalizeAssetUrl(value.trim());
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = imageValue(item);
      if (resolved) return resolved;
    }
    return "";
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["image_url", "url", "src", "path", "file_url", "media_url"]) {
      const resolved = imageValue(record[key]);
      if (resolved) return resolved;
    }
  }

  return "";
}

function fallbackListingImage(listing: ListingData) {
  for (const key of [
    "cover_image",
    "cover_image_url",
    "image_url",
    "thumbnail_url",
    "thumbnail",
    "main_image",
    "primary_image",
    "image",
    "photo_url",
    "photo",
    "picture_url",
    "picture",
    "images",
  ]) {
    const resolved = imageValue(listing[key]);
    if (resolved) return resolved;
  }
  return "";
}

function compareDto(listing: ListingData, images: ReturnType<typeof collectListingImages>) {
  return {
    id: Number(listing.id),
    title: firstText(listing, ["title"]),
    brand: firstText(listing, ["brand_name", "vehicle_brand", "brand"]),
    model: firstText(listing, ["model_name", "vehicle_model", "model"]),
    trim: firstText(listing, ["trim_name"]),
    production_year: finiteNumber(listing.production_year),
    mileage_km: finiteNumber(listing.mileage_km),
    price_toman: finiteNumber(listing.price_toman),
    price_is_negotiable: Boolean(listing.price_is_negotiable),
    province: firstText(listing, ["province_name", "province"]),
    city: firstText(listing, ["city_name", "city"]),
    neighborhood: firstText(listing, ["neighborhood"]),
    transmission: firstText(listing, ["gearbox", "transmission"]),
    fuel_type: firstText(listing, ["fuel_type"]),
    color: firstText(listing, ["body_color", "color"]),
    body_status: firstText(listing, ["body_condition", "body_status"]),
    technical_condition: firstText(listing, ["technical_condition"]),
    engine_condition: firstText(listing, ["engine_condition"]),
    chassis_condition: firstText(listing, ["chassis_condition"]),
    engine_volume: firstText(listing, ["engine_volume", "engine_size"]),
    plate_type: firstText(listing, ["plate_type"]),
    free_zone_name: firstText(listing, ["free_zone_name"]),
    category_name: firstText(listing, ["category_name"]),
    seller_type: firstText(listing, ["seller_type", "listing_owner_type"]),
    dealer_name: firstText(listing, ["dealer_name"]),
    views_count: finiteNumber(listing.views_count) || 0,
    cover_image: images[0]?.image_url || fallbackListingImage(listing),
  };
}

async function loadListing(id: number) {
  const detailController = new AbortController();
  const summaryController = new AbortController();
  const detailTimer = setTimeout(() => detailController.abort(), 7000);
  const summaryTimer = setTimeout(() => summaryController.abort(), 5000);

  try {
    const [detail, summary] = await Promise.allSettled([
      fetchListingDetail(id, detailController.signal),
      fetchListingSummary(id, summaryController.signal),
    ]);

    const detailValue = detail.status === "fulfilled" ? detail.value : null;
    const summaryValue = summary.status === "fulfilled" ? summary.value : null;
    const response = detailValue && summaryValue
      ? mergeListingResponses(detailValue, summaryValue)
      : detailValue || summaryValue;

    if (!response?.success || !response.data) return null;
    return compareDto(response.data, collectListingImages(response));
  } finally {
    clearTimeout(detailTimer);
    clearTimeout(summaryTimer);
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids") || "";
  const ids = Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isSafeInteger(value) && value > 0),
    ),
  ).slice(0, 3);

  if (!ids.length) {
    return jsonResponse({ success: false, message: "حداقل یک شناسه آگهی معتبر لازم است.", data: [] }, 400);
  }

  try {
    const rows = await Promise.all(ids.map((id) => loadListing(id)));
    const data = rows.filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!data.length) {
      return jsonResponse({ success: false, message: "هیچ یک از آگهی های انتخاب شده در دسترس نیستند.", data: [] }, 404);
    }

    return jsonResponse({
      success: true,
      requested_ids: ids,
      missing_ids: ids.filter((id) => !data.some((item) => item.id === id)),
      data,
    });
  } catch {
    return jsonResponse({ success: false, message: "دریافت اطلاعات مقایسه کامل نشد.", data: [] }, 503);
  }
}
