import { NextRequest } from "next/server";

import {
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, "/api/ambassador.php");
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return proxyAuthenticatedJson(request, "/api/ambassador.php", {
    method: "POST",
    body: await request.text(),
    timeoutMs: 20_000,
  });
}
