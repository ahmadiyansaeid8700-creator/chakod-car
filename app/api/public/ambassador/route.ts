import { NextRequest } from "next/server";

import { proxyAuthenticatedJson } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, "/api/ambassador-public.php");
}
