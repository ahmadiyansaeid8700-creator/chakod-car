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

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
    const orderNo = createPublicReference("CHK");
    const [order] = await getDb()
      .insert(commerceOrders)
      .values({
        orderNo,
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
      order: {
        id: order.id,
        order_no: order.orderNo,
        type: order.orderType,
        product_code: order.productCode,
        amount_toman: order.finalAmountToman,
        status: order.status,
      },
    }, 201);
  } catch {
    return jsonResponse(
      { success: false, message: "ساخت سفارش در دیتابیس انجام نشد." },
      503,
    );
  }
}
