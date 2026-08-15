import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای بارگذاری بنر وارد حساب شوید." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return jsonResponse({ success: false, message: "حجم تصویر بیش از حد مجاز است." }, 413);
  }

  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    const slot = String(incoming.get("slot") || "");

    if (slot !== "desktop" && slot !== "mobile") {
      return jsonResponse({ success: false, message: "نوع بنر معتبر نیست." }, 400);
    }
    if (!(file instanceof File) || file.size <= 0) {
      return jsonResponse({ success: false, message: "فایل تصویر ارسال نشده است." }, 422);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonResponse({ success: false, message: "فرمت بنر باید JPG، PNG یا WebP باشد." }, 422);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonResponse({ success: false, message: "حجم تصویر بیش از حد مجاز است." }, 413);
    }

    const body = new FormData();
    body.set("kind", "gallery");
    body.set("file", file, file.name || `selected-${slot}.webp`);

    const upstream = await fetch(authApiUrl("/api/upload-professional-media.php"), {
      method: "POST",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      body,
      signal: AbortSignal.timeout(35_000),
    });
    const payload = await parseJsonResponse(upstream);

    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ سرویس بارگذاری بنر معتبر نیست." }, 502);
    }

    return jsonResponse(payload, upstream.status);
  } catch {
    return jsonResponse({ success: false, message: "بارگذاری بنر انجام نشد." }, 502);
  }
}
