import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";
import { getCommerceCatalogItem } from "../../../../lib/commerce-catalog";
import {
  createPublicReference,
  getFinanceOwnerKey,
} from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function publicOrder(order: typeof commerceOrders.$inferSelect) {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(order.metadataJson) as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  return {
    id: order.id,
    order_no: order.orderNo,
    type: order.orderType,
    product_code: order.productCode,
    amount_toman: order.finalAmountToman,
    status: order.status,
    metadata,
  };
}

async function verifyManagedListing(request: NextRequest, listingId: number) {
  const query = new URLSearchParams({
    listing_id: String(listingId),
    per_page: "1",
    page: "1",
  });
  const upstream = await fetch(
    authApiUrl(`/api/dashboard-listings.php?${query.toString()}`),
    {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const payload = await parseJsonResponse(upstream);

  if (!upstream.ok || payload?.success !== true) {
    return {
      ok: false as const,
      status: upstream.status >= 400 ? upstream.status : 502,
      message: cleanText(payload?.message, 220) || "مالکیت آگهی قابل بررسی نیست.",
    };
  }

  const direct = payload.listing;
  const collection = Array.isArray(payload.data) ? payload.data : [];
  const candidates = [direct, ...collection].filter(
    (item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
  );
  const listing = candidates.find((item) => Number(item.id) === listingId);

  if (!listing) {
    return {
      ok: false as const,
      status: 403,
      message: "این آگهی در فهرست آگهی‌های قابل مدیریت شما نیست.",
    };
  }

  return {
    ok: true as const,
    listing: {
      id: listingId,
      title: cleanText(listing.title, 180),
      status: cleanText(
        listing.status && typeof listing.status === "object"
          ? (listing.status as Record<string, unknown>).code
          : listing.status,
        40,
      ),
    },
  };
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای ساخت سفارش وارد شوید." }, 401);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات سفارش معتبر نیست." }, 400);
  }

  const orderType = cleanText(input.type, 32);
  const productCode = cleanText(input.code, 64);
  const idempotencyKey = cleanText(input.idempotency_key, 100);

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه امن سفارش معتبر نیست." }, 400);
  }

  let amountToman = 0;
  let metadata: Record<string, unknown> = {};

  if (orderType === "wallet_charge") {
    amountToman = Math.round(Number(input.amount_toman || 0));
    if (!Number.isSafeInteger(amountToman) || amountToman < 10_000 || amountToman > 500_000_000) {
      return jsonResponse({ success: false, message: "مبلغ افزایش موجودی معتبر نیست." }, 400);
    }
  } else {
    const product = getCommerceCatalogItem(orderType, productCode);
    if (!product) {
      return jsonResponse({ success: false, message: "محصول انتخاب‌شده معتبر نیست." }, 400);
    }
    amountToman = product.amountToman;

    if (orderType === "promotion") {
      const listingId = Math.round(Number(input.listing_id || 0));
      if (!Number.isSafeInteger(listingId) || listingId <= 0) {
        return jsonResponse({ success: false, message: "برای این محصول باید آگهی معتبر انتخاب شود." }, 400);
      }

      const ownership = await verifyManagedListing(request, listingId);
      if (!ownership.ok) {
        return jsonResponse(
          { success: false, message: ownership.message },
          ownership.status,
        );
      }

      metadata = {
        target_type: "listing",
        listing_id: ownership.listing.id,
        listing_title: ownership.listing.title,
        listing_status: ownership.listing.status,
      };
    }
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing) {
      if (existing.ownerKey !== ownerKey) {
        return jsonResponse({ success: false, message: "شناسه سفارش قابل استفاده نیست." }, 409);
      }

      let existingMetadata: Record<string, unknown> = {};
      try {
        existingMetadata = JSON.parse(existing.metadataJson) as Record<string, unknown>;
      } catch {
        existingMetadata = {};
      }

      if (
        orderType === "promotion" &&
        Number(existingMetadata.listing_id || 0) !== Number(metadata.listing_id || 0)
      ) {
        return jsonResponse({ success: false, message: "شناسه سفارش برای آگهی دیگری ساخته شده است." }, 409);
      }

      return jsonResponse({ success: true, reused: true, order: publicOrder(existing) });
    }

    const orderNo = createPublicReference("CHK");
    const [order] = await db
      .insert(commerceOrders)
      .values({
        orderNo,
        idempotencyKey,
        ownerKey,
        orderType,
        productCode,
        amountToman,
        finalAmountToman: amountToman,
        status: "pending_payment",
        metadataJson: JSON.stringify(metadata),
      })
      .returning();

    return jsonResponse({
      success: true,
      reused: false,
      order: publicOrder(order),
    }, 201);
  } catch {
    return jsonResponse(
      { success: false, message: "ساخت سفارش در دیتابیس انجام نشد." },
      503,
    );
  }
}
