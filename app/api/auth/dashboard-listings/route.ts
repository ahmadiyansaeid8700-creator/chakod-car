import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_QUERY_KEYS = ["page", "per_page", "status", "owner", "dealer_id", "q"] as const;

export async function GET(request: NextRequest) {
  const upstream = new URL(authApiUrl("/api/dashboard-listings.php"));

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = request.nextUrl.searchParams.get(key)?.trim();
    if (value) upstream.searchParams.set(key, value.slice(0, key === "q" ? 160 : 40));
  }

  try {
    const response = await fetch(upstream, {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await parseJsonResponse(response);
    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ سرویس آگهی‌ها معتبر نیست." }, 502);
    }
    return jsonResponse(payload, response.status);
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس آگهی‌ها برقرار نشد." }, 502);
  }
}
