import { and, desc, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  commerceOrders,
  paymentAttempts,
  paymentRefunds,
} from "../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_PATTERN = /^[a-z0-9_-]{6,100}$/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده بازپرداخت ها وارد شوید." }, 401);
  }

  try {
    const db = getDb();
    const orders = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.ownerKey, ownerKey))
      .orderBy(desc(commerceOrders.id))
      .limit(100);
    const orderIds = orders.map((item) => item.id);

    if (!orderIds.length) {
      return jsonResponse({ success: true, refunds: [], refundable_orders: [] });
    }

    const [refundRows, attemptRows] = await Promise.all([
      db
        .select()
        .from(paymentRefunds)
        .where(inArray(paymentRefunds.orderId, orderIds))
        .orderBy(desc(paymentRefunds.id))
        .limit(100),
      db
        .select()
        .from(paymentAttempts)
        .where(and(inArray(paymentAttempts.orderId, orderIds), eq(paymentAttempts.status, "paid")))
        .orderBy(desc(paymentAttempts.id)),
    ]);

    const orderMap = new Map(orders.map((item) => [item.id, item]));
    const attemptMap = new Map<number, typeof attemptRows[number]>();
    for (const attempt of attemptRows) {
      if (!attemptMap.has(attempt.orderId)) attemptMap.set(attempt.orderId, attempt);
    }

    const reservedByOrder = new Map<number, number>();
    for (const refund of refundRows) {
      if (["rejected", "cancelled"].includes(refund.status)) continue;
      reservedByOrder.set(
        refund.orderId,
        (reservedByOrder.get(refund.orderId) || 0) + Number(refund.amountToman || 0),
      );
    }

    return jsonResponse({
      success: true,
      refunds: refundRows.map((refund) => {
        const order = orderMap.get(refund.orderId);
        return {
          id: refund.id,
          order_no: order?.orderNo || "",
          amount_toman: refund.amountToman,
          destination: refund.destination,
          status: refund.status,
          reason: refund.reason,
          admin_note: refund.adminNote,
          created_at: refund.createdAt,
          updated_at: refund.updatedAt,
        };
      }),
      refundable_orders: orders
        .filter((order) => ["paid", "partially_refunded"].includes(order.status))
        .map((order) => {
          const paidAttempt = attemptMap.get(order.id);
          const alreadyReserved = reservedByOrder.get(order.id) || 0;
          return {
            order_no: order.orderNo,
            product_code: order.productCode,
            paid_amount_toman: order.finalAmountToman,
            refundable_amount_toman: Math.max(0, order.finalAmountToman - alreadyReserved),
            payment_method: paidAttempt?.gateway === "wallet" ? "wallet" : "gateway",
            created_at: order.createdAt,
          };
        })
        .filter((order) => order.refundable_amount_toman > 0),
    });
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات بازپرداخت در دسترس نیست." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای ثبت بازپرداخت وارد شوید." }, 401);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات درخواست معتبر نیست." }, 400);
  }

  const orderNo = cleanText(input.order_no, 100);
  const reason = cleanText(input.reason, 500);
  const destinationInput = cleanText(input.destination, 20);
  const requestedAmount = Math.round(Number(input.amount_toman || 0));

  if (!ORDER_PATTERN.test(orderNo)) {
    return jsonResponse({ success: false, message: "شماره سفارش معتبر نیست." }, 400);
  }
  if (reason.length < 5) {
    return jsonResponse({ success: false, message: "دلیل بازپرداخت را کامل تر بنویسید." }, 400);
  }

  try {
    const db = getDb();
    const [order] = await db
      .select()
      .from(commerceOrders)
      .where(and(eq(commerceOrders.orderNo, orderNo), eq(commerceOrders.ownerKey, ownerKey)))
      .limit(1);

    if (!order || !["paid", "partially_refunded"].includes(order.status)) {
      return jsonResponse({ success: false, message: "این سفارش در وضعیت قابل بازپرداخت نیست." }, 409);
    }

    const [paidAttempt] = await db
      .select()
      .from(paymentAttempts)
      .where(and(eq(paymentAttempts.orderId, order.id), eq(paymentAttempts.status, "paid")))
      .orderBy(desc(paymentAttempts.id))
      .limit(1);

    if (!paidAttempt) {
      return jsonResponse({ success: false, message: "پرداخت تایید شده این سفارش پیدا نشد." }, 409);
    }

    const existingRefunds = await db
      .select()
      .from(paymentRefunds)
      .where(eq(paymentRefunds.orderId, order.id));
    const reservedAmount = existingRefunds
      .filter((item) => !["rejected", "cancelled"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.amountToman || 0), 0);
    const remaining = Math.max(0, order.finalAmountToman - reservedAmount);
    const amountToman = requestedAmount > 0 ? requestedAmount : remaining;

    if (!Number.isSafeInteger(amountToman) || amountToman <= 0 || amountToman > remaining) {
      return jsonResponse(
        {
          success: false,
          message: "مبلغ بازپرداخت بیشتر از مانده قابل بازگشت این سفارش است.",
          refundable_amount_toman: remaining,
        },
        409,
      );
    }

    const originalMethod = paidAttempt.gateway === "wallet" ? "wallet" : "gateway";
    const destination = destinationInput === "wallet" ? "wallet" : destinationInput === "gateway" ? "gateway" : originalMethod;

    if (originalMethod === "wallet" && destination === "gateway") {
      return jsonResponse({ success: false, message: "پرداخت کیف پول فقط به کیف پول قابل بازگشت است." }, 400);
    }

    const [refund] = await db
      .insert(paymentRefunds)
      .values({
        orderId: order.id,
        paymentAttemptId: paidAttempt.id,
        amountToman,
        destination,
        status: "requested",
        reason,
      })
      .returning();

    return jsonResponse(
      {
        success: true,
        message: "درخواست بازپرداخت ثبت شد و برای بررسی مدیر مالی ارسال شد.",
        refund: {
          id: refund.id,
          order_no: order.orderNo,
          amount_toman: refund.amountToman,
          destination: refund.destination,
          status: refund.status,
        },
      },
      201,
    );
  } catch {
    return jsonResponse({ success: false, message: "ثبت درخواست بازپرداخت انجام نشد." }, 503);
  }
}
