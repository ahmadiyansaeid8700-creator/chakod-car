import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import {
  jsonResponse,
  proxyAuthenticatedJson,
  readSessionToken,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../../lib/finance-core";
import {
  buildStagingDemoCommerce,
  quoteStagingDemoService,
} from "../../../../lib/staging-demo-commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function stagingDemoPayload(request: NextRequest) {
  const demo = buildStagingDemoCommerce({
    hostname: request.nextUrl.hostname,
    token: readSessionToken(request),
  });
  if (!demo) return null;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) return demo;

  try {
    const orders = await getDb()
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.ownerKey, ownerKey))
      .orderBy(desc(commerceOrders.id))
      .limit(30);

    return {
      ...demo,
      orders: orders.map((order) => ({
        id: order.id,
        order_no: order.orderNo,
        service_key: order.productCode,
        total_amount_toman: order.finalAmountToman,
        original_amount_toman: order.amountToman,
        discount_amount_toman: order.discountToman,
        status: order.status,
        created_at: order.createdAt,
        paid_at: order.status === "paid" ? order.updatedAt : null,
      })),
    };
  } catch {
    return demo;
  }
}

export async function GET(request: NextRequest) {
  if (!readSessionToken(request)) {
    return jsonResponse({ success: false, message: "برای مشاهده خدمات وارد شوید." }, 401);
  }

  const demo = await stagingDemoPayload(request);
  if (demo) return jsonResponse(demo);
  return proxyAuthenticatedJson(request, "/api/commerce.php");
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  if (!readSessionToken(request)) {
    return jsonResponse({ success: false, message: "برای استفاده از خدمات وارد شوید." }, 401);
  }

  const raw = await request.text();
  const demo = await stagingDemoPayload(request);
  if (demo) {
    let payload: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      payload = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return jsonResponse({ success: false, message: "اطلاعات درخواست آزمایشی معتبر نیست." }, 400);
    }

    if (payload.action !== "validate_discount") {
      return jsonResponse({ success: false, message: "عملیات آزمایشی Commerce معتبر نیست." }, 400);
    }

    const serviceKey = typeof payload.service_key === "string" ? payload.service_key.trim() : "";
    const discountCode = typeof payload.discount_code === "string" ? payload.discount_code.trim() : "";
    const quote = quoteStagingDemoService(serviceKey, discountCode);
    if (!quote || quote.discountCode !== "TEST10") {
      return jsonResponse({ success: false, message: "کد تخفیف آزمایشی معتبر نیست." }, 400);
    }

    return jsonResponse({
      success: true,
      staging_demo: true,
      discount: {
        original_amount_toman: quote.amountToman,
        discount_amount_toman: quote.discountToman,
        final_amount_toman: quote.finalAmountToman,
        code: quote.discountCode,
        title: "تخفیف ۱۰٪ آزمایشی استیجینگ",
      },
    });
  }

  let body = raw;
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    if (!payload.affiliate_code) {
      const referralCode = request.cookies.get("chakod_affiliate_ref")?.value?.trim();
      if (referralCode) payload.affiliate_code = referralCode;
    }
    body = JSON.stringify(payload);
  } catch {
    // The PHP endpoint performs its own JSON validation.
  }

  return proxyAuthenticatedJson(request, "/api/commerce.php", {
    method: "POST",
    body,
    timeoutMs: 20_000,
  });
}
