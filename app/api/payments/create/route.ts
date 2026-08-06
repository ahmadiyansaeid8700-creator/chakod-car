import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";
import { getCommerceCatalogItem } from "../../../../lib/commerce-catalog";
import { getFinanceOwnerKey } from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["wallet_charge", "promotion", "subscription"]);
const CODE_PATTERN = /^[a-z0-9_-]{2,64}$/i;
const ORDER_PATTERN = /^CHK-\d{10,}-[A-Z0-9]{10}$/;
const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای پرداخت وارد شوید." }, 401);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات پرداخت معتبر نیست." }, 400);
  }

  const type = cleanText(input.type, 32);
  const code = cleanText(input.code, 64);
  const orderNo = cleanText(input.order_no, 80);
  const idempotencyKey = cleanText(input.idempotency_key, 100);
  const callbackPath = cleanText(input.callback_path, 160);

  if (!ALLOWED_TYPES.has(type)) {
    return jsonResponse({ success: false, message: "نوع سفارش معتبر نیست." }, 400);
  }

  if (!CODE_PATTERN.test(code)) {
    return jsonResponse({ success: false, message: "کد محصول معتبر نیست." }, 400);
  }

  if (!ORDER_PATTERN.test(orderNo) || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه سفارش معتبر نیست." }, 400);
  }

  try {
    const [order] = await getDb()
      .select()
      .from(commerceOrders)
      .where(
        and(
          eq(commerceOrders.orderNo, orderNo),
          eq(commerceOrders.ownerKey, ownerKey),
          eq(commerceOrders.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (!order) {
      return jsonResponse({ success: false, message: "سفارش پیدا نشد یا متعلق به این حساب نیست." }, 404);
    }

    if (order.orderType !== type || order.productCode !== code) {
      return jsonResponse({ success: false, message: "اطلاعات سفارش با درخواست پرداخت هماهنگ نیست." }, 409);
    }

    if (order.status === "paid") {
      return jsonResponse({ success: false, message: "این سفارش قبلاً پرداخت شده است." }, 409);
    }

    if (order.status !== "pending_payment") {
      return jsonResponse({ success: false, message: "این سفارش در وضعیت قابل پرداخت نیست." }, 409);
    }

    const product = type === "wallet_charge" ? null : getCommerceCatalogItem(type, code);
    if (type !== "wallet_charge" && !product) {
      return jsonResponse({ success: false, message: "محصول انتخاب‌شده دیگر فعال نیست." }, 409);
    }

    const description = type === "wallet_charge"
      ? "افزایش موجودی کیف پول چاکود"
      : product!.title;
    const safeCallbackPath = callbackPath.startsWith("/account/payments/")
      ? callbackPath
      : "/account/payments/callback";
    const callbackUrl = new URL(safeCallbackPath, request.nextUrl.origin);
    callbackUrl.searchParams.set("order_no", order.orderNo);
    callbackUrl.searchParams.set("request_key", order.idempotencyKey);

    return proxyAuthenticatedJson(request, "/api/payments/create.php", {
      method: "POST",
      timeoutMs: 20_000,
      body: JSON.stringify({
        order_no: order.orderNo,
        idempotency_key: order.idempotencyKey,
        type: order.orderType,
        code: order.productCode,
        amount_toman: order.finalAmountToman,
        description,
        callback_url: callbackUrl.toString(),
      }),
    });
  } catch {
    return jsonResponse(
      { success: false, message: "سرویس سفارش و پرداخت هنوز به دیتابیس متصل نشده است." },
      503,
    );
  }
}
