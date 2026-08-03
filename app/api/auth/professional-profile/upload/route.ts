import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../../lib/chakod-auth-proxy";

const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return jsonResponse(
      { success: false, message: "حجم تصویر بیش از حد مجاز است." },
      413,
    );
  }

  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    const kind = String(incoming.get("kind") || "gallery");

    if (!(file instanceof File) || file.size <= 0) {
      return jsonResponse(
        { success: false, message: "فایل تصویر ارسال نشده است." },
        422,
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonResponse(
        { success: false, message: "حجم تصویر بیش از حد مجاز است." },
        413,
      );
    }

    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file, file.name || "image");

    const headers = requestIdentityHeaders(request);
    const upstream = await fetch(authApiUrl("/api/upload-professional-media.php"), {
      method: "POST",
      cache: "no-store",
      headers,
      body,
      signal: AbortSignal.timeout(35_000),
    });

    const payload = await parseJsonResponse(upstream);
    if (!payload) {
      return jsonResponse(
        { success: false, message: "پاسخ سرویس بارگذاری تصویر معتبر نیست." },
        502,
      );
    }

    return jsonResponse(payload, upstream.status);
  } catch {
    return jsonResponse(
      { success: false, message: "ارتباط با سرویس بارگذاری تصویر برقرار نشد." },
      502,
    );
  }
}
