import { NextRequest } from "next/server";
import { proxyAuthenticatedJson, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search || "";
  return proxyAuthenticatedJson(request, `/api/affiliate.php${search}`, {
    timeoutMs: 45_000,
  });
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return proxyAuthenticatedJson(request, "/api/affiliate.php", {
    method: "POST",
    body: await request.text(),
    timeoutMs: 30_000,
  });
}
