import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  commerceOrders,
  featuredShowroomPlacements,
  invoices,
  paymentAttempts,
  wallets,
  walletTransactions,
} from "../../../../db/schema";
import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  readSessionToken,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";
import {
  createPublicReference,
  ensureWallet,
  getFinanceOwnerKey,
} from "../../../../lib/finance-core";
import {
  buildStagingDemoCommerce,
  isStagingDemoOrderMetadata,
} from "../../../../lib/staging-demo-commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_PATTERN = /^[a-z0-9_-]{6,100}$/i;
const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readGatewayReference(payload: Record<string, unknown>) {
  return cleanText(
    payload.reference_id || payload.ref_id || payload.transaction_id || payload.card_holder,
    128,
  );
}

async function moveFeaturedShowroomToReview(orderId: number) {
  await getDb()
    .update(featuredShowroomPlacements)
    .set({
      status: "pending_review",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        eq(featuredShowroomPlacements.orderId, orderId),
        eq(featuredShowroomPlacements.status, "pending_payment"),
      ),
    );
}

export async function POST(request: NextRequest) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای تأیید پرداخت وارد شوید." }, 401);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات تأیید پرداخت معتبر نیست." }, 400);
  }

  const authority = cleanText(input.authority, 128);
  const status = cleanText(input.status, 32).toUpperCase();
  const orderNo = cleanText(input.order_no, 100);
  const idempotencyKey = cleanText(input.idempotency_key, 100);
  const stagingDemo = buildStagingDemoCommerce({
    hostname: request.nextUrl.hostname,
    token: readSessionToken(request),
  });

  if (!authority || !/^[a-z0-9_-]{6,128}$/i.test(authority)) {
    return jsonResponse({ success: false, message: "شناسه پرداخت معتبر نیست." }, 400);
  }

  if (!ORDER_PATTERN.test(orderNo) || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه سفارش معتبر نیست." }, 400);
  }

  if (status && !["OK", "NOK", "SUCCESS", "FAILED", "CANCELED"].includes(status)) {
    return jsonResponse({ success: false, message: "وضعیت بازگشت درگاه معتبر نیست." }, 400);
  }

  try {
    const db = getDb();
    const [order] = await db
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
      return jsonResponse({ success: false, message: "سفارش متعلق به این حساب پیدا نشد." }, 404);
    }

    if (order.status === "paid") {
      await moveFeaturedShowroomToReview(order.id);

      const [existingInvoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.orderId, order.id))
        .limit(1);

      return jsonResponse({
        success: true,
        staging_demo: Boolean(stagingDemo && isStagingDemoOrderMetadata(order.metadataJson)),
        message: "این پرداخت قبلاً با موفقیت ثبت شده است.",
        invoice_id: existingInvoice?.id,
        invoice_no: existingInvoice?.invoiceNo,
      });
    }

    if (stagingDemo) {
      if (!isStagingDemoOrderMetadata(order.metadataJson) || !/^TEST-[a-z0-9-]+$/i.test(authority)) {
        return jsonResponse({ success: false, message: "شناسه پرداخت آزمایشی معتبر نیست." }, 403);
      }
      if (!["OK", "SUCCESS"].includes(status)) {
        return jsonResponse({ success: false, message: "پرداخت آزمایشی تکمیل نشد." }, 400);
      }

      const invoiceNo = createPublicReference("TEST-INV");
      const responseJson = JSON.stringify({
        reference_id: authority,
        gateway: "staging-demo",
        verified: true,
        staging_demo: true,
      });
      const paidAt = new Date().toISOString();

      if (order.orderType === "wallet_charge") {
        const wallet = await ensureWallet(ownerKey);
        const nextBalance = wallet.availableBalanceToman + order.finalAmountToman;
        await db.batch([
          db
            .update(commerceOrders)
            .set({ status: "paid", updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(commerceOrders.id, order.id)),
          db.insert(paymentAttempts).values({
            orderId: order.id,
            gateway: "staging-demo",
            authority,
            gatewayTransactionId: authority,
            idempotencyKey: order.idempotencyKey,
            amountToman: order.finalAmountToman,
            status: "paid",
            responseJson,
            paidAt,
          }),
          db.insert(invoices).values({
            invoiceNo,
            orderId: order.id,
            ownerKey,
            amountToman: order.finalAmountToman,
            status: "paid",
          }),
          db
            .update(wallets)
            .set({
              availableBalanceToman: nextBalance,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(wallets.id, wallet.id)),
          db.insert(walletTransactions).values({
            walletId: wallet.id,
            direction: "credit",
            transactionType: "staging_demo_charge",
            amountToman: order.finalAmountToman,
            balanceAfterToman: nextBalance,
            status: "completed",
            referenceType: "order",
            referenceId: order.orderNo,
            description: "افزایش موجودی آزمایشی بدون جابه‌جایی پول واقعی",
          }),
        ]);
      } else {
        await db.batch([
          db
            .update(commerceOrders)
            .set({ status: "paid", updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(commerceOrders.id, order.id)),
          db.insert(paymentAttempts).values({
            orderId: order.id,
            gateway: "staging-demo",
            authority,
            gatewayTransactionId: authority,
            idempotencyKey: order.idempotencyKey,
            amountToman: order.finalAmountToman,
            status: "paid",
            responseJson,
            paidAt,
          }),
          db.insert(invoices).values({
            invoiceNo,
            orderId: order.id,
            ownerKey,
            amountToman: order.finalAmountToman,
            status: "paid",
          }),
        ]);
      }

      return jsonResponse({
        success: true,
        staging_demo: true,
        message: "پرداخت آزمایشی ثبت شد؛ هیچ پول واقعی جابه‌جا نشده است.",
        reference_id: authority,
        invoice_no: invoiceNo,
      });
    }

    if (["NOK", "FAILED", "CANCELED"].includes(status)) {
      await db
        .update(commerceOrders)
        .set({ status: "payment_failed", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(commerceOrders.id, order.id));

      return jsonResponse({ success: false, message: "پرداخت در درگاه لغو یا ناموفق شد." }, 400);
    }

    const upstream = await fetch(authApiUrl("/api/payments/verify.php"), {
      method: "POST",
      cache: "no-store",
      headers: {
        ...requestIdentityHeaders(request),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authority,
        status,
        order_no: order.orderNo,
        service_key: order.productCode,
        amount_toman: order.finalAmountToman,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await parseJsonResponse(upstream);

    if (!upstream.ok || payload?.success !== true) {
      return jsonResponse(
        {
          success: false,
          message: cleanText(payload?.message, 240) || "تأیید پرداخت از سمت درگاه انجام نشد.",
        },
        upstream.status >= 400 ? upstream.status : 502,
      );
    }

    const verifiedPayload = payload as Record<string, unknown>;
    const invoiceNo = createPublicReference("INV");
    const gatewayReference = readGatewayReference(verifiedPayload);
    const gateway = cleanText(verifiedPayload.gateway, 32) || "primary";
    const responseJson = JSON.stringify({
      reference_id: gatewayReference,
      gateway,
      verified: true,
    });
    const paidAt = new Date().toISOString();

    if (order.orderType === "wallet_charge") {
      const wallet = await ensureWallet(ownerKey);
      const nextBalance = wallet.availableBalanceToman + order.finalAmountToman;

      await db.batch([
        db
          .update(commerceOrders)
          .set({ status: "paid", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(commerceOrders.id, order.id)),
        db.insert(paymentAttempts).values({
          orderId: order.id,
          gateway,
          authority,
          gatewayTransactionId: gatewayReference,
          idempotencyKey: order.idempotencyKey,
          amountToman: order.finalAmountToman,
          status: "paid",
          responseJson,
          paidAt,
        }),
        db.insert(invoices).values({
          invoiceNo,
          orderId: order.id,
          ownerKey,
          amountToman: order.finalAmountToman,
          status: "paid",
        }),
        db
          .update(wallets)
          .set({
            availableBalanceToman: nextBalance,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(wallets.id, wallet.id)),
        db.insert(walletTransactions).values({
          walletId: wallet.id,
          direction: "credit",
          transactionType: "gateway_charge",
          amountToman: order.finalAmountToman,
          balanceAfterToman: nextBalance,
          status: "completed",
          referenceType: "order",
          referenceId: order.orderNo,
          description: "افزایش موجودی از درگاه پرداخت",
        }),
      ]);
    } else {
      await db.batch([
        db
          .update(commerceOrders)
          .set({ status: "paid", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(commerceOrders.id, order.id)),
        db.insert(paymentAttempts).values({
          orderId: order.id,
          gateway,
          authority,
          gatewayTransactionId: gatewayReference,
          idempotencyKey: order.idempotencyKey,
          amountToman: order.finalAmountToman,
          status: "paid",
          responseJson,
          paidAt,
        }),
        db.insert(invoices).values({
          invoiceNo,
          orderId: order.id,
          ownerKey,
          amountToman: order.finalAmountToman,
          status: "paid",
        }),
        db
          .update(featuredShowroomPlacements)
          .set({ status: "pending_review", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(
            and(
              eq(featuredShowroomPlacements.orderId, order.id),
              eq(featuredShowroomPlacements.status, "pending_payment"),
            ),
          ),
      ]);
    }

    return jsonResponse({
      success: true,
      message: "پرداخت تأیید شد و فاکتور صادر شد.",
      reference_id: gatewayReference || authority,
      invoice_no: invoiceNo,
    });
  } catch {
    return jsonResponse(
      { success: false, message: "ثبت نهایی پرداخت در سرویس مالی انجام نشد." },
      503,
    );
  }
}
