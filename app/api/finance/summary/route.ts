import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  commerceOrders,
  invoices,
  walletTransactions,
} from "../../../../db/schema";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import { isWalletSettlementConfigured } from "../../../../lib/commerce-wallet-settlement";
import { ensureWallet, getFinanceOwnerKey } from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده اطلاعات مالی وارد شوید." }, 401);
  }

  try {
    const db = getDb();
    const wallet = await ensureWallet(ownerKey);

    const [transactions, orders, invoiceRows] = await Promise.all([
      db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, wallet.id))
        .orderBy(desc(walletTransactions.id))
        .limit(30),
      db
        .select()
        .from(commerceOrders)
        .where(eq(commerceOrders.ownerKey, ownerKey))
        .orderBy(desc(commerceOrders.id))
        .limit(30),
      db
        .select()
        .from(invoices)
        .where(eq(invoices.ownerKey, ownerKey))
        .orderBy(desc(invoices.id))
        .limit(30),
    ]);

    return jsonResponse({
      success: true,
      wallet_payment_ready: isWalletSettlementConfigured(),
      wallet: {
        available_balance_toman: wallet.availableBalanceToman,
        blocked_balance_toman: wallet.blockedBalanceToman,
        status: wallet.status,
      },
      transactions: transactions.map((item) => ({
        id: item.id,
        direction: item.direction,
        transactionType: item.transactionType,
        amountToman: item.amountToman,
        balanceAfterToman: item.balanceAfterToman,
        status: item.status,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        description: item.description,
        createdAt: item.createdAt,
      })),
      orders: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        orderType: order.orderType,
        productCode: order.productCode,
        finalAmountToman: order.finalAmountToman,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      invoices: invoiceRows.map((invoice) => ({
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        orderId: invoice.orderId,
        amountToman: invoice.amountToman,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
      })),
    });
  } catch {
    return jsonResponse(
      {
        success: false,
        message: "سرویس مالی هنوز به دیتابیس محیط اجرا متصل نشده است.",
      },
      503,
    );
  }
}
