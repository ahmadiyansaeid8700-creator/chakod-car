import { NextRequest } from "next/server";

import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات تأیید پرداخت معتبر نیست." }, 400);
  }

  const authority = cleanText(input.authority, 128);
  const status = cleanText(input.status, 32).toUpperCase();

  if (!authority || !/^[a-z0-9_-]{6,128}$/i.test(authority)) {
    return jsonResponse({ success: false, message: "شناسه پرداخت معتبر نیست." }, 400);
  }

  if (status && !["OK", "NOK", "SUCCESS", "FAILED", "CANCELED"].includes(status)) {
    return jsonResponse({ success: false, message: "وضعیت بازگشت درگاه معتبر نیست." }, 400);
  }

  return proxyAuthenticatedJson(request, "/api/payments/verify.php", {
    method: "POST",
    timeoutMs: 20_000,
    body: JSON.stringify({ authority, status }),
  });
}
