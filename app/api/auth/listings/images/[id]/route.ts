import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  requestIdentityHeaders,
} from "../../../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  const headers = requestIdentityHeaders(request);
  if (!headers.Authorization) {
    return jsonResponse({ success: false, message: "برای مدیریت تصاویر وارد شوید." }, 401);
  }

  try {
    const ownershipQuery = new URLSearchParams({
      listing_id: id,
      per_page: "1",
      page: "1",
    });
    const ownershipResponse = await fetch(
      authApiUrl(`/api/dashboard-listings.php?${ownershipQuery.toString()}`),
      {
        method: "GET",
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(20_000),
      },
    );
    const ownershipPayload = await parseJsonResponse(ownershipResponse);

    if (!ownershipResponse.ok || ownershipPayload?.success !== true) {
      return jsonResponse(
        {
          success: false,
          message:
            typeof ownershipPayload?.message === "string"
              ? ownershipPayload.message
              : "مالکیت آگهی قابل بررسی نیست.",
        },
        ownershipResponse.status >= 400 ? ownershipResponse.status : 502,
      );
    }

    const direct = ownershipPayload.listing;
    const collection = Array.isArray(ownershipPayload.data) ? ownershipPayload.data : [];
    const ownershipListing = [direct, ...collection]
      .filter(isRecord)
      .find((item) => Number(item.id) === Number(id));

    if (!ownershipListing) {
      return jsonResponse(
        { success: false, message: "این آگهی در فهرست آگهی‌های قابل مدیریت شما نیست." },
        403,
      );
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
    const responseImages = Array.isArray(detailPayload?.images) ? detailPayload.images : [];
    const listingImages = Array.isArray(detailListing.images) ? detailListing.images : [];
    const images = responseImages.length ? responseImages : listingImages;

    return jsonResponse({
      success: true,
      listing: {
        ...ownershipListing,
        ...detailListing,
        id: Number(id),
      },
      images,
      detail_available: detailResponse.ok && detailPayload?.success === true,
    });
  } catch {
    return jsonResponse(
      { success: false, message: "ارتباط با سرویس تصاویر آگهی برقرار نشد." },
      502,
    );
  }
}
