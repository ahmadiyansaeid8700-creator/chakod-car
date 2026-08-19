import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  commerceOrders,
  invoices,
  paymentAttempts,
  paymentRefunds,
  walletTransactions,
  wallets,
} from "../../../../db/schema";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await readServerIdentity("/api/admin-me.php");
  if (identity?.success !== true || identity.is_admin !== true) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت مالی مجاز نیست." }, 403);
  }

  const limitInput = Number(request.nextUrl.searchParams.get("limit") || 100);
  const limit = Math.min(200, Math.max(20, Number.isFinite(limitInput) ? Math.round(limitInput) : 100));

  try {
    const db = getDb();
    const [orders, attempts, invoiceRows, refunds, walletRows, transactions] = await Promise.all([
      db.select().from(commerceOrders).orderBy(desc(commerceOrders.id)).limit(limit),
      db.select().from(paymentAttempts).orderBy(desc(paymentAttempts.id)).limit(limit),
      db.select().from(invoices).orderBy(desc(invoices.id)).limit(limit),
      db.select().from(paymentRefunds).orderBy(desc(paymentRefunds.id)).limit(limit),
      db.select().from(wallets).orderBy(desc(wallets.id)).limit(limit),
      db.select().from(walletTransactions).orderBy(desc(walletTransactions.id)).limit(limit),
    ]);

    const paidRevenueToman = attempts
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + Number(item.amountToman || 0), 0);
    const pendingOrders = orders.filter((item) => item.status === "pending_payment").length;
    const failedOrders = orders.filter((item) => item.status === "payment_failed").length;
    const refundRequestedToman = refunds
      .filter((item) => ["requested", "approved", "processing"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.amountToman || 0), 0);
    const walletBalanceToman = walletRows.reduce(
      (sum, item) => sum + Number(item.availableBalanceToman || 0),
      0,
    );

    return jsonResponse({
      success: true,
      generated_at: new Date().toISOString(),
      stats: {
        paid_revenue_toman: paidRevenueToman,
        pending_orders: pendingOrders,
        failed_orders: failedOrders,
        refund_requested_toman: refundRequestedToman,
        wallet_balance_toman: walletBalanceToman,
        orders_count: orders.length,
        invoices_count: invoiceRows.length,
      },
      orders,
      payment_attempts: attempts,
      invoices: invoiceRows,
      refunds,
      wallets: walletRows,
      wallet_transactions: transactions,
    });
  } catch {
    return jsonResponse(
      {
        success: false,
        message: "جداول مالی هنوز در دیتابیس محیط مدیریت ایجاد نشده‌اند.",
      },
      503,
    );
  }
}
