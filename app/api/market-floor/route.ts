import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../db";
import { marketFloorEntries, marketFloorWallets } from "../../../db/schema";
import { authApiUrl, jsonResponse, parseJsonResponse, rejectCrossSiteMutation, requestIdentityHeaders } from "../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../lib/finance-core";
import { MARKET_FLOOR_INITIAL_CARDS, MARKET_FLOOR_MIN_SCORE, MARKET_FLOOR_PROVINCE_CAPACITY, ensureMarketFloorSchema, evaluateMarketFloor, marketFloorCycle, type MarketFloorListing } from "../../../lib/market-floor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function text(value: unknown, max = 240) { return String(value || "").trim().slice(0, max); }
function number(value: unknown) { const parsed = Number(value || 0); return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0; }
function bool(value: unknown) { return value === true || value === 1 || value === "1" || value === "true"; }

async function ensureCards(ownerKey: string) {
  const db = getDb();
  const [existing] = await db.select().from(marketFloorWallets).where(eq(marketFloorWallets.ownerKey, ownerKey)).limit(1);
  if (existing) return existing;
  try {
    const [created] = await db.insert(marketFloorWallets).values({ ownerKey, availableCards: MARKET_FLOOR_INITIAL_CARDS }).returning();
    return created;
  } catch {
    const [createdByAnotherRequest] = await db.select().from(marketFloorWallets).where(eq(marketFloorWallets.ownerKey, ownerKey)).limit(1);
    return createdByAnotherRequest;
  }
}

async function loadOwnedListing(request: NextRequest, listingId: number) {
  const response = await fetch(authApiUrl(`/api/listing-manage.php?listing_id=${listingId}`), {
    cache: "no-store",
    headers: requestIdentityHeaders(request),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await parseJsonResponse(response) as JsonObject | null;
  const access = payload?.access as JsonObject | undefined;
  const listing = payload?.listing as JsonObject | undefined;
  if (!response.ok || payload?.success !== true || !listing || access?.can_manage === false) return null;
  if (text(typeof listing.status === "object" ? (listing.status as JsonObject)?.code : listing.status).toLowerCase() !== "active") return null;
  return listing;
}

function listingSnapshot(listing: JsonObject): MarketFloorListing & Record<string, unknown> {
  const images = Array.isArray(listing.images) ? listing.images : [];
  return {
    id: number(listing.id),
    title: text(listing.title, 180) || "آگهی خودرو",
    brand: text(listing.brand || listing.brand_name, 100),
    model: text(listing.model || listing.model_name, 100),
    trim: text(listing.trim || listing.trim_name || listing.type, 100),
    year: number(listing.production_year || listing.year),
    mileageKm: number(listing.mileage_km || listing.mileage),
    priceToman: number(listing.price_toman || listing.price),
    marketReferenceToman: number(listing.market_reference_toman || listing.market_average_price || listing.similar_average_price),
    province: text(listing.province || listing.province_name, 100),
    city: text(listing.city || listing.city_name, 100),
    bodyCondition: text(listing.body_condition || listing.body_status, 160),
    paintParts: number(listing.paint_parts_count || listing.colored_parts_count),
    severeAccident: bool(listing.severe_accident || listing.chassis_damage),
    imageCount: images.length || number(listing.image_count),
    descriptionLength: text(listing.description, 6000).length,
    coverUrl: text((listing.cover_image as JsonObject | undefined)?.image_url || (images[0] as JsonObject | undefined)?.image_url, 1000),
    publicUrl: `/cars/${number(listing.id)}`,
  };
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) return jsonResponse({ success: false, message: "برای استفاده از کف بازار وارد حساب شوید." }, 401);
  await ensureMarketFloorSchema();
  const db = getDb();
  const wallet = await ensureCards(ownerKey);
  const entries = await db.select().from(marketFloorEntries).where(eq(marketFloorEntries.ownerKey, ownerKey)).orderBy(desc(marketFloorEntries.id)).limit(30);
  const listingId = number(request.nextUrl.searchParams.get("listing_id"));
  const listing = listingId ? await loadOwnedListing(request, listingId) : null;
  return jsonResponse({ success: true, wallet, entries, listing: listing ? listingSnapshot(listing) : null, rules: { initial_cards: MARKET_FLOOR_INITIAL_CARDS, province_capacity: MARKET_FLOOR_PROVINCE_CAPACITY, minimum_score: MARKET_FLOOR_MIN_SCORE, cycle_hour: 8 } });
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) return jsonResponse({ success: false, message: "برای شرکت در کف بازار وارد حساب شوید." }, 401);
  await ensureMarketFloorSchema();
  const input = await request.json().catch(() => ({})) as JsonObject;
  const listingId = number(input.listing_id);
  const reserveNext = bool(input.reserve_next_cycle);
  const requestedScope = input.scope === "nationwide" ? "nationwide" : "province";
  if (!listingId) return jsonResponse({ success: false, message: "آگهی معتبر نیست." }, 400);
  const listing = await loadOwnedListing(request, listingId);
  if (!listing) return jsonResponse({ success: false, message: "فقط آگهی فعال و متعلق به این حساب قابل بررسی است." }, 404);
  const snapshot = listingSnapshot(listing);
  if (!snapshot.province) return jsonResponse({ success: false, message: "استان آگهی باید کامل شود." }, 409);
  const cycle = marketFloorCycle(new Date(), reserveNext);
  const db = getDb();
  const wallet = await ensureCards(ownerKey);
  if (!wallet || wallet.availableCards <= 0) return jsonResponse({ success: false, message: "کارت کف بازار کافی ندارید." }, 409);
  const [duplicate] = await db.select().from(marketFloorEntries).where(and(eq(marketFloorEntries.ownerKey, ownerKey), eq(marketFloorEntries.listingId, listingId), eq(marketFloorEntries.cycleKey, cycle.key))).limit(1);
  if (duplicate) return jsonResponse({ success: false, message: "این آگهی برای چرخه انتخاب‌شده قبلاً ارسال شده است.", entry: duplicate }, 409);

  const result = evaluateMarketFloor(snapshot);
  let status = result.decision === "approved" ? "qualified" : result.decision === "rejected" ? "rejected" : "pending_admin";
  const active = await db.select().from(marketFloorEntries).where(and(eq(marketFloorEntries.province, snapshot.province), eq(marketFloorEntries.cycleKey, cycle.key), eq(marketFloorEntries.status, "active"))).orderBy(desc(marketFloorEntries.score));
  let displacedEntryId = 0;
  if (status === "qualified") {
    if (active.length < MARKET_FLOOR_PROVINCE_CAPACITY) {
      status = "active";
    } else {
      const weakest = active.at(-1);
      if (weakest && result.score > weakest.score) {
        status = "active";
        displacedEntryId = weakest.id;
      } else {
        status = "waitlisted";
      }
    }
  }
  const now = new Date().toISOString();
  const cardReturned = status === "rejected";
  const [entry] = await db.insert(marketFloorEntries).values({
    ownerKey, listingId, province: snapshot.province, requestedScope, cycleKey: cycle.key,
    cycleStartsAt: cycle.startsAt, cycleEndsAt: cycle.endsAt, status, score: result.score,
    grade: result.grade, decision: result.decision, reason: result.reason,
    scoreJson: JSON.stringify({ ...result.components, discount_percent: result.discountPercent }),
    listingSnapshotJson: JSON.stringify(snapshot), cardState: cardReturned ? "refunded" : "consumed",
    reservationForNextCycle: reserveNext, reviewedAt: now, activatedAt: status === "active" ? now : null, updatedAt: now,
  }).returning();
  if (displacedEntryId) {
    await db.update(marketFloorEntries).set({ status: "waitlisted", reason: "آگهی با امتیاز بالاتر وارد ظرفیت استان شد؛ این درخواست در صف چرخه باقی ماند.", updatedAt: now }).where(eq(marketFloorEntries.id, displacedEntryId));
  }
  await db.update(marketFloorWallets).set({
    availableCards: wallet.availableCards - (cardReturned ? 0 : 1),
    consumedCards: wallet.consumedCards + (cardReturned ? 0 : 1),
    refundedCards: wallet.refundedCards + (cardReturned ? 1 : 0),
    updatedAt: now,
  }).where(eq(marketFloorWallets.id, wallet.id));
  return jsonResponse({ success: true, entry, result, card_returned: cardReturned, message: cardReturned ? "آگهی تأیید نشد و کارت شما برگشت." : status === "active" ? "آگهی وارد کف بازار شد." : status === "pending_admin" ? "درخواست برای بررسی مدیر ثبت شد." : "آگهی واجد شرایط است و در صف ظرفیت قرار گرفت." });
}
