import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import { wallets, walletTransactions } from "../../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../../lib/chakod-auth-proxy";
import {
  createPublicReference,
  ensureWallet,
  getFinanceAccountScope,
  listOwnedFinanceAccounts,
} from "../../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeAmount(value: unknown) {
  const amount = Math.round(Number(value || 0));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
}

export async function GET(request: NextRequest) {
  const accounts = await listOwnedFinanceAccounts(request);
  if (!accounts.length) {
    return jsonResponse({ success: false, message: "برای مشاهده کیف پول‌ها وارد شوید." }, 401);
  }

  const sourceScope = getFinanceAccountScope(request);
  const source = accounts.find((account) => account.scope === sourceScope);
  if (!source) {
    return jsonResponse(
      {
        success: false,
        code: "finance_scope_not_owned",
        message: "حساب فعال اجازه دسترسی مالی ندارد. حساب را دوباره انتخاب کنید.",
      },
      403,
    );
  }

  return jsonResponse({
    success: true,
    source: {
      scope: source.scope,
      kind: source.kind,
      id: source.id,
      type: source.type,
      name: source.name,
    },
    targets: accounts
      .filter((account) => account.scope !== source.scope)
      .map((account) => ({
        scope: account.scope,
        kind: account.kind,
        id: account.id,
        type: account.type,
        name: account.name,
      })),
    rules: {
      available_balance_only: true,
      owned_accounts_only: true,
      memberships_excluded: true,
    },
  });
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const accounts = await listOwnedFinanceAccounts(request);
  if (!accounts.length) {
    return jsonResponse({ success: false, message: "برای انتقال موجودی وارد شوید." }, 401);
  }

  const activeScope = getFinanceAccountScope(request);
  const source = accounts.find((account) => account.scope === activeScope);
  if (!source) {
    return jsonResponse(
      {
        success: false,
        code: "finance_scope_not_owned",
        message: "حساب فعال اجازه انتقال موجودی ندارد.",
      },
      403,
    );
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات انتقال معتبر نیست." }, 400);
  }

  const expectedSourceScope = clean(input.source_scope, 100);
  const destinationScope = clean(input.destination_scope, 100);
  const idempotencyKey = clean(input.idempotency_key, 100);
  const amountToman = safeAmount(input.amount_toman);

  if (!expectedSourceScope || expectedSourceScope !== source.scope) {
    return jsonResponse(
      {
        success: false,
        code: "finance_scope_changed",
        message: "حساب فعال تغییر کرده است. صفحه کیف پول را تازه‌سازی کنید.",
      },
      409,
    );
  }

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه امن انتقال معتبر نیست." }, 400);
  }

  if (!amountToman) {
    return jsonResponse({ success: false, message: "مبلغ انتقال را صحیح وارد کنید." }, 422);
  }

  const destination = accounts.find((account) => account.scope === destinationScope);
  if (!destination || destination.scope === source.scope) {
    return jsonResponse(
      {
        success: false,
        code: "destination_not_owned",
        message: "مقصد انتقال باید یکی از کیف پول‌های متعلق به خودتان باشد.",
      },
      403,
    );
  }

  const db = getDb();

  try {
    const [sourceWallet, destinationWallet] = await Promise.all([
      ensureWallet(source.ownerKey),
      ensureWallet(destination.ownerKey),
    ]);

    if (sourceWallet.id === destinationWallet.id) {
      return jsonResponse({ success: false, message: "مبدأ و مقصد انتقال یکسان است." }, 409);
    }
    if (sourceWallet.status !== "active" || destinationWallet.status !== "active") {
      return jsonResponse({ success: false, message: "یکی از کیف پول‌ها در وضعیت فعال نیست." }, 409);
    }

    const [existingTransfer] = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.walletId, sourceWallet.id),
          eq(walletTransactions.referenceType, "wallet_transfer"),
          eq(walletTransactions.referenceId, idempotencyKey),
        ),
      )
      .orderBy(desc(walletTransactions.id))
      .limit(1);

    if (existingTransfer?.status === "completed") {
      const [latestSource] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, sourceWallet.id))
        .limit(1);
      return jsonResponse({
        success: true,
        reused: true,
        message: "این انتقال قبلاً انجام شده است.",
        available_balance_toman: latestSource?.availableBalanceToman || 0,
      });
    }

    const [debitedSource] = await db
      .update(wallets)
      .set({
        availableBalanceToman: sql`${wallets.availableBalanceToman} - ${amountToman}`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(wallets.id, sourceWallet.id),
          eq(wallets.status, "active"),
          gte(wallets.availableBalanceToman, amountToman),
        ),
      )
      .returning();

    if (!debitedSource) {
      const [latestSource] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, sourceWallet.id))
        .limit(1);
      return jsonResponse(
        {
          success: false,
          code: "insufficient_wallet_balance",
          message: "موجودی قابل استفاده این کیف پول برای انتقال کافی نیست.",
          available_balance_toman: latestSource?.availableBalanceToman || 0,
        },
        409,
      );
    }

    const transferReference = createPublicReference("TRF");
    const destinationBalanceAfter = destinationWallet.availableBalanceToman + amountToman;

    try {
      await db.batch([
        db
          .update(wallets)
          .set({
            availableBalanceToman: sql`${wallets.availableBalanceToman} + ${amountToman}`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(
            and(
              eq(wallets.id, destinationWallet.id),
              eq(wallets.status, "active"),
            ),
          ),
        db.insert(walletTransactions).values({
          walletId: sourceWallet.id,
          direction: "debit",
          transactionType: "wallet_transfer",
          amountToman,
          balanceAfterToman: debitedSource.availableBalanceToman,
          status: "completed",
          referenceType: "wallet_transfer",
          referenceId: idempotencyKey,
          description: `انتقال به ${destination.name} · ${transferReference}`,
        }),
        db.insert(walletTransactions).values({
          walletId: destinationWallet.id,
          direction: "credit",
          transactionType: "wallet_transfer",
          amountToman,
          balanceAfterToman: destinationBalanceAfter,
          status: "completed",
          referenceType: "wallet_transfer",
          referenceId: idempotencyKey,
          description: `انتقال از ${source.name} · ${transferReference}`,
        }),
      ]);
    } catch {
      await db
        .update(wallets)
        .set({
          availableBalanceToman: sql`${wallets.availableBalanceToman} + ${amountToman}`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(wallets.id, sourceWallet.id));

      return jsonResponse(
        {
          success: false,
          code: "wallet_transfer_reverted",
          message: "انتقال کامل نشد و مبلغ به کیف پول مبدأ برگشت.",
        },
        503,
      );
    }

    return jsonResponse({
      success: true,
      message: `انتقال به «${destination.name}» انجام شد.`,
      reference_id: transferReference,
      source: { scope: source.scope, name: source.name },
      destination: { scope: destination.scope, name: destination.name },
      amount_toman: amountToman,
      available_balance_toman: debitedSource.availableBalanceToman,
    });
  } catch {
    return jsonResponse(
      { success: false, message: "سرویس انتقال کیف پول فعلاً در دسترس نیست." },
      503,
    );
  }
}
