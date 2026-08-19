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
import {
  createPublicReference,
  getFinanceOwnerKey,
} from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;
const SERVICE_KEY_PATTERN = /^[a-z0-9_-]{3,80}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function publicOrder(order: typeof commerceOrders.$inferSelect) {
  return {
    id: order.id,
    order_no: order.orderNo,
    type: order.orderType,
    product_code: order.productCode,
    amount_toman: order.finalAmountToman,
    status: order.status,
    metadata: parseMetadata(order.metadataJson),
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
  const listing = [direct, ...collection]
    .filter(isRecord)
    .find((item) => Number(item.id) === listingId);

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
        isRecord(listing.status) ? listing.status.code : listing.status,
        40,
      ),
      dealerId: Number(listing.dealer_id || 0) || null,
    },
  };
}

async function verifyManagedBusiness(request: NextRequest, dealerId: number) {
  const upstream = await fetch(authApiUrl("/api/commerce.php"), {
    method: "GET",
    cache: "no-store",
    headers: requestIdentityHeaders(request),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await parseJsonResponse(upstream);

  if (!upstream.ok || payload?.success !== true) {
    return {
      ok: false as const,
      status: upstream.status >= 400 ? upstream.status : 502,
      message: cleanText(payload?.message, 220) || "دسترسی به مجموعه قابل بررسی نیست.",
    };
  }

  const businesses = Array.isArray(payload.dealers) ? payload.dealers.filter(isRecord) : [];
  const business = businesses.find(
    (item) => Number(item.dealer_id || item.id || 0) === dealerId,
  );

  if (!business) {
    return {
      ok: false as const,
      status: 403,
      message: "این مجموعه در فهرست کسب‌وکارهای قابل مدیریت شما نیست.",
    };
  }

  return {
    ok: true as const,
    business: {
      id: dealerId,
      name: cleanText(business.dealer_name || business.name, 180),
      role: cleanText(business.role, 60),
    },
  };
}

async function createCommerceOrder(
  request: NextRequest,
  input: {
    serviceKey: string;
    listingId?: number;
    dealerId?: number;
    province?: string;
    discountCode?: string;
  },
) {
  const payload: Record<string, unknown> = {
    action: "create_order",
    service_key: input.serviceKey,
  };

  if (input.listingId) payload.listing_id = input.listingId;
  if (input.dealerId) payload.dealer_id = input.dealerId;
  if (input.province) payload.province = input.province;
  if (input.discountCode) payload.discount_code = input.discountCode;

  const referralCode = request.cookies.get("chakod_affiliate_ref")?.value?.trim();
  if (referralCode) payload.affiliate_code = referralCode;

  const upstream = await fetch(authApiUrl("/api/commerce.php"), {
    method: "POST",
    cache: "no-store",
    headers: {
      ...requestIdentityHeaders(request),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await parseJsonResponse(upstream);
  const order = isRecord(result?.order) ? result.order : null;

  if (!upstream.ok || result?.success !== true || !order) {
    return {
      ok: false as const,
      status: upstream.status >= 400 ? upstream.status : 502,
      message: cleanText(result?.message, 240) || "ساخت سفارش در سامانه تجاری انجام نشد.",
    };
  }

  const orderNo = cleanText(order.order_no, 80);
  const amountToman = Math.round(
    Number(order.amount_toman || order.total_amount_toman || order.final_amount_toman || 0),
  );

  if (!orderNo || !Number.isSafeInteger(amountToman) || amountToman < 0) {
    return {
      ok: false as const,
      status: 502,
      message: "اطلاعات سفارش تجاری معتبر نیست.",
    };
  }

  return {
    ok: true as const,
    orderNo,
    amountToman,
    originalAmountToman: Math.round(Number(order.original_amount_toman || amountToman)),
    discountToman: Math.round(Number(order.discount_amount_toman || 0)),
    discountCode: cleanText(order.discount_code, 80),
    message: cleanText(result?.message, 240),
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
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات سفارش معتبر نیست." }, 400);
  }

  const orderType = cleanText(input.type, 32);
  const idempotencyKey = cleanText(input.idempotency_key, 100);
  const requestedServiceKey = cleanText(input.service_key || input.code, 80);

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه امن سفارش معتبر نیست." }, 400);
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
      return jsonResponse({ success: true, reused: true, order: publicOrder(existing) });
    }

    if (orderType === "wallet_charge") {
      const amountToman = Math.round(Number(input.amount_toman || 0));
      if (!Number.isSafeInteger(amountToman) || amountToman < 10_000 || amountToman > 500_000_000) {
        return jsonResponse({ success: false, message: "مبلغ افزایش موجودی معتبر نیست." }, 400);
      }

      const orderNo = createPublicReference("CHK");
      const [order] = await db
        .insert(commerceOrders)
        .values({
          orderNo,
          idempotencyKey,
          ownerKey,
          orderType,
          productCode: "wallet_charge",
          amountToman,
          finalAmountToman: amountToman,
          status: "pending_payment",
          metadataJson: JSON.stringify({ source: "wallet" }),
        })
        .returning();

      return jsonResponse({ success: true, reused: false, order: publicOrder(order) }, 201);
    }

    if (!["promotion", "subscription", "service"].includes(orderType)) {
      return jsonResponse({ success: false, message: "نوع سفارش معتبر نیست." }, 400);
    }

    if (!SERVICE_KEY_PATTERN.test(requestedServiceKey)) {
      return jsonResponse({ success: false, message: "کد خدمت معتبر نیست." }, 400);
    }

    const listingId = Math.round(Number(input.listing_id || 0));
    const dealerIdInput = Math.round(Number(input.dealer_id || 0));
    const province = cleanText(input.province, 80);
    const discountCode = cleanText(input.discount_code, 80);
    let verifiedListing:
      | { id: number; title: string; status: string; dealerId: number | null }
      | null = null;
    let verifiedBusiness:
      | { id: number; name: string; role: string }
      | null = null;

    if (requestedServiceKey.startsWith("listing_")) {
      if (!Number.isSafeInteger(listingId) || listingId <= 0) {
        return jsonResponse({ success: false, message: "برای این خدمت باید یک آگهی معتبر انتخاب شود." }, 400);
      }

      const ownership = await verifyManagedListing(request, listingId);
      if (!ownership.ok) {
        return jsonResponse({ success: false, message: ownership.message }, ownership.status);
      }
      verifiedListing = ownership.listing;
    }

    const requiresManagedBusiness =
      requestedServiceKey === "business_placement" ||
      requestedServiceKey === "dealership_placement" ||
      requestedServiceKey.startsWith("professional_profile_");

    if (requiresManagedBusiness) {
      if (!Number.isSafeInteger(dealerIdInput) || dealerIdInput <= 0) {
        return jsonResponse({ success: false, message: "برای این خدمت باید یک مجموعه قابل مدیریت انتخاب شود." }, 400);
      }

      const ownership = await verifyManagedBusiness(request, dealerIdInput);
      if (!ownership.ok) {
        return jsonResponse({ success: false, message: ownership.message }, ownership.status);
      }
      verifiedBusiness = ownership.business;
    }

    const dealerId = verifiedBusiness?.id || dealerIdInput || verifiedListing?.dealerId || 0;
    const commerceResult = await createCommerceOrder(request, {
      serviceKey: requestedServiceKey,
      listingId: verifiedListing?.id,
      dealerId: dealerId || undefined,
      province: province || undefined,
      discountCode: discountCode || undefined,
    });

    if (!commerceResult.ok) {
      return jsonResponse(
        { success: false, message: commerceResult.message },
        commerceResult.status,
      );
    }

    const metadata = {
      source: "commerce",
      service_key: requestedServiceKey,
      target_type: verifiedListing ? "listing" : dealerId ? "dealer" : "account",
      listing_id: verifiedListing?.id || null,
      listing_title: verifiedListing?.title || "",
      listing_status: verifiedListing?.status || "",
      dealer_id: dealerId || null,
      dealer_name: verifiedBusiness?.name || "",
      dealer_role: verifiedBusiness?.role || "",
      province: province || "",
      discount_code: commerceResult.discountCode || "",
      upstream_message: commerceResult.message || "",
    };

    const [order] = await db
      .insert(commerceOrders)
      .values({
        orderNo: commerceResult.orderNo,
        idempotencyKey,
        ownerKey,
        orderType,
        productCode: requestedServiceKey,
        amountToman: commerceResult.originalAmountToman,
        discountToman: commerceResult.discountToman,
        finalAmountToman: commerceResult.amountToman,
        status: "pending_payment",
        metadataJson: JSON.stringify(metadata),
      })
      .returning();

    return jsonResponse({ success: true, reused: false, order: publicOrder(order) }, 201);
  } catch {
    return jsonResponse(
      { success: false, message: "ساخت یا ثبت سفارش مالی انجام نشد." },
      503,
    );
  }
}
