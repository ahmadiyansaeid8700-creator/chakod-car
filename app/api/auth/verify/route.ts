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

const MAX_REQUEST_BYTES = 2_000;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

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

    const response = NextResponse.json(payload, {
      status: upstream.status,
      headers: secureJsonHeaders(),
    });

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
