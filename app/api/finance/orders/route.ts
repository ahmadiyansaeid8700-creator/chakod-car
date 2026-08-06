import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
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
  return {
    id: order.id,
    order_no: order.orderNo,
    type: order.orderType,
    product_code: order.productCode,
    amount_toman: order.finalAmountToman,
    status: order.status,
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
