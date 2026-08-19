import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.CHAKOD_API_BASE || "https://api.chakod.com").replace(/\/+$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forwardedAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const authorization = request.headers.get("authorization");
  const sessionToken = request.headers.get("x-session-token");
  const cookie = request.headers.get("cookie");
  if (authorization) headers.Authorization = authorization;
  if (sessionToken) headers["X-Session-Token"] = sessionToken;
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function rejectCrossSiteMutation(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json(
      { success: false, message: "درخواست بین‌سایتی مجاز نیست." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}

async function proxy(request: NextRequest, method: "GET" | "PATCH") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const headers = forwardedAuthHeaders(request);
    if (method === "PATCH") headers["Content-Type"] = "application/json";

    const upstream = await fetch(
      `${API_BASE}/api/admin-businesses.php${method === "GET" ? request.nextUrl.search : ""}`,
      {
        method,
        cache: "no-store",
        headers,
        body: method === "PATCH" ? await request.text() : undefined,
        signal: controller.signal,
      },
    );

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "ارتباط با سرویس مدیریت کسب‌وکارها برقرار نشد." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return proxy(request, "PATCH");
}
