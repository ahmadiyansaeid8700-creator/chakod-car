import { NextRequest } from "next/server";

import {
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, "/api/admin-commerce.php", { timeoutMs: 14_000 });
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return proxyAuthenticatedJson(request, "/api/admin-commerce.php", {
    method: "PATCH",
    body: await request.text(),
    timeoutMs: 20_000,
  });
}
