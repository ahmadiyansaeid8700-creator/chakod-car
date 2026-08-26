import { NextRequest } from "next/server";

import { jsonResponse, proxyAuthenticatedJson } from "../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await readServerIdentity("/api/me.php");
  if (identity) return jsonResponse(identity);
  return proxyAuthenticatedJson(request, "/api/me.php");
}
