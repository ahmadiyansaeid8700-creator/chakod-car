import { NextRequest } from "next/server";

import {
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function endpoint(request: NextRequest) {
  const dealerId = request.nextUrl.searchParams.get("dealer_id");
  return dealerId
    ? `/api/dealer-command-center.php?dealer_id=${encodeURIComponent(dealerId)}`
    : "/api/dealer-command-center.php";
}

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, endpoint(request));
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return proxyAuthenticatedJson(request, endpoint(request), {
    method: "POST",
    body: await request.text(),
    timeoutMs: 20_000,
  });
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return proxyAuthenticatedJson(request, endpoint(request), {
    method: "PATCH",
    body: await request.text(),
    timeoutMs: 20_000,
  });
}
