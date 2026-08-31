import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import { creditBalances, creditLedger } from "../../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../../lib/chakod-auth-proxy";
import {
  creditTransferValues,
  isInsufficientCreditError,
  STORY_CREDIT_ASSET,
} from "../../../../../lib/credit-ledger";
import { listOwnedFinanceAccounts } from "../../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDEMPOTENCY_PATTERN = /^[a-z0-9_-]{12,100}$/i;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const accounts = await listOwnedFinanceAccounts(request);
  if (!accounts.length) {
    return jsonResponse({ success: false, message: "برای انتقال اعتبار وارد شوید." }, 401);
  }
  const transferableAccounts = accounts.filter(
    (account) => account.kind === "personal" || account.verificationStatus === "verified",
  );

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات انتقال معتبر نیست." }, 400);
  }

  const sourceScope = clean(input.source_scope, 100);
  const destinationScope = clean(input.destination_scope, 100);
  const assetCode = clean(input.asset_code, 64);
  const idempotencyKey = clean(input.idempotency_key, 100);
  const quantity = Number(input.quantity);

  if (assetCode !== STORY_CREDIT_ASSET) {
    return jsonResponse({ success: false, message: "نوع اعتبار برای انتقال پشتیبانی نمی‌شود." }, 422);
  }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return jsonResponse({ success: false, message: "تعداد اعتبار را صحیح وارد کنید." }, 422);
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ success: false, message: "شناسه امن انتقال معتبر نیست." }, 400);
  }

  const source = transferableAccounts.find((account) => account.scope === sourceScope);
  const destination = transferableAccounts.find((account) => account.scope === destinationScope);
  if (!source || !destination) {
    return jsonResponse(
      {
        success: false,
        code: "credit_scope_not_transferable",
        message: "مبدأ و مقصد باید حساب‌های متعلق به خودتان و تأییدشده باشند.",
      },
      403,
    );
  }
  if (source.scope === destination.scope) {
    return jsonResponse({ success: false, message: "مبدأ و مقصد انتقال یکسان است." }, 409);
  }

  const [debit, credit] = creditTransferValues({
    sourceOwnerKey: source.ownerKey,
    destinationOwnerKey: destination.ownerKey,
    assetCode,
    quantity,
    idempotencyKey,
    referenceType: "credit_transfer",
    referenceId: idempotencyKey,
    metadata: {
      source_scope: source.scope,
      destination_scope: destination.scope,
    },
  });

  const db = getDb();
  try {
    await db.batch([
      db
        .insert(creditLedger)
        .values(debit)
        .onConflictDoNothing({ target: creditLedger.idempotencyKey }),
      db
        .insert(creditLedger)
        .values(credit)
        .onConflictDoNothing({ target: creditLedger.idempotencyKey }),
    ]);

    const [latestSource] = await db
      .select({ availableQuantity: creditBalances.availableQuantity })
      .from(creditBalances)
      .where(
        and(
          eq(creditBalances.ownerKey, source.ownerKey),
          eq(creditBalances.assetCode, assetCode),
        ),
      )
      .limit(1);

    return jsonResponse({
      success: true,
      message: `انتقال ${quantity} اعتبار به «${destination.name}» انجام شد.`,
      asset_code: assetCode,
      quantity,
      available_quantity: latestSource?.availableQuantity || 0,
      source: { scope: source.scope, name: source.name },
      destination: { scope: destination.scope, name: destination.name },
    });
  } catch (error) {
    if (isInsufficientCreditError(error)) {
      return jsonResponse(
        {
          success: false,
          code: "insufficient_credit",
          message: "موجودی اعتبار استوری برای این انتقال کافی نیست.",
        },
        409,
      );
    }
    return jsonResponse(
      { success: false, message: "سرویس انتقال اعتبار فعلاً در دسترس نیست." },
      503,
    );
  }
}
