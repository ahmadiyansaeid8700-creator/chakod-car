import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import {
  commerceOrders,
  invoices,
  paymentAttempts,
} from "../../../../../db/schema";
import { jsonResponse } from "../../../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVOICE_PATTERN = /^INV-[A-Z0-9-]{10,100}$/i;

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceNo: string }> },
) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده فاکتور وارد شوید." }, 401);
  }

  const { invoiceNo } = await context.params;
  if (!INVOICE_PATTERN.test(invoiceNo)) {
    return jsonResponse({ success: false, message: "شماره فاکتور معتبر نیست." }, 400);
  }

  try {
    const db = getDb();
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.invoiceNo, invoiceNo), eq(invoices.ownerKey, ownerKey)))
      .limit(1);

    if (!invoice) {
      return jsonResponse({ success: false, message: "فاکتور متعلق به این حساب پیدا نشد." }, 404);
    }

    const [[order], [attempt]] = await Promise.all([
      db.select().from(commerceOrders).where(eq(commerceOrders.id, invoice.orderId)).limit(1),
      db
        .select()
        .from(paymentAttempts)
        .where(and(eq(paymentAttempts.orderId, invoice.orderId), eq(paymentAttempts.status, "paid")))
        .orderBy(desc(paymentAttempts.id))
        .limit(1),
    ]);

    if (!order) {
      return jsonResponse({ success: false, message: "سفارش این فاکتور پیدا نشد." }, 409);
    }

    const metadata = parseMetadata(order.metadataJson);

    return jsonResponse({
      success: true,
      invoice: {
        invoice_no: invoice.invoiceNo,
        invoice_status: invoice.status,
        issued_at: invoice.issuedAt,
        order_no: order.orderNo,
        order_type: order.orderType,
        product_code: order.productCode,
        amount_toman: order.amountToman,
        discount_toman: order.discountToman,
        final_amount_toman: order.finalAmountToman,
        currency: order.currency,
        order_status: order.status,
        service_title:
          typeof metadata.service_title === "string"
            ? metadata.service_title
            : typeof metadata.banner_title === "string"
              ? metadata.banner_title
              : order.productCode,
        dealer_name: typeof metadata.dealer_name === "string" ? metadata.dealer_name : "",
        province: typeof metadata.province === "string" ? metadata.province : "",
        listing_id: Number(metadata.listing_id || 0) || null,
        payment_method: attempt?.gateway === "wallet" ? "wallet" : "gateway",
        gateway: attempt?.gateway || "",
        reference_id: attempt?.gatewayTransactionId || attempt?.authority || "",
        paid_at: attempt?.paidAt || "",
      },
    });
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات فاکتور در دسترس نیست." }, 503);
  }
}
