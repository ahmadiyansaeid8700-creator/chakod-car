import { NextRequest, NextResponse } from "next/server";

import {
  authApiUrl,
  parseJsonResponse,
  proxyAuthenticatedJson,
  readSessionToken,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "/api/my-dealers.php";
const COMMAND_CENTER_ENDPOINT = "/api/dealer-command-center.php";

type ManagedDealer = {
  dealer_id?: number;
  dealer_name?: string;
  role?: string;
};

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

async function hasOwnedDealer(request: NextRequest) {
  if (!readSessionToken(request)) {
    return { ok: false as const, status: 401, message: "برای ثبت نمایشگاه وارد حساب شوید." };
  }

  try {
    const response = await fetch(authApiUrl(COMMAND_CENTER_ENDPOINT), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await parseJsonResponse(response);

    if (response.status === 401 || response.status === 403) {
      return { ok: false as const, status: response.status, message: "نشست حساب معتبر نیست. دوباره وارد شوید." };
    }

    if (response.status >= 500) {
      return { ok: false as const, status: 502, message: "بررسی مالکیت نمایشگاه فعلاً انجام نشد. دوباره تلاش کنید." };
    }

    const dealers = Array.isArray(payload?.dealers) ? (payload?.dealers as ManagedDealer[]) : [];
    const ownsListedDealer = dealers.some((dealer) => dealer?.role === "owner");
    const ownsCurrentDealer = payload?.role === "owner";

    return { ok: true as const, value: ownsListedDealer || ownsCurrentDealer };
  } catch {
    return { ok: false as const, status: 502, message: "بررسی مالکیت نمایشگاه فعلاً انجام نشد. دوباره تلاش کنید." };
  }
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

  const ownership = await hasOwnedDealer(request);
  if (!ownership.ok) {
    return NextResponse.json({ success: false, message: ownership.message }, { status: ownership.status });
  }
  if (ownership.value) {
    return NextResponse.json(
      {
        success: false,
        message: "هر حساب می‌تواند مالک حداکثر یک نمایشگاه باشد. برای نمایشگاه موجود از بخش مجموعه‌های من استفاده کنید.",
      },
      { status: 409 },
    );
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
