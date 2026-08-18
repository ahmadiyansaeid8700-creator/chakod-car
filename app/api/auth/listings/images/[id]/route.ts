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
    const manageResponse = await fetch(
      authApiUrl(`/api/listing-manage.php?listing_id=${encodeURIComponent(id)}`),
      {
        method: "GET",
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(20_000),
      },
    );
    const managePayload = await parseJsonResponse(manageResponse);

    if (!manageResponse.ok || managePayload?.success !== true) {
      return jsonResponse(
        {
          success: false,
          message:
            typeof managePayload?.message === "string"
              ? managePayload.message
              : "دسترسی مدیریت این آگهی قابل بررسی نیست.",
        },
        manageResponse.status >= 400 ? manageResponse.status : 502,
      );
    }

    const access = isRecord(managePayload.access) ? managePayload.access : {};
    if (access.can_manage === false) {
      return jsonResponse(
        { success: false, message: "اجازه مدیریت تصاویر این آگهی را ندارید." },
        403,
      );
    }

    const managedListing = isRecord(managePayload.listing) ? managePayload.listing : {};
    if (Number(managedListing.id || id) !== Number(id)) {
      return jsonResponse({ success: false, message: "آگهی قابل مدیریت پیدا نشد." }, 404);
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
    const manageImages = Array.isArray(managePayload.images) ? managePayload.images : [];
    const responseImages = Array.isArray(detailPayload?.images) ? detailPayload.images : [];
    const listingImages = Array.isArray(detailListing.images) ? detailListing.images : [];
    const images = manageImages.length
      ? manageImages
      : responseImages.length
        ? responseImages
        : listingImages;

    return jsonResponse({
      success: true,
      listing: {
        ...managedListing,
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
