import { NextRequest } from "next/server";
import { proxyAuthenticatedJson, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(
    request,
    `/api/admin-affiliate-read.php${request.nextUrl.search}`,
    { timeoutMs: 45_000 },
  );
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const body = await request.text();
  let endpoint = "/api/admin-affiliate.php";

  try {
    const payload = JSON.parse(body) as { action?: unknown };
    if (payload?.action === "save_document") {
      endpoint = "/api/admin-affiliate-documents.php";
    } else if (payload?.action === "update_settings") {
      endpoint = "/api/admin-affiliate-settings.php";
    }
  } catch {
    // Upstream endpoint returns the canonical validation error.
  }

  return proxyAuthenticatedJson(request, endpoint, {
    method: "POST",
    body,
    timeoutMs: 60_000,
  });
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return proxyAuthenticatedJson(request, "/api/admin-affiliate.php", {
    method: "PATCH",
    body: await request.text(),
    timeoutMs: 60_000,
  });
}
