import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function readOwnedListing(request: NextRequest, id: string) {
  const headers = requestIdentityHeaders(request);
  if (!headers.Authorization) {
    return { ok: false as const, status: 401, message: "برای ویرایش آگهی وارد شوید." };
  }

  const query = new URLSearchParams({ listing_id: id, per_page: "1", page: "1" });
  const ownershipResponse = await fetch(
    authApiUrl(`/api/dashboard-listings.php?${query.toString()}`),
    {
      method: "GET",
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(20_000),
    },
  );
  const ownershipPayload = await parseJsonResponse(ownershipResponse);

  if (!ownershipResponse.ok || ownershipPayload?.success !== true) {
    return {
      ok: false as const,
      status: ownershipResponse.status >= 400 ? ownershipResponse.status : 502,
      message:
        typeof ownershipPayload?.message === "string"
          ? ownershipPayload.message
          : "مالکیت آگهی قابل بررسی نیست.",
    };
  }

  const direct = ownershipPayload.listing;
  const collection = Array.isArray(ownershipPayload.data) ? ownershipPayload.data : [];
  const ownershipListing = [direct, ...collection]
    .filter(isRecord)
    .find((item) => Number(item.id) === Number(id));

  if (!ownershipListing) {
    return {
      ok: false as const,
      status: 403,
      message: "این آگهی در فهرست آگهی‌های قابل مدیریت شما نیست.",
    };
  }

  const detailResponse = await fetch(
    authApiUrl(`/api/listing-detail.php?id=${encodeURIComponent(id)}`),
    {
      method: "GET",
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(20_000),
    },
  );
  const detailPayload = await parseJsonResponse(detailResponse);
  const detailListing = isRecord(detailPayload?.data) ? detailPayload.data : {};

  return {
    ok: true as const,
    headers,
    listing: { ...ownershipListing, ...detailListing, id: Number(id) },
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  try {
    const result = await readOwnedListing(request, id);
    if (!result.ok) {
      return jsonResponse({ success: false, message: result.message }, result.status);
    }

    return jsonResponse({ success: true, listing: result.listing });
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس ویرایش برقرار نشد." }, 502);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات ویرایش معتبر نیست." }, 400);
  }

  const title = cleanText(input.title, 180);
  const description = cleanText(input.description, 4000);
  const province = cleanText(input.province, 80);
  const city = cleanText(input.city, 80);
  const neighborhood = cleanText(input.neighborhood, 120);
  const color = cleanText(input.color, 60);
  const bodyStatus = cleanText(input.body_status, 80);
  const transmission = cleanText(input.transmission, 60);
  const fuelType = cleanText(input.fuel_type, 60);
  const productionYear = cleanText(input.production_year, 8);
  const mileageKm = Math.round(Number(input.mileage_km || 0));
  const priceToman = Math.round(Number(input.price_toman || 0));

  if (title.length < 5) {
    return jsonResponse({ success: false, message: "عنوان آگهی باید حداقل ۵ نویسه باشد." }, 400);
  }

  if (!province || !city) {
    return jsonResponse({ success: false, message: "استان و شهر را کامل کنید." }, 400);
  }

  if (!/^\d{4}$/.test(productionYear)) {
    return jsonResponse({ success: false, message: "سال تولید معتبر نیست." }, 400);
  }

  if (!Number.isSafeInteger(mileageKm) || mileageKm < 0 || mileageKm > 10_000_000) {
    return jsonResponse({ success: false, message: "مقدار کارکرد معتبر نیست." }, 400);
  }

  if (!Number.isSafeInteger(priceToman) || priceToman < 0 || priceToman > 100_000_000_000) {
    return jsonResponse({ success: false, message: "قیمت واردشده معتبر نیست." }, 400);
  }

  try {
    const ownership = await readOwnedListing(request, id);
    if (!ownership.ok) {
      return jsonResponse({ success: false, message: ownership.message }, ownership.status);
    }

    const upstream = await fetch(authApiUrl("/api/update-listing.php"), {
      method: "POST",
      cache: "no-store",
      headers: {
        ...ownership.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listing_id: Number(id),
        title,
        description,
        province,
        city,
        neighborhood,
        color,
        body_status: bodyStatus,
        transmission,
        fuel_type: fuelType,
        production_year: productionYear,
        mileage_km: mileageKm,
        price_toman: priceToman,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await parseJsonResponse(upstream);

    if (!payload) {
      return jsonResponse(
        {
          success: false,
          message:
            upstream.status === 404
              ? "سرویس ذخیره ویرایش هنوز در بک‌اند فعال نشده است."
              : "پاسخ سرویس ویرایش معتبر نیست.",
        },
        upstream.status === 404 ? 503 : 502,
      );
    }

    return jsonResponse(payload, upstream.status);
  } catch {
    return jsonResponse({ success: false, message: "ذخیره ویرایش در سرور انجام نشد." }, 502);
  }
}
