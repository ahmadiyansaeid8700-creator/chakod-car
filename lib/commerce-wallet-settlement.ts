import type { NextRequest } from "next/server";

import {
  authApiUrl,
  parseJsonResponse,
  requestIdentityHeaders,
} from "./chakod-auth-proxy";

export type WalletSettlementResult =
  | {
      ok: true;
      reference: string;
      payload: Record<string, unknown>;
    }
  | {
      ok: false;
      retryable: boolean;
      status: number;
      message: string;
      payload: Record<string, unknown> | null;
    };

type WalletSettlementInput = {
  orderNo: string;
  serviceKey: string;
  amountToman: number;
  idempotencyKey: string;
  walletReference: string;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function configuredEndpoint() {
  return cleanText(process.env.CHAKOD_WALLET_SETTLEMENT_ENDPOINT, 500);
}

function settlementUrl(endpoint: string) {
  if (/^https:\/\//i.test(endpoint)) return endpoint;
  return authApiUrl(endpoint.startsWith("/") ? endpoint : `/${endpoint}`);
}

export function isWalletSettlementConfigured() {
  return Boolean(configuredEndpoint());
}

export async function settleCommerceWalletOrder(
  request: NextRequest,
  input: WalletSettlementInput,
): Promise<WalletSettlementResult> {
  const endpoint = configuredEndpoint();
  if (!endpoint) {
    return {
      ok: false,
      retryable: false,
      status: 503,
      message: "اتصال نهایی پرداخت کیف پول به Commerce هنوز در محیط اجرا تنظیم نشده است.",
      payload: null,
    };
  }

  const action =
    cleanText(process.env.CHAKOD_WALLET_SETTLEMENT_ACTION, 80) ||
    "pay_order_with_wallet";
  const secret = cleanText(process.env.CHAKOD_WALLET_SETTLEMENT_SECRET, 500);
  const headers: Record<string, string> = {
    ...requestIdentityHeaders(request),
    "Content-Type": "application/json",
  };
  if (secret) headers["X-Chakod-Wallet-Settlement-Secret"] = secret;

  try {
    const response = await fetch(settlementUrl(endpoint), {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        action,
        payment_method: "wallet",
        order_no: input.orderNo,
        service_key: input.serviceKey,
        amount_toman: input.amountToman,
        idempotency_key: input.idempotencyKey,
        wallet_reference: input.walletReference,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await parseJsonResponse(response);

    if (
      response.ok &&
      payload?.success === true
    ) {
      const reference = cleanText(
        payload.reference_id ||
          payload.ref_id ||
          payload.transaction_id ||
          payload.wallet_reference ||
          input.walletReference,
        160,
      );
      return {
        ok: true,
        reference: reference || input.walletReference,
        payload,
      };
    }

    if (
      response.status === 409 &&
      (payload?.already_paid === true || cleanText(payload?.status, 40) === "paid")
    ) {
      return {
        ok: true,
        reference:
          cleanText(payload?.reference_id || payload?.ref_id, 160) ||
          input.walletReference,
        payload: payload || { success: true, already_paid: true },
      };
    }

    const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
    return {
      ok: false,
      retryable,
      status: response.status || 502,
      message:
        cleanText(payload?.message, 260) ||
        (retryable
          ? "Commerce موقتاً پاسخ نداد؛ مبلغ فقط رزرو شده و دوباره قابل بررسی است."
          : "Commerce پرداخت کیف پول را نپذیرفت."),
      payload,
    };
  } catch {
    return {
      ok: false,
      retryable: true,
      status: 502,
      message: "ارتباط با Commerce کامل نشد؛ مبلغ فقط رزرو شده و قابل Retry است.",
      payload: null,
    };
  }
}
