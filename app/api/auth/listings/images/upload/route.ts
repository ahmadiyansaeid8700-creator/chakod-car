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
const MAX_IMAGE_COUNT = 6;
const UPLOAD_TIMEOUT_MS = 60_000;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function imageKey(value: unknown, index: number) {
  if (!isRecord(value)) return `row:${index}`;
  const id = Number(value.image_id || value.id || 0);
  if (Number.isSafeInteger(id) && id > 0) return `id:${id}`;
  const url = String(value.image_url || value.url || "").trim();
  return url ? `url:${url}` : `row:${index}`;
}

function managedImageCount(payload: JsonRecord) {
  const listing = isRecord(payload.listing) ? payload.listing : {};
  const images = [
    ...(Array.isArray(payload.images) ? payload.images : []),
    ...(Array.isArray(listing.images) ? listing.images : []),
  ];
  const unique = new Set(images.map((item, index) => imageKey(item, index)));
  const reported = Math.round(Number(listing.image_count || payload.image_count || 0));
  return Math.max(unique.size, Number.isSafeInteger(reported) && reported > 0 ? reported : 0);
}

function isTimeoutError(error: unknown) {
  return error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
}

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

  try {
    const manageResponse = await fetch(
      authApiUrl(`/api/listing-manage.php?listing_id=${encodeURIComponent(listingId)}`),
      {
        method: "GET",
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(20_000),
      },
    );
    const managePayload = await parseJsonResponse(manageResponse);

    if (!manageResponse.ok || !managePayload || managePayload.success !== true) {
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
      return jsonResponse({ success: false, message: "اجازه مدیریت تصاویر این آگهی را ندارید." }, 403);
    }

    if (managedImageCount(managePayload) >= MAX_IMAGE_COUNT) {
      return jsonResponse(
        { success: false, message: "برای هر آگهی حداکثر ۶ تصویر قابل ثبت است." },
        409,
      );
    }

    const body = new FormData();
    body.set("listing_id", listingId);
    body.set("image", file, file.name);

    const upstream = await fetch(authApiUrl("/api/upload-listing-image.php"), {
      method: "POST",
      cache: "no-store",
      headers,
      body,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    const payload = await parseJsonResponse(upstream);

    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ سرویس آپلود معتبر نیست." }, 502);
    }

    return jsonResponse(payload, upstream.status);
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        message: isTimeoutError(error)
          ? "زمان آپلود تصویر بیش از حد طولانی شد. دوباره تلاش کنید."
          : "ارتباط با سرویس آپلود برقرار نشد.",
      },
      502,
    );
  }
}
