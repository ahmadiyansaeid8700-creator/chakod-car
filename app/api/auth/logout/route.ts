import { NextRequest, NextResponse } from "next/server";

import {
  authApiUrl,
  CHAKOD_SESSION_COOKIE,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
  secureJsonHeaders,
  sessionCookieOptions,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  let payload: Record<string, unknown> = {
    success: true,
    message: "با موفقیت از حساب خارج شدید.",
  };
  let status = 200;

  try {
    const body = (await request.text()) || "{}";
    const upstream = await fetch(authApiUrl("/api/logout.php"), {
      method: "POST",
      cache: "no-store",
      headers: {
        ...requestIdentityHeaders(request),
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(12_000),
    });

    const upstreamPayload = await parseJsonResponse(upstream);
    if (upstreamPayload) payload = upstreamPayload;
    status = upstream.status;
  } catch {
    payload = {
      success: false,
      message: "نشست محلی پاک شد، اما ارتباط با سرور برای خروج کامل برقرار نشد.",
    };
    status = 502;
  }

  const response = NextResponse.json(payload, {
    status,
    headers: secureJsonHeaders(),
  });

  response.cookies.set({
    name: CHAKOD_SESSION_COOKIE,
    value: "",
    ...sessionCookieOptions(request, 0),
  });

  return response;
}
