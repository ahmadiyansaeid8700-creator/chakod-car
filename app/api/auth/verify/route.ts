import { NextRequest, NextResponse } from "next/server";

import {
  authApiUrl,
  CHAKOD_SESSION_COOKIE,
  CHAKOD_SESSION_MAX_AGE,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  secureJsonHeaders,
  sessionCookieOptions,
} from "../../../../lib/chakod-auth-proxy";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_REFUND_VERSION,
  CURRENT_TERMS_VERSION,
  markLatestLoginLegalAcceptanceVerified,
} from "../../../../lib/legal-consent";
import {
  createStagingDemoToken,
  isStagingDemoEnabled,
  stagingDemoRolePayload,
  STAGING_DEMO_CODE,
} from "../../../../lib/staging-demo-session";

const MAX_REQUEST_BYTES = 2_000;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const STAGING_DEMO_MAX_AGE = 8 * 60 * 60;

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

    const body = await request.text();
    if (body.length > MAX_REQUEST_BYTES) {
      return jsonResponse({ success: false, message: "حجم درخواست ورود معتبر نیست." }, 413);
    }

    let mobile = "";
    let code = "";
    try {
      const parsed = JSON.parse(body) as { mobile?: unknown; code?: unknown };
      mobile = normalizeMobile(parsed.mobile);
      code = normalizeCode(parsed.code);
    } catch {
      return jsonResponse({ success: false, message: "اطلاعات ورود معتبر نیست." }, 400);
    }

    if (!/^09\d{9}$/.test(mobile)) {
      return jsonResponse({ success: false, message: "شماره موبایل معتبر نیست." }, 400);
    }

    if (isStagingDemoEnabled(request.nextUrl.hostname)) {
      if (code !== STAGING_DEMO_CODE) {
        return jsonResponse({ success: false, message: "کد آزمایشی صحیح نیست." }, 400);
      }

      const sessionToken = createStagingDemoToken(mobile);
      const response = NextResponse.json(
        {
          success: true,
          message: "ورود آزمایشی با موفقیت انجام شد.",
          session_token: sessionToken,
          ...stagingDemoRolePayload(mobile),
          legal: {
            terms_version: CURRENT_TERMS_VERSION,
            privacy_version: CURRENT_PRIVACY_VERSION,
            refund_version: CURRENT_REFUND_VERSION,
            acceptance_recorded: false,
            staging_demo: true,
          },
        },
        { status: 200, headers: secureJsonHeaders() },
      );
      response.cookies.set({
        name: CHAKOD_SESSION_COOKIE,
        value: sessionToken,
        ...sessionCookieOptions(request, STAGING_DEMO_MAX_AGE),
      });
      return response;
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": request.headers.get("content-type") || "application/json",
    };

    const userAgent = request.headers.get("user-agent");
    if (userAgent) headers["User-Agent"] = userAgent.slice(0, 500);

    const cloudflareIp = request.headers.get("cf-connecting-ip");
    if (cloudflareIp) headers["CF-Connecting-IP"] = cloudflareIp.slice(0, 64);

    const upstream = await fetch(authApiUrl("/api/verify-login-code.php"), {
      method: "POST",
      cache: "no-store",
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await parseJsonResponse(upstream);
    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ سرویس ورود معتبر نیست." }, 502);
    }

    let legalAcceptanceRecorded = false;
    if (upstream.ok && payload.success === true) {
      legalAcceptanceRecorded = await markLatestLoginLegalAcceptanceVerified(mobile);
    }

    const response = NextResponse.json(
      {
        ...payload,
        legal: {
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
          refund_version: CURRENT_REFUND_VERSION,
          acceptance_recorded: legalAcceptanceRecorded,
        },
      },
      {
        status: upstream.status,
        headers: secureJsonHeaders(),
      },
    );

    const token = typeof payload.session_token === "string" ? payload.session_token : "";
    if (upstream.ok && payload.success === true && TOKEN_PATTERN.test(token)) {
      response.cookies.set({
        name: CHAKOD_SESSION_COOKIE,
        value: token,
        ...sessionCookieOptions(request, CHAKOD_SESSION_MAX_AGE),
      });
    }

    return response;
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس ورود برقرار نشد." }, 502);
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

function normalizeCode(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "")
    .slice(0, 6);
}
