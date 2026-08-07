import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import {
  commerceOrders,
  invoices,
  paymentAttempts,
  wallets,
  walletTransactions,
} from "../../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../../lib/chakod-auth-proxy";
import {
  isWalletSettlementConfigured,
  settleCommerceWalletOrder,
} from "../../../../../lib/commerce-wallet-settlement";
import {
  createPublicReference,
  ensureWallet,
  getFinanceOwnerKey,
} from "../../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_PATTERN = /^[a-z0-9_-]{6,100}$/i;
const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeSettlementResponse(
  payload: Record<string, unknown> | null,
  reference = "",
) {
  return JSON.stringify({
    success: payload?.success === true,
    status: cleanText(payload?.status, 40),
    message: cleanText(payload?.message, 260),
    reference_id: cleanText(
      payload?.reference_id || payload?.ref_id || reference,
      160,
    ),
  });
}

async function paidResponse(orderId: number) {
  const [invoice] = await getDb()
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, orderId))
    .limit(1);

  return jsonResponse({
    success: true,
    reused: true,
    message: "این سفارش قبلاً از کیف پول پرداخت شده است.",
    invoice_no: invoice?.invoiceNo || "",
  });
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای پرداخت از کیف پول وارد شوید." }, 401);
  }

  if (!isWalletSettlementConfigured()) {
    return jsonResponse(
      {
        success: false,
        message: "اتصال پرداخت کیف پول به Commerce هنوز در تنظیمات سرور فعال نشده است.",
        code: "wallet_settlement_unconfigured",
      },
      503,
    );
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

  const orderNo = cleanText(input.order_no, 100);
  const idempotencyKey = cleanText(input.idempotency_key, 100);

  if (!ORDER_PATTERN.test(orderNo) || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه سفارش معتبر نیست." }, 400);
  }

  const db = getDb();

  try {
    let [order] = await db
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

    if (order.orderType === "wallet_charge") {
      return jsonResponse(
        { success: false, message: "افزایش موجودی کیف پول فقط از طریق درگاه بانکی انجام می‌شود." },
        400,
      );
    }

    if (order.status === "paid") return paidResponse(order.id);

    if (!["pending_payment", "wallet_processing"].includes(order.status)) {
      return jsonResponse(
        { success: false, message: "این سفارش در وضعیت قابل پرداخت با کیف پول نیست." },
        409,
      );
    }

    const wallet = await ensureWallet(ownerKey);
    if (wallet.status !== "active") {
      return jsonResponse({ success: false, message: "کیف پول این حساب فعال نیست." }, 409);
    }

    const attemptKey = `wallet-${order.id}`;
    let [attempt] = await db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.orderId, order.id),
          eq(paymentAttempts.gateway, "wallet"),
        ),
      )
      .orderBy(desc(paymentAttempts.id))
      .limit(1);
    let [walletTransaction] = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.walletId, wallet.id),
          eq(walletTransactions.referenceType, "order"),
          eq(walletTransactions.referenceId, order.orderNo),
          eq(walletTransactions.status, "reserved"),
        ),
      )
      .orderBy(desc(walletTransactions.id))
      .limit(1);

    if (order.status === "pending_payment") {
      const [lockedOrder] = await db
        .update(commerceOrders)
        .set({ status: "wallet_processing", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(
          and(
            eq(commerceOrders.id, order.id),
            eq(commerceOrders.status, "pending_payment"),
          ),
        )
        .returning();

      if (!lockedOrder) {
        const [latestOrder] = await db
          .select()
          .from(commerceOrders)
          .where(eq(commerceOrders.id, order.id))
          .limit(1);

        if (latestOrder?.status === "paid") return paidResponse(order.id);
        return jsonResponse(
          { success: false, message: "پرداخت همین سفارش هم‌اکنون در حال پردازش است." },
          409,
        );
      }
      order = lockedOrder;

      const [reservedWallet] = await db
        .update(wallets)
        .set({
          availableBalanceToman: sql`${wallets.availableBalanceToman} - ${order.finalAmountToman}`,
          blockedBalanceToman: sql`${wallets.blockedBalanceToman} + ${order.finalAmountToman}`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(wallets.id, wallet.id),
            eq(wallets.status, "active"),
            gte(wallets.availableBalanceToman, order.finalAmountToman),
          ),
        )
        .returning();

      if (!reservedWallet) {
        await db
          .update(commerceOrders)
          .set({ status: "pending_payment", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(
            and(
              eq(commerceOrders.id, order.id),
              eq(commerceOrders.status, "wallet_processing"),
            ),
          );

        const [latestWallet] = await db
          .select()
          .from(wallets)
          .where(eq(wallets.id, wallet.id))
          .limit(1);

        return jsonResponse(
          {
            success: false,
            code: "insufficient_wallet_balance",
            message: "موجودی کیف پول برای پرداخت این سفارش کافی نیست.",
            available_balance_toman: latestWallet?.availableBalanceToman || 0,
            required_amount_toman: order.finalAmountToman,
          },
          409,
        );
      }

      const walletReference = createPublicReference("WAL");
      const paymentAttemptStatement = attempt
        ? db
            .update(paymentAttempts)
            .set({
              authority: walletReference,
              gatewayTransactionId: "",
              status: "processing",
              requestJson: JSON.stringify({
                order_no: order.orderNo,
                service_key: order.productCode,
                payment_method: "wallet",
              }),
              responseJson: "{}",
              paidAt: null,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(paymentAttempts.id, attempt.id))
        : db.insert(paymentAttempts).values({
            orderId: order.id,
            gateway: "wallet",
            authority: walletReference,
            gatewayTransactionId: "",
            idempotencyKey: attemptKey,
            amountToman: order.finalAmountToman,
            status: "processing",
            requestJson: JSON.stringify({
              order_no: order.orderNo,
              service_key: order.productCode,
              payment_method: "wallet",
            }),
          });

      try {
        await db.batch([
          paymentAttemptStatement,
          db.insert(walletTransactions).values({
            walletId: wallet.id,
            direction: "debit",
            transactionType: "service_purchase",
            amountToman: order.finalAmountToman,
            balanceAfterToman: reservedWallet.availableBalanceToman,
            status: "reserved",
            referenceType: "order",
            referenceId: order.orderNo,
            description: `رزرو پرداخت خدمت ${order.productCode}`,
          }),
        ]);
      } catch {
        await db.batch([
          db
            .update(wallets)
            .set({
              availableBalanceToman: sql`${wallets.availableBalanceToman} + ${order.finalAmountToman}`,
              blockedBalanceToman: sql`MAX(0, ${wallets.blockedBalanceToman} - ${order.finalAmountToman})`,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(wallets.id, wallet.id)),
          db
            .update(commerceOrders)
            .set({ status: "pending_payment", updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(commerceOrders.id, order.id)),
        ]);
        return jsonResponse(
          { success: false, message: "ثبت رزرو کیف پول کامل نشد و مبلغ آزاد شد." },
          503,
        );
      }

      [attempt] = await db
        .select()
        .from(paymentAttempts)
        .where(eq(paymentAttempts.idempotencyKey, attemptKey))
        .limit(1);
      [walletTransaction] = await db
        .select()
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.walletId, wallet.id),
            eq(walletTransactions.referenceType, "order"),
            eq(walletTransactions.referenceId, order.orderNo),
            eq(walletTransactions.status, "reserved"),
          ),
        )
        .orderBy(desc(walletTransactions.id))
        .limit(1);
    }

    if (!attempt || !walletTransaction || !attempt.authority) {
      return jsonResponse(
        {
          success: false,
          code: "wallet_payment_recovery_required",
          message: "پرداخت کیف پول نیاز به بررسی وضعیت رزرو دارد و دوباره برداشت نمی‌شود.",
        },
        409,
      );
    }

    const settlement = await settleCommerceWalletOrder(request, {
      orderNo: order.orderNo,
      serviceKey: order.productCode,
      amountToman: order.finalAmountToman,
      idempotencyKey: order.idempotencyKey,
      walletReference: attempt.authority,
    });

    if (!settlement.ok) {
      if (settlement.retryable) {
        await db
          .update(paymentAttempts)
          .set({
            status: "pending_review",
            responseJson: safeSettlementResponse(settlement.payload),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(paymentAttempts.id, attempt.id));

        return jsonResponse(
          {
            success: false,
            pending: true,
            retryable: true,
            code: "wallet_settlement_pending",
            message: settlement.message,
            order_no: order.orderNo,
          },
          202,
        );
      }

      await db.batch([
        db
          .update(wallets)
          .set({
            availableBalanceToman: sql`${wallets.availableBalanceToman} + ${order.finalAmountToman}`,
            blockedBalanceToman: sql`MAX(0, ${wallets.blockedBalanceToman} - ${order.finalAmountToman})`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(wallets.id, wallet.id)),
        db
          .update(commerceOrders)
          .set({ status: "pending_payment", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(commerceOrders.id, order.id)),
        db
          .update(paymentAttempts)
          .set({
            status: "failed",
            responseJson: safeSettlementResponse(settlement.payload),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(paymentAttempts.id, attempt.id)),
        db
          .update(walletTransactions)
          .set({
            status: "failed",
            description: `پرداخت خدمت ${order.productCode} نهایی نشد؛ مبلغ آزاد شد.`,
          })
          .where(eq(walletTransactions.id, walletTransaction.id)),
      ]);

      return jsonResponse(
        {
          success: false,
          code: "wallet_settlement_rejected",
          message: settlement.message,
        },
        settlement.status >= 400 ? settlement.status : 409,
      );
    }

    const invoiceNo = createPublicReference("INV");
    const paidAt = new Date().toISOString();

    await db.batch([
      db
        .update(wallets)
        .set({
          blockedBalanceToman: sql`MAX(0, ${wallets.blockedBalanceToman} - ${order.finalAmountToman})`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(wallets.id, wallet.id)),
      db
        .update(commerceOrders)
        .set({ status: "paid", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(commerceOrders.id, order.id)),
      db
        .update(paymentAttempts)
        .set({
          status: "paid",
          gatewayTransactionId: settlement.reference,
          responseJson: safeSettlementResponse(settlement.payload, settlement.reference),
          paidAt,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(paymentAttempts.id, attempt.id)),
      db
        .update(walletTransactions)
        .set({
          status: "completed",
          description: `پرداخت خدمت ${order.productCode} از کیف پول`,
        })
        .where(eq(walletTransactions.id, walletTransaction.id)),
      db.insert(invoices).values({
        invoiceNo,
        orderId: order.id,
        ownerKey,
        amountToman: order.finalAmountToman,
        status: "paid",
      }),
    ]);

    const [finalWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, wallet.id))
      .limit(1);

    return jsonResponse({
      success: true,
      message: "پرداخت از کیف پول انجام شد، خدمت در Commerce نهایی شد و فاکتور صادر شد.",
      order_no: order.orderNo,
      invoice_no: invoiceNo,
      reference_id: settlement.reference,
      available_balance_toman: finalWallet?.availableBalanceToman || 0,
    });
  } catch {
    return jsonResponse(
      {
        success: false,
        message: "پرداخت کیف پول کامل نشد. در Retry بعدی از برداشت دوباره جلوگیری می‌شود.",
      },
      503,
    );
  }
}
