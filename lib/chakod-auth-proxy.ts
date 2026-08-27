import { NextRequest, NextResponse } from "next/server";
import {
  authApiUrl,
  parseJsonResponse,
  type JsonRecord,
} from "./chakod-api-core";

export { authApiUrl, parseJsonResponse } from "./chakod-api-core";
export type { JsonRecord } from "./chakod-api-core";

export const CHAKOD_SESSION_COOKIE = "chakod_session";
export const CHAKOD_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function secureJsonHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  };
}

export function jsonResponse(payload: JsonRecord, status = 200): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: secureJsonHeaders(),
  });
}

export function readSessionToken(request: NextRequest): string {
  const cookieToken = request.cookies.get(CHAKOD_SESSION_COOKIE)?.value?.trim() || "";
  if (TOKEN_PATTERN.test(cookieToken)) return cookieToken;

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^\s*Bearer\s+([^\s]+)\s*$/i);
  const bearerToken = match?.[1]?.trim() || "";
  if (TOKEN_PATTERN.test(bearerToken)) return bearerToken;

  const legacyHeader =
    request.headers.get("x-session-token") ||
    request.headers.get("x-auth-token") ||
    request.headers.get("chakod-session-token") ||
    "";

  return TOKEN_PATTERN.test(legacyHeader.trim()) ? legacyHeader.trim() : "";
}

export function requestIdentityHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = readSessionToken(request);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Session-Token"] = token;
  }

  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent.slice(0, 500);

  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) headers["CF-Connecting-IP"] = cloudflareIp.slice(0, 64);

  return headers;
}

export function rejectCrossSiteMutation(request: NextRequest): NextResponse | null {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return jsonResponse({ success: false, message: "درخواست نامعتبر است." }, 403);
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return jsonResponse({ success: false, message: "مبدأ درخواست مجاز نیست." }, 403);
  }

  return null;
}

export async function proxyAuthenticatedJson(
  request: NextRequest,
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: string;
    timeoutMs?: number;
  } = {},
): Promise<NextResponse> {
  const method = options.method || "GET";
  const headers = requestIdentityHeaders(request);

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const upstream = await fetch(authApiUrl(endpoint), {
      method,
      cache: "no-store",
      headers,
      body: options.body,
      signal: AbortSignal.timeout(options.timeoutMs || 15_000),
    });

    const payload = await parseJsonResponse(upstream);
    if (!payload) {
      return jsonResponse(
        { success: false, message: "پاسخ سرویس حساب کاربری معتبر نیست." },
        502,
      );
    }

    return jsonResponse(payload, upstream.status);
  } catch {
    return jsonResponse(
      { success: false, message: "ارتباط با سرویس حساب کاربری برقرار نشد." },
      502,
    );
  }
}

export function sessionCookieOptions(request: NextRequest, maxAge: number) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isChakodHost = hostname === "chakod.com" || hostname.endsWith(".chakod.com");

  return {
    httpOnly: true,
    secure: isChakodHost,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    ...(isChakodHost ? { domain: ".chakod.com" } : {}),
  };
}
