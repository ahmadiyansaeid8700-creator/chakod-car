import { NextRequest } from "next/server";

import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

const MAX_PROFILE_REQUEST_BYTES = 8_000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_PROFILE_REQUEST_BYTES) {
    return jsonResponse({ success: false, message: "حجم اطلاعات پروفایل بیش از حد مجاز است." }, 413);
  }

  const body = await request.text();
  if (body.length > MAX_PROFILE_REQUEST_BYTES) {
    return jsonResponse({ success: false, message: "حجم اطلاعات پروفایل بیش از حد مجاز است." }, 413);
  }

  return proxyAuthenticatedJson(request, "/api/update-profile.php", {
    method: "POST",
    body,
  });
}
