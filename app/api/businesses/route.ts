import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.CHAKOD_API_BASE || "https://api.chakod.com").replace(/\/+$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(
      `${API_BASE}/api/public-businesses.php${request.nextUrl.search}`,
      {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
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
      { success: false, message: "ارتباط با سرویس کسب‌وکارهای خودرو برقرار نشد." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeout);
  }
}
