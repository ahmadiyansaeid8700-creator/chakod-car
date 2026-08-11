import { NextRequest } from "next/server";

import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASELINE_MEMBER_PERMISSION = "ads.manage";

function endpoint(request: NextRequest) {
  const dealerId = request.nextUrl.searchParams.get("dealer_id");
  return dealerId
    ? `/api/dealer-command-center.php?dealer_id=${encodeURIComponent(dealerId)}`
    : "/api/dealer-command-center.php";
}

function withBaselineAdvertisingPermission(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;

  const payload = { ...(input as Record<string, unknown>) };
  const status = typeof payload.status === "string" ? payload.status : "active";
  if (status === "removed") return payload;

  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((item): item is string => typeof item === "string")
    : [];

  payload.permissions = Array.from(new Set([...permissions, BASELINE_MEMBER_PERMISSION]));
  return payload;
}

async function normalizedMutationBody(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return null;
  }

  return JSON.stringify(withBaselineAdvertisingPermission(payload));
}

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, endpoint(request));
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const body = await normalizedMutationBody(request);
  if (!body) {
    return jsonResponse({ success: false, message: "اطلاعات عضو تیم معتبر نیست." }, 400);
  }

  return proxyAuthenticatedJson(request, endpoint(request), {
    method: "POST",
    body,
    timeoutMs: 20_000,
  });
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const body = await normalizedMutationBody(request);
  if (!body) {
    return jsonResponse({ success: false, message: "اطلاعات دسترسی عضو معتبر نیست." }, 400);
  }

  return proxyAuthenticatedJson(request, endpoint(request), {
    method: "PATCH",
    body,
    timeoutMs: 20_000,
  });
}
