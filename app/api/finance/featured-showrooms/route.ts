import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  commerceOrders,
  featuredShowroomPlacements,
} from "../../../../db/schema";
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

function countDays(startDate: string, endDate: string) {
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) return 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function publicPlacement(row: typeof featuredShowroomPlacements.$inferSelect) {
  return {
    id: row.id,
    order_id: row.orderId,
    dealer_id: row.dealerId,
    dealer_name: row.dealerName,
    province: row.province,
    start_date: row.startDate,
    end_date: row.endDate,
    reserved_days: row.reservedDays,
    daily_rate_toman: row.dailyRateToman,
    total_price_toman: row.totalPriceToman,
    status: row.status,
    admin_note: row.adminNote,
    approved_at: row.approvedAt,
    created_at: row.createdAt,
  };
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده رزروها وارد شوید." }, 401);
  }

  try {
    const rows = await getDb()
      .select()
      .from(featuredShowroomPlacements)
      .where(eq(featuredShowroomPlacements.ownerKey, ownerKey))
      .orderBy(desc(featuredShowroomPlacements.id))
      .limit(50);

    return jsonResponse({
      success: true,
      placements: rows.map(publicPlacement),
    });
  } catch {
    return jsonResponse(
      { success: false, message: "رزروهای نمایشگاه منتخب در دسترس نیستند." },
      503,
    );
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای رزرو نمایشگاه منتخب وارد شوید." }, 401);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات رزرو معتبر نیست." }, 400);
  }

  const idempotencyKey = cleanText(input.idempotency_key, 100);
  const dealerId = safeNumber(input.dealer_id);
  const provinceName = cleanText(input.province, 80);
  const startDate = cleanText(input.start_date, 10);
  const endDate = cleanText(input.end_date, 10);
  const discountCode = cleanText(input.discount_code, 80);
  const reservedDays = countDays(startDate, endDate);

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه امن رزرو معتبر نیست." }, 400);
  }
  if (dealerId <= 0 || !provinceName || reservedDays <= 0 || reservedDays > 90) {
    return jsonResponse({ success: false, message: "نمایشگاه، استان و بازه زمانی معتبر الزامی است." }, 400);
  }

  try {
    const db = getDb();
    const [existingOrder] = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingOrder) {
      if (existingOrder.ownerKey !== ownerKey) {
        return jsonResponse({ success: false, message: "شناسه رزرو قابل استفاده نیست." }, 409);
      }

      const [existingPlacement] = await db
        .select()
        .from(featuredShowroomPlacements)
        .where(eq(featuredShowroomPlacements.orderId, existingOrder.id))
        .limit(1);

      return jsonResponse({
        success: true,
        reused: true,
        order: {
          order_no: existingOrder.orderNo,
          amount_toman: existingOrder.finalAmountToman,
          status: existingOrder.status,
        },
        placement: existingPlacement ? publicPlacement(existingPlacement) : null,
        checkout_url: `/account/payments/checkout?order_no=${encodeURIComponent(existingOrder.orderNo)}`,
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
      return jsonResponse({ success: false, message: "جایگاه نمایشگاه منتخب برای این استان فعال نیست." }, 409);
    }

    const dealerName = cleanText(dealer.dealer_name, 180) || `نمایشگاه ${dealerId}`;
    const dailyRate = safeNumber(province.banner_price_toman);
    const capacity = safeNumber(province.banner_day_capacity);
    if (dailyRate <= 0 || capacity <= 0) {
      return jsonResponse({ success: false, message: "تعرفه یا ظرفیت این استان هنوز تنظیم نشده است." }, 409);
    }

    const reservePayload: Record<string, unknown> = {
      action: "reserve_banner",
      dealer_id: dealerId,
      province: provinceName,
      slot_key: "home_primary",
      start_date: startDate,
      end_date: endDate,
      title: `نمایشگاه منتخب: ${dealerName}`,
      subtitle: "جایگاه نمایشگاه منتخب چاکود",
      desktop_image_url: "",
      mobile_image_url: "",
      destination_type: "dealer",
      destination_url: "",
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
          message: cleanText(reserveResult?.message, 240) || "رزرو جایگاه نمایشگاه منتخب انجام نشد.",
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
    const upstreamServiceKey = cleanText(upstreamOrder.service_key, 80) ||
      (province.is_large === true ? "home_banner_large" : "home_banner_regular");
    const upstreamStatus = cleanText(upstreamOrder.status, 40) || "pending_payment";

    if (!orderNo || finalAmount < 0 || originalAmount < finalAmount) {
      return jsonResponse({ success: false, message: "اطلاعات سفارش رزرو معتبر نیست." }, 502);
    }

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
          source: "featured_showroom",
          public_product_code: "dealership_placement",
          service_title: "جایگاه نمایشگاه منتخب",
          dealer_id: dealerId,
          dealer_name: dealerName,
          province: provinceName,
          start_date: startDate,
          end_date: endDate,
          reserved_days: reservedDays,
          daily_rate_toman: dailyRate,
          capacity,
          discount_code: cleanText(upstreamOrder.discount_code, 80) || discountCode,
          legacy_commerce_service_key: upstreamServiceKey,
        }),
      })
      .returning();

    const [placement] = await db
      .insert(featuredShowroomPlacements)
      .values({
        orderId: mirroredOrder.id,
        ownerKey,
        dealerId,
        dealerName,
        province: provinceName,
        startDate,
        endDate,
        reservedDays,
        dailyRateToman: dailyRate,
        totalPriceToman: finalAmount,
        status: "pending_payment",
      })
      .returning();

    return jsonResponse(
      {
        success: true,
        reused: false,
        message: "رزرو نمایشگاه منتخب ثبت شد و آماده پرداخت است.",
        order: {
          order_no: mirroredOrder.orderNo,
          amount_toman: mirroredOrder.finalAmountToman,
          status: mirroredOrder.status,
        },
        placement: publicPlacement(placement),
        checkout_url: `/account/payments/checkout?order_no=${encodeURIComponent(mirroredOrder.orderNo)}`,
      },
      201,
    );
  } catch {
    return jsonResponse(
      { success: false, message: "ثبت رزرو نمایشگاه منتخب کامل نشد." },
      503,
    );
  }
}
