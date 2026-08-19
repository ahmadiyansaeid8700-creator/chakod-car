import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authApiUrl, sessionCookieOptions } from "../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDestination(request: NextRequest): URL {
  const requested = request.nextUrl.searchParams.get("to") || "/";
  const path = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return new URL(path, request.nextUrl.origin);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const normalized = code.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
  const destination = safeDestination(request);
  if (!normalized) return NextResponse.redirect(destination);

  const visitorToken = request.cookies.get("chakod_affiliate_visitor")?.value || randomUUID();
  try {
    const upstream = await fetch(authApiUrl("/api/affiliate-track.php"), {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": request.headers.get("user-agent") || "",
        "CF-Connecting-IP": request.headers.get("cf-connecting-ip") || "",
      },
      body: JSON.stringify({
        code: normalized,
        visitor_token: visitorToken,
        landing_path: destination.pathname + destination.search,
        referrer_url: request.headers.get("referer") || "",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const payload = (await upstream.json()) as {
      success?: boolean;
      affiliate_code?: string;
      max_age_seconds?: number;
    };
    if (!upstream.ok || !payload.success || !payload.affiliate_code) {
      return NextResponse.redirect(destination);
    }

    const maxAge = Math.max(86_400, Number(payload.max_age_seconds || 2_592_000));
    const response = NextResponse.redirect(destination);
    response.cookies.set(
      "chakod_affiliate_ref",
      payload.affiliate_code,
      sessionCookieOptions(request, maxAge),
    );
    response.cookies.set(
      "chakod_affiliate_visitor",
      visitorToken,
      sessionCookieOptions(request, maxAge),
    );
    return response;
  } catch {
    return NextResponse.redirect(destination);
  }
}
