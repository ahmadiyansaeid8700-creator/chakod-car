import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../../lib/chakod-auth-proxy";

const MAX_UPLOAD_REQUEST_BYTES = 7 * 1024 * 1024;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return jsonResponse(
      { success: false, message: "فرمت درخواست بارگذاری معتبر نیست." },
      415,
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_REQUEST_BYTES) {
    return jsonResponse(
      { success: false, message: "حجم تصویر بیش از حد مجاز است." },
      413,
    );
  }

  try {
    // Preserve the browser-generated multipart boundary and bytes exactly as they
    // arrived. Parsing the File inside the Worker and rebuilding FormData adds a
    // fragile binary conversion step and is unnecessary for this authenticated proxy.
    const body = await request.arrayBuffer();
    if (!body.byteLength) {
      return jsonResponse(
        { success: false, message: "فایل تصویر ارسال نشده است." },
        422,
      );
    }
    if (body.byteLength > MAX_UPLOAD_REQUEST_BYTES) {
      return jsonResponse(
        { success: false, message: "حجم تصویر بیش از حد مجاز است." },
        413,
      );
    }

    const headers = requestIdentityHeaders(request);
    headers["Content-Type"] = contentType;

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
