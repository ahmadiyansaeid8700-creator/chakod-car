import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_URL = "https://api.chakod.com/api/geo-locations.php";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const upstream = new URL(UPSTREAM_URL);

  const province = request.nextUrl.searchParams.get("province")?.trim();
  const city = request.nextUrl.searchParams.get("city")?.trim();

  if (province) upstream.searchParams.set("province", province);
  if (city) upstream.searchParams.set("city", city);

  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();
    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        success: false,
        message: "پاسخ سرویس موقعیت معتبر نیست.",
        data: [],
      };
    }

    return NextResponse.json(payload, {
      status: response.ok ? 200 : response.status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "ارتباط با سرویس موقعیت برقرار نشد.",
        data: [],
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
