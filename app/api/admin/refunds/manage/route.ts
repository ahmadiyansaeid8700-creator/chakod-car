import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import {
  commerceOrders,
  featuredShowroomPlacements,
  paymentAttempts,
  paymentRefunds,
  wallets,
  walletTransactions,
} from "../../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../../lib/chakod-auth-proxy";
import {
  isGatewayRefundConfigured,
  settleGatewayRefund,
} from "../../../../../lib/commerce-refund-settlement";
import {
  createPublicReference,
  ensureWallet,
} from "../../../../../lib/finance-core";
import { readServerIdentity } from "../../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function requireAdmin() {
  const identity = await readServerIdentity("/api/admin-me.php");
  return identity?.success === true && identity.is_admin === true;
}

async function finalOrderStatus(orderId: number, paidAmount: number, currentRefundId: number, currentAmount: number) {
  const rows = await getDb()
    .select()
    .from(paymentRefunds)
    .where(eq(paymentRefunds.orderId, orderId));
  const refunded = rows.reduce((sum, item) => {
    if (item.id === currentRefundId) return sum + currentAmount;
    return item.status === "refunded" ? sum + Number(item.amountToman || 0) : sum;
  }, 0);
  return refunded >= paidAmount ? "refunded" : "partially_refunded";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت بازپرداخت مجاز نیست." }, 403);
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: paymentRefunds.id,
        order_id: paymentRefunds.orderId,
        payment_attempt_id: paymentRefunds.paymentAttemptId,
        amount_toman: paymentRefunds.amountToman,
        destination: paymentRefunds.destination,
        status: paymentRefunds.status,
        reason: paymentRefunds.reason,
        admin_note: paymentRefunds.adminNote,
        created_at: paymentRefunds.createdAt,
        updated_at: paymentRefunds.updatedAt,
        order_no: commerceOrders.orderNo,
        order_status: commerceOrders.status,
        paid_amount_toman: commerceOrders.finalAmountToman,
        payment_gateway: paymentAttempts.gateway,
        authority: paymentAttempts.authority,
        gateway_transaction_id: paymentAttempts.gatewayTransactionId,
      })
      .from(paymentRefunds)
      .leftJoin(commerceOrders, eq(commerceOrders.id, paymentRefunds.orderId))
      .leftJoin(paymentAttempts, eq(paymentAttempts.id, paymentRefunds.paymentAttemptId))
      .orderBy(desc(paymentRefunds.id))
      .limit(150);

    return jsonResponse({
      success: true,
      gateway_refund_ready: isGatewayRefundConfigured(),
      refunds: rows,
    });
  } catch {
    return jsonResponse({ success: false, message: "فهرست بازپرداخت ها در دسترس نیست." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  if (!(await requireAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت بازپرداخت مجاز نیست." }, 403);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "درخواست مدیریت معتبر نیست." }, 400);
  }

  const refundId = Math.round(Number(input.refund_id || 0));
  const action = cleanText(input.action, 30);
  const adminNote = cleanText(input.admin_note, 500);

  if (!Number.isSafeInteger(refundId) || refundId <= 0) {
    return jsonResponse({ success: false, message: "شناسه بازپرداخت معتبر نیست." }, 400);
  }
  if (!["approve", "reject", "execute"].includes(action)) {
    return jsonResponse({ success: false, message: "عملیات بازپرداخت معتبر نیست." }, 400);
  }

  try {
    const db = getDb();
    let [refund] = await db
      .select()
      .from(paymentRefunds)
      .where(eq(paymentRefunds.id, refundId))
      .limit(1);
    if (!refund) {
      return jsonResponse({ success: false, message: "درخواست بازپرداخت پیدا نشد." }, 404);
    }

    const [[order], [attempt]] = await Promise.all([
      db.select().from(commerceOrders).where(eq(commerceOrders.id, refund.orderId)).limit(1),
      db.select().from(paymentAttempts).where(eq(paymentAttempts.id, refund.paymentAttemptId)).limit(1),
    ]);
    if (!order || !attempt || attempt.status !== "paid") {
      return jsonResponse({ success: false, message: "سفارش یا پرداخت تایید شده پیدا نشد." }, 409);
    }

    if (refund.amountToman <= 0 || refund.amountToman > order.finalAmountToman) {
      return jsonResponse({ success: false, message: "مبلغ بازپرداخت از مبلغ پرداخت بیشتر است." }, 409);
    }

    if (action === "approve") {
      if (refund.status !== "requested") {
        return jsonResponse({ success: false, message: "این درخواست در وضعیت قابل تایید نیست." }, 409);
      }
      const [approvedRefund] = await db
        .update(paymentRefunds)
        .set({ status: "approved", adminNote, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(paymentRefunds.id, refund.id), eq(paymentRefunds.status, "requested")))
        .returning();
      if (!approvedRefund) {
        return jsonResponse({ success: false, message: "وضعیت بازپرداخت همزمان تغییر کرده است." }, 409);
      }
      return jsonResponse({ success: true, message: "بازپرداخت تایید شد و آماده اجرا است." });
    }

    if (action === "reject") {
      if (!["requested", "approved"].includes(refund.status)) {
        return jsonResponse({ success: false, message: "این درخواست در وضعیت قابل رد نیست." }, 409);
      }
      const [rejectedRefund] = await db
        .update(paymentRefunds)
        .set({ status: "rejected", adminNote, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(paymentRefunds.id, refund.id), eq(paymentRefunds.status, refund.status)))
        .returning();
      if (!rejectedRefund) {
        return jsonResponse({ success: false, message: "وضعیت بازپرداخت همزمان تغییر کرده است." }, 409);
      }
      return jsonResponse({ success: true, message: "درخواست بازپرداخت رد شد." });
    }

    if (refund.status === "refunded") {
      return jsonResponse({ success: true, reused: true, message: "این بازپرداخت قبلا انجام شده است." });
    }
    if (refund.status === "processing") {
      return jsonResponse(
        { success: false, pending: true, message: "این بازپرداخت در حال اجرا است و دوباره اجرا نمی شود." },
        202,
      );
    }
    if (refund.status !== "approved") {
      return jsonResponse({ success: false, message: "بازپرداخت ابتدا باید تایید شود." }, 409);
    }

    const [lockedRefund] = await db
      .update(paymentRefunds)
      .set({ status: "processing", adminNote, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(paymentRefunds.id, refund.id), eq(paymentRefunds.status, "approved")))
      .returning();

    if (!lockedRefund) {
      const [latestRefund] = await db
        .select()
        .from(paymentRefunds)
        .where(eq(paymentRefunds.id, refund.id))
        .limit(1);
      if (latestRefund?.status === "refunded") {
        return jsonResponse({ success: true, reused: true, message: "این بازپرداخت قبلا انجام شده است." });
      }
      return jsonResponse(
        { success: false, pending: latestRefund?.status === "processing", message: "اجرای این بازپرداخت توسط درخواست دیگری شروع شده است." },
        latestRefund?.status === "processing" ? 202 : 409,
      );
    }
    refund = lockedRefund;

    if (refund.destination === "wallet") {
      const existingCredit = await db
        .select()
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.referenceType, "refund"),
            eq(walletTransactions.referenceId, String(refund.id)),
            eq(walletTransactions.status, "completed"),
          ),
        )
        .limit(1);

      if (existingCredit.length) {
        await db
          .update(paymentRefunds)
          .set({ status: "refunded", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(paymentRefunds.id, refund.id));
        return jsonResponse({ success: true, reused: true, message: "اعتبار این بازپرداخت قبلا به کیف پول اضافه شده است." });
      }

      const wallet = await ensureWallet(order.ownerKey);
      const nextBalance = wallet.availableBalanceToman + refund.amountToman;
      const orderStatus = await finalOrderStatus(order.id, order.finalAmountToman, refund.id, refund.amountToman);

      await db.batch([
        db
          .update(wallets)
          .set({ availableBalanceToman: nextBalance, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(wallets.id, wallet.id)),
        db.insert(walletTransactions).values({
          walletId: wallet.id,
          direction: "credit",
          transactionType: "refund",
          amountToman: refund.amountToman,
          balanceAfterToman: nextBalance,
          status: "completed",
          referenceType: "refund",
          referenceId: String(refund.id),
          description: `بازپرداخت سفارش ${order.orderNo}`,
        }),
        db
          .update(paymentRefunds)
          .set({ status: "refunded", adminNote, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(and(eq(paymentRefunds.id, refund.id), eq(paymentRefunds.status, "processing"))),
        db
          .update(commerceOrders)
          .set({ status: orderStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(commerceOrders.id, order.id)),
        db
          .update(featuredShowroomPlacements)
          .set({ status: "cancelled", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(featuredShowroomPlacements.orderId, order.id)),
      ]);

      return jsonResponse({
        success: true,
        message: "بازپرداخت به کیف پول انجام شد.",
        destination: "wallet",
        available_balance_toman: nextBalance,
      });
    }

    if (!isGatewayRefundConfigured()) {
      await db
        .update(paymentRefunds)
        .set({ status: "approved", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(paymentRefunds.id, refund.id), eq(paymentRefunds.status, "processing")));
      return jsonResponse(
        { success: false, message: "Adapter بازپرداخت بانکی هنوز در Environment تنظیم نشده است." },
        503,
      );
    }

    const refundReference = createPublicReference("REF");
    const settlement = await settleGatewayRefund(request, {
      orderNo: order.orderNo,
      amountToman: refund.amountToman,
      authority: attempt.authority,
      gatewayTransactionId: attempt.gatewayTransactionId,
      refundReference,
    });

    if (!settlement.ok) {
      await db
        .update(paymentRefunds)
        .set({
          status: settlement.retryable ? "processing" : "approved",
          adminNote: adminNote || settlement.message,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(paymentRefunds.id, refund.id), eq(paymentRefunds.status, "processing")));

      return jsonResponse(
        {
          success: false,
          pending: settlement.retryable,
          message: settlement.message,
        },
        settlement.retryable ? 202 : settlement.status,
      );
    }

    const orderStatus = await finalOrderStatus(order.id, order.finalAmountToman, refund.id, refund.amountToman);
    await db.batch([
      db
        .update(paymentRefunds)
        .set({
          status: "refunded",
          adminNote: adminNote || `مرجع بازپرداخت: ${settlement.reference}`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(paymentRefunds.id, refund.id), eq(paymentRefunds.status, "processing"))),
      db
        .update(commerceOrders)
        .set({ status: orderStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(commerceOrders.id, order.id)),
      db
        .update(featuredShowroomPlacements)
        .set({ status: "cancelled", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(featuredShowroomPlacements.orderId, order.id)),
    ]);

    return jsonResponse({
      success: true,
      message: "بازپرداخت بانکی با موفقیت ثبت شد.",
      destination: "gateway",
      reference_id: settlement.reference,
    });
  } catch {
    return jsonResponse({ success: false, message: "عملیات بازپرداخت کامل نشد." }, 503);
  }
}
