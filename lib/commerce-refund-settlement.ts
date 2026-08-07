import type { NextRequest } from "next/server";

import {
  authApiUrl,
  parseJsonResponse,
  requestIdentityHeaders,
} from "./chakod-auth-proxy";

export type RefundSettlementResult =
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

type RefundSettlementInput = {
  orderNo: string;
  amountToman: number;
  authority: string;
  gatewayTransactionId: string;
  refundReference: string;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function configuredEndpoint() {
  return cleanText(process.env.CHAKOD_REFUND_ENDPOINT, 500);
}

function refundUrl(endpoint: string) {
  if (/^https:\/\//i.test(endpoint)) return endpoint;
  return authApiUrl(endpoint.startsWith("/") ? endpoint : `/${endpoint}`);
}

export function isGatewayRefundConfigured() {
  return Boolean(configuredEndpoint());
}

export async function settleGatewayRefund(
  request: NextRequest,
  input: RefundSettlementInput,
): Promise<RefundSettlementResult> {
  const endpoint = configuredEndpoint();
  if (!endpoint) {
    return {
      ok: false,
      retryable: false,
      status: 503,
      message: "اتصال بازپرداخت بانکی هنوز در تنظیمات سرور فعال نشده است.",
      payload: null,
    };
  }

  const action = cleanText(process.env.CHAKOD_REFUND_ACTION, 80) || "refund_payment";
  const secret = cleanText(process.env.CHAKOD_REFUND_SECRET, 500);
  const headers: Record<string, string> = {
    ...requestIdentityHeaders(request),
    "Content-Type": "application/json",
  };
  if (secret) headers["X-Chakod-Refund-Secret"] = secret;

  try {
    const response = await fetch(refundUrl(endpoint), {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        action,
        order_no: input.orderNo,
        amount_toman: input.amountToman,
        authority: input.authority,
        gateway_transaction_id: input.gatewayTransactionId,
        refund_reference: input.refundReference,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await parseJsonResponse(response);

    if (response.ok && payload?.success === true) {
      const reference = cleanText(
        payload.refund_reference || payload.reference_id || payload.ref_id || input.refundReference,
        160,
      );
      return {
        ok: true,
        reference: reference || input.refundReference,
        payload,
      };
    }

    const alreadyRefunded =
      response.status === 409 &&
      (payload?.already_refunded === true || cleanText(payload?.status, 40) === "refunded");
    if (alreadyRefunded) {
      return {
        ok: true,
        reference: cleanText(payload?.refund_reference || payload?.reference_id, 160) || input.refundReference,
        payload: payload || { success: true, already_refunded: true },
      };
    }

    const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
    return {
      ok: false,
      retryable,
      status: response.status || 502,
      message: cleanText(payload?.message, 260) ||
        (retryable ? "درگاه موقتاً پاسخ نداد و بازپرداخت قابل Retry است." : "درگاه بازپرداخت را نپذیرفت."),
      payload,
    };
  } catch {
    return {
      ok: false,
      retryable: true,
      status: 502,
      message: "ارتباط با سرویس بازپرداخت بانکی کامل نشد و عملیات قابل Retry است.",
      payload: null,
    };
  }
}
