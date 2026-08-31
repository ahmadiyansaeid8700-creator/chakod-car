import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  commerceOrders,
  creditBalances,
  creditLedger,
  featuredShowroomPlacements,
  invoices,
  walletTransactions,
} from "../../../../db/schema";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import { isWalletSettlementConfigured } from "../../../../lib/commerce-wallet-settlement";
import { STORY_CREDIT_ASSET } from "../../../../lib/credit-ledger";
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

    const [transactions, orders, invoiceRows, creditBalanceRows, creditTransactions] = await Promise.all([
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
      db
        .select({
          assetCode: creditBalances.assetCode,
          availableQuantity: creditBalances.availableQuantity,
        })
        .from(creditBalances)
        .where(
          and(
            eq(creditBalances.ownerKey, ownerKey),
            eq(creditBalances.assetCode, STORY_CREDIT_ASSET),
          ),
        ),
      db
        .select({
          id: creditLedger.id,
          assetCode: creditLedger.assetCode,
          quantityDelta: creditLedger.quantityDelta,
          transactionType: creditLedger.transactionType,
          referenceType: creditLedger.referenceType,
          referenceId: creditLedger.referenceId,
          counterpartyOwnerKey: creditLedger.counterpartyOwnerKey,
          createdAt: creditLedger.createdAt,
        })
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.ownerKey, ownerKey),
            eq(creditLedger.assetCode, STORY_CREDIT_ASSET),
          ),
        )
        .orderBy(desc(creditLedger.id))
        .limit(30),
    ]);

    const paidOrderIds = orders
      .filter((order) => order.status === "paid")
      .map((order) => order.id);

    if (paidOrderIds.length) {
      await db
        .update(featuredShowroomPlacements)
        .set({
          status: "pending_review",
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(featuredShowroomPlacements.ownerKey, ownerKey),
            eq(featuredShowroomPlacements.status, "pending_payment"),
            inArray(featuredShowroomPlacements.orderId, paidOrderIds),
          ),
        );
    }

    const storyCreditBalance = creditBalanceRows.find(
      (item) => item.assetCode === STORY_CREDIT_ASSET,
    );

    return jsonResponse({
      success: true,
      wallet_payment_ready: isWalletSettlementConfigured(),
      wallet: {
        available_balance_toman: wallet.availableBalanceToman,
        blocked_balance_toman: wallet.blockedBalanceToman,
        status: wallet.status,
      },
      credit_balances: [
        {
          asset_code: STORY_CREDIT_ASSET,
          available_quantity: storyCreditBalance?.availableQuantity || 0,
        },
      ],
      credit_transactions: creditTransactions.map((item) => ({
        id: item.id,
        asset_code: item.assetCode,
        quantity_delta: item.quantityDelta,
        transaction_type: item.transactionType,
        reference_type: item.referenceType,
        reference_id: item.referenceId,
        counterparty_owner_key: item.counterpartyOwnerKey,
        created_at: item.createdAt,
      })),
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
