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

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const headers = requestIdentityHeaders(request);
  if (!headers.Authorization) {
    return jsonResponse({ success: false, message: "برای آپلود تصویر وارد شوید." }, 401);
  }

  let input: FormData;
  try {
    input = await request.formData();
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات فایل معتبر نیست." }, 400);
  }

  const listingId = String(input.get("listing_id") || "").trim();
  const file = input.get("image");

  if (!/^\d+$/.test(listingId)) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  if (!(file instanceof File)) {
    return jsonResponse({ success: false, message: "فایل تصویر انتخاب نشده است." }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return jsonResponse({ success: false, message: "فرمت تصویر باید JPG، PNG یا WEBP باشد." }, 400);
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    return jsonResponse({ success: false, message: "حجم تصویر باید حداکثر ۶ مگابایت باشد." }, 400);
  }

  const body = new FormData();
  body.set("listing_id", listingId);
  body.set("image", file, file.name);

  try {
    const upstream = await fetch(authApiUrl("/api/upload-listing-image.php"), {
      method: "POST",
      cache: "no-store",
      headers,
      body,
      signal: AbortSignal.timeout(120_000),
    });
    const payload = await parseJsonResponse(upstream);

    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ سرویس آپلود معتبر نیست." }, 502);
    }

    return jsonResponse(payload, upstream.status);
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس آپلود برقرار نشد." }, 502);
  }
}
