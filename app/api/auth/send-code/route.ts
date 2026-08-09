import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  secureJsonHeaders,
} from "../../../../lib/chakod-auth-proxy";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_REFUND_VERSION,
  CURRENT_TERMS_VERSION,
  recordLoginLegalAcceptance,
} from "../../../../lib/legal-consent";

const MAX_REQUEST_BYTES = 2_000;

type SendCodePayload = {
  mobile?: unknown;
  accept_terms?: unknown;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ success: false, message: "حجم درخواست ورود معتبر نیست." }, 413);
    }

    const value = (await request.json()) as SendCodePayload;
    const mobile = normalizeMobile(value.mobile);

    if (!/^09\d{9}$/.test(mobile)) {
      return jsonResponse({ success: false, message: "شماره موبایل معتبر نیست." }, 400);
    }

    if (value.accept_terms !== true) {
      return jsonResponse({ success: false, message: "پذیرش قوانین برای ورود لازم است." }, 400);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const userAgent = request.headers.get("user-agent");
    if (userAgent) headers["User-Agent"] = userAgent.slice(0, 500);

    const cloudflareIp = request.headers.get("cf-connecting-ip");
    if (cloudflareIp) headers["CF-Connecting-IP"] = cloudflareIp.slice(0, 64);

    const upstream = await fetch(authApiUrl("/api/send-login-code.php"), {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        mobile,
        accept_terms: true,
        terms_version: CURRENT_TERMS_VERSION,
        privacy_version: CURRENT_PRIVACY_VERSION,
        refund_version: CURRENT_REFUND_VERSION,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await parseJsonResponse(upstream);
    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ سرویس پیامک معتبر نیست." }, 502);
    }

    if (upstream.ok && payload.success === true) {
      await recordLoginLegalAcceptance(mobile, {
        ipAddress: cloudflareIp,
        userAgent,
        source: "login_otp",
      });
    }

    return Response.json(
      {
        ...payload,
        legal: {
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
          refund_version: CURRENT_REFUND_VERSION,
        },
      },
      {
        status: upstream.status,
        headers: secureJsonHeaders(),
      },
    );
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس پیامک برقرار نشد." }, 502);
  }
}

function normalizeMobile(value: unknown) {
  if (typeof value !== "string") return "";

  let mobile = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\s\-_()]/g, "");

  if (mobile.startsWith("+98")) mobile = `0${mobile.slice(3)}`;
  if (mobile.startsWith("98") && mobile.length === 12) {
    mobile = `0${mobile.slice(2)}`;
  }

  return mobile;
}
