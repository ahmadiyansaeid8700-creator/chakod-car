import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { commerceOrders } from "../../../../db/schema";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_PATTERN = /^[a-z0-9_-]{6,100}$/i;

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده سفارش وارد شوید." }, 401);
  }

  const orderNo = request.nextUrl.searchParams.get("order_no")?.trim() || "";
  if (!ORDER_PATTERN.test(orderNo)) {
    return jsonResponse({ success: false, message: "شماره سفارش معتبر نیست." }, 400);
  }

  try {
    const [order] = await getDb()
      .select()
      .from(commerceOrders)
      .where(
        and(
          eq(commerceOrders.orderNo, orderNo),
          eq(commerceOrders.ownerKey, ownerKey),
        ),
      )
      .limit(1);

    if (!order) {
      return jsonResponse({ success: false, message: "سفارش متعلق به این حساب پیدا نشد." }, 404);
    }

    return jsonResponse({
      success: true,
      order: {
        order_no: order.orderNo,
        type: order.orderType,
        product_code: order.productCode,
        amount_toman: order.finalAmountToman,
        original_amount_toman: order.amountToman,
        discount_amount_toman: order.discountToman,
        status: order.status,
        metadata: parseMetadata(order.metadataJson),
      },
    });
  } catch {
    return jsonResponse(
      { success: false, message: "اطلاعات سفارش مالی در دسترس نیست." },
      503,
    );
  }
}
