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
import { getFinanceOwnerKey } from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeNumber(value: unknown) {
  const number = Math.round(Number(value || 0));
  return Number.isSafeInteger(number) ? number : 0;
}

function publicOrder(order: typeof commerceOrders.$inferSelect) {
  return {
    order_no: order.orderNo,
    type: order.orderType,
    product_code: order.productCode,
    amount_toman: order.finalAmountToman,
    status: order.status,
  };
}

function parseDate(value: string) {
  if (!DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای رزرو بنر وارد شوید." }, 401);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات رزرو بنر معتبر نیست." }, 400);
  }

  const idempotencyKey = cleanText(input.idempotency_key, 100);
  const dealerId = safeNumber(input.dealer_id);
  const provinceName = cleanText(input.province, 80);
  const startDate = cleanText(input.start_date, 10);
  const endDate = cleanText(input.end_date, 10);
  const title = cleanText(input.title, 180);
  const subtitle = cleanText(input.subtitle, 300);
  const desktopImageUrl = cleanText(input.desktop_image_url, 1000);
  const mobileImageUrl = cleanText(input.mobile_image_url, 1000);
  const destinationType = cleanText(input.destination_type, 30);
  const destinationUrl = cleanText(input.destination_url, 1000);
  const discountCode = cleanText(input.discount_code, 80);

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه امن رزرو معتبر نیست." }, 400);
  }
  if (dealerId <= 0 || !provinceName || !title) {
    return jsonResponse({ success: false, message: "نمایشگاه، استان و عنوان بنر الزامی است." }, 400);
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end < start) {
    return jsonResponse({ success: false, message: "بازه تاریخ رزرو معتبر نیست." }, 400);
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
        return jsonResponse({ success: false, message: "شناسه رزرو قابل استفاده نیست." }, 409);
      }
      return jsonResponse({
        success: true,
        reused: true,
        order: publicOrder(existing),
        checkout_url: `/account/payments/checkout?order_no=${encodeURIComponent(existing.orderNo)}`,
      });
    }

    const identityHeaders = requestIdentityHeaders(request);
    const commerceGet = await fetch(authApiUrl("/api/commerce.php"), {
      method: "GET",
      cache: "no-store",
      headers: identityHeaders,
      signal: AbortSignal.timeout(20_000),
    });
    const commerceData = await parseJsonResponse(commerceGet);

    if (!commerceGet.ok || commerceData?.success !== true) {
      return jsonResponse(
        {
          success: false,
          message: cleanText(commerceData?.message, 240) || "اطلاعات تجاری حساب دریافت نشد.",
        },
        commerceGet.status >= 400 ? commerceGet.status : 502,
      );
    }

    const dealers = Array.isArray(commerceData.dealers) ? commerceData.dealers.filter(isRecord) : [];
    const provinces = Array.isArray(commerceData.provinces) ? commerceData.provinces.filter(isRecord) : [];
    const dealer = dealers.find((item) => safeNumber(item.dealer_id) === dealerId);
    const province = provinces.find((item) => cleanText(item.province, 80) === provinceName);

    if (!dealer) {
      return jsonResponse({ success: false, message: "این نمایشگاه برای حساب فعلی قابل مدیریت نیست." }, 403);
    }
    if (!province || province.banner_is_active !== true) {
      return jsonResponse({ success: false, message: "رزرو بنر برای این استان فعال نیست." }, 409);
    }

    const serviceKey = province.is_large === true ? "home_banner_large" : "home_banner_regular";
    const reservePayload: Record<string, unknown> = {
      action: "reserve_banner",
      dealer_id: dealerId,
      province: provinceName,
      slot_key: "home_primary",
      start_date: startDate,
      end_date: endDate,
      title,
      subtitle,
      desktop_image_url: desktopImageUrl,
      mobile_image_url: mobileImageUrl,
      destination_type: destinationType || "dealer",
      destination_url: destinationUrl,
      idempotency_key: idempotencyKey,
    };
    if (discountCode) reservePayload.discount_code = discountCode;

    const referralCode = request.cookies.get("chakod_affiliate_ref")?.value?.trim();
    if (referralCode) reservePayload.affiliate_code = referralCode;

    const reserveResponse = await fetch(authApiUrl("/api/commerce.php"), {
      method: "POST",
      cache: "no-store",
      headers: {
        ...identityHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reservePayload),
      signal: AbortSignal.timeout(20_000),
    });
    const reserveResult = await parseJsonResponse(reserveResponse);
    const upstreamOrder = isRecord(reserveResult?.order) ? reserveResult.order : null;

    if (!reserveResponse.ok || reserveResult?.success !== true || !upstreamOrder) {
      return jsonResponse(
        {
          success: false,
          message: cleanText(reserveResult?.message, 240) || "رزرو بنر در Commerce انجام نشد.",
        },
        reserveResponse.status >= 400 ? reserveResponse.status : 502,
      );
    }

    const orderNo = cleanText(upstreamOrder.order_no, 100);
    const finalAmount = safeNumber(
      upstreamOrder.amount_toman || upstreamOrder.total_amount_toman || upstreamOrder.final_amount_toman,
    );
    const originalAmount = safeNumber(upstreamOrder.original_amount_toman || finalAmount);
    const discountAmount = safeNumber(upstreamOrder.discount_amount_toman);
    const upstreamServiceKey = cleanText(upstreamOrder.service_key, 80) || serviceKey;
    const upstreamStatus = cleanText(upstreamOrder.status, 40) || "pending_payment";

    if (!orderNo || finalAmount < 0 || originalAmount < finalAmount) {
      return jsonResponse({ success: false, message: "اطلاعات سفارش بنر معتبر نیست." }, 502);
    }

    const reservationRecord = isRecord(reserveResult.reservation)
      ? reserveResult.reservation
      : isRecord(reserveResult.banner_reservation)
        ? reserveResult.banner_reservation
        : null;

    const [mirroredOrder] = await db
      .insert(commerceOrders)
      .values({
        orderNo,
        idempotencyKey,
        ownerKey,
        orderType: "promotion",
        productCode: upstreamServiceKey,
        amountToman: originalAmount,
        discountToman: discountAmount,
        finalAmountToman: finalAmount,
        status: upstreamStatus,
        metadataJson: JSON.stringify({
          source: "banner_reservation",
          service_title: "رزرو بنر صفحه اصلی",
          banner_title: title,
          dealer_id: dealerId,
          dealer_name: cleanText(dealer.dealer_name, 180),
          province: provinceName,
          start_date: startDate,
          end_date: endDate,
          desktop_image_url: desktopImageUrl,
          mobile_image_url: mobileImageUrl,
          destination_type: destinationType || "dealer",
          destination_url: destinationUrl,
          discount_code: cleanText(upstreamOrder.discount_code, 80) || discountCode,
          reservation_id: safeNumber(reservationRecord?.id || reserveResult.reservation_id) || null,
          upstream_order_id: safeNumber(upstreamOrder.id) || null,
        }),
      })
      .returning();

    return jsonResponse(
      {
        success: true,
        reused: false,
        message: cleanText(reserveResult.message, 240) || "رزرو بنر ثبت شد و آماده پرداخت است.",
        order: publicOrder(mirroredOrder),
        checkout_url: `/account/payments/checkout?order_no=${encodeURIComponent(mirroredOrder.orderNo)}`,
      },
      201,
    );
  } catch {
    return jsonResponse(
      { success: false, message: "ثبت مالی رزرو بنر کامل نشد." },
      503,
    );
  }
}
