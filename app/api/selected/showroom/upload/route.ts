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
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function mediaUrlFromPayload(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : null;
  const candidates = [
    payload.url,
    payload.media_url,
    payload.file_url,
    payload.path,
    data?.url,
    data?.media_url,
    data?.file_url,
    data?.path,
  ];
  const raw = candidates.find((value) => typeof value === "string" && value.trim()) as string | undefined;
  if (!raw) return "";
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value.startsWith("/") ? value : `/${value}`, authApiUrl("/")).toString();
  } catch {
    return value;
  }
}

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
      return jsonResponse({ success: false, message: "فرمت تصویر پشتیبانی نمی‌شود؛ JPG، PNG، WebP، HEIC یا HEIF انتخاب کنید." }, 422);
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

    const url = mediaUrlFromPayload(payload);
    if (!upstream.ok || payload.success === false) {
      return jsonResponse({
        ...payload,
        success: false,
        message: typeof payload.message === "string" ? payload.message : "بارگذاری بنر انجام نشد.",
      }, upstream.status || 502);
    }
    if (!url) {
      return jsonResponse({ success: false, message: "تصویر بارگذاری شد اما آدرس فایل دریافت نشد." }, 502);
    }

    return jsonResponse({ ...payload, success: true, url }, upstream.status);
  } catch {
    return jsonResponse({ success: false, message: "بارگذاری بنر انجام نشد." }, 502);
  }
}
