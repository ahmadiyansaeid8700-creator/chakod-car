import { NextRequest } from "next/server";

import {
  jsonResponse,
  proxyAuthenticatedJson,
} from "../../../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  const query = new URLSearchParams({
    listing_id: id,
    per_page: "1",
    page: "1",
  });

  return proxyAuthenticatedJson(
    request,
    `/api/dashboard-listings.php?${query.toString()}`,
    { timeoutMs: 20_000 },
  );
}
