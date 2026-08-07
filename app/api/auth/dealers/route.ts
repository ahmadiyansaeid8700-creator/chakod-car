import { NextRequest, NextResponse } from "next/server";

import {
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "/api/my-dealers.php";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9+]/g, "")
    .slice(0, 16);
}

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, ENDPOINT);
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "اطلاعات ارسالی معتبر نیست." }, { status: 400 });
  }

  const dealerName = cleanText(payload.dealer_name, 120);
  const dealerPhone = normalizePhone(payload.dealer_phone);
  const province = cleanText(payload.province, 80);
  const city = cleanText(payload.city, 80);
  const neighborhood = cleanText(payload.neighborhood, 100);
  const address = cleanText(payload.address, 500);

  if (dealerName.length < 2) {
    return NextResponse.json({ success: false, message: "نام نمایشگاه را کامل وارد کنید." }, { status: 422 });
  }

  if (!province || !city) {
    return NextResponse.json({ success: false, message: "استان و شهر را انتخاب کنید." }, { status: 422 });
  }

  return proxyAuthenticatedJson(request, ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      dealer_name: dealerName,
      dealer_phone: dealerPhone,
      province,
      city,
      neighborhood,
      address,
    }),
    timeoutMs: 20_000,
  });
}
