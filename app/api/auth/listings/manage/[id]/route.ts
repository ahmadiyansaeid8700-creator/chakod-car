import { NextRequest } from "next/server";

import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANAGE_ACTIONS = new Set([
  "mark_sold",
  "disable_listing",
  "reactivate_listing",
  "delete_listing",
]);

function validListingId(id: string) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!validListingId(id)) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  const query = new URLSearchParams({ listing_id: id });

  return proxyAuthenticatedJson(
    request,
    `/api/listing-manage.php?${query.toString()}`,
    { timeoutMs: 20_000 },
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const { id } = await context.params;
  if (!validListingId(id)) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  let input: Record<string, unknown> = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      input = parsed as Record<string, unknown>;
    }
  } catch {
    return jsonResponse({ success: false, message: "درخواست مدیریت آگهی معتبر نیست." }, 400);
  }

  const action = typeof input.action === "string" ? input.action.trim() : "";
  if (!MANAGE_ACTIONS.has(action)) {
    return jsonResponse({ success: false, message: "عملیات مدیریت آگهی مجاز نیست." }, 400);
  }

  return proxyAuthenticatedJson(request, "/api/listing-manage.php", {
    method: "POST",
    timeoutMs: 20_000,
    body: JSON.stringify({
      listing_id: Number(id),
      action,
    }),
  });
}
