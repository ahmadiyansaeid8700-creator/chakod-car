import { NextRequest } from "next/server";
import { proxyAuthenticatedJson, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, "/api/commerce.php");
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const raw = await request.text();
  let body = raw;
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    if (!payload.affiliate_code) {
      const referralCode = request.cookies.get("chakod_affiliate_ref")?.value?.trim();
      if (referralCode) payload.affiliate_code = referralCode;
    }
    body = JSON.stringify(payload);
  } catch {
    // The PHP endpoint performs its own JSON validation.
  }

  return proxyAuthenticatedJson(request, "/api/commerce.php", {
    method: "POST",
    body,
    timeoutMs: 20_000,
  });
}
