import { NextRequest } from "next/server";

import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات حذف تصویر معتبر نیست." }, 400);
  }

  const listingId = Math.round(Number(input.listing_id || 0));
  const imageId = Math.round(Number(input.image_id || 0));

  if (!Number.isSafeInteger(listingId) || listingId <= 0 || !Number.isSafeInteger(imageId) || imageId <= 0) {
    return jsonResponse({ success: false, message: "شناسه آگهی یا تصویر معتبر نیست." }, 400);
  }

  return proxyAuthenticatedJson(request, "/api/delete-listing-image.php", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId, image_id: imageId }),
    timeoutMs: 20_000,
  });
}
