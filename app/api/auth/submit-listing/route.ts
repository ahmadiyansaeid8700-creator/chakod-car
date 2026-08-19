import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { listingAttributions } from "../../../../db/listing-attributions";
import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";
import { ensureListingAttributionTable } from "../../../../lib/listing-attribution-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function positiveId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getCurrentUser(request: NextRequest) {
  try {
    const response = await fetch(authApiUrl("/api/me.php"), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await parseJsonResponse(response);
    if (!response.ok || !isRecord(payload) || !isRecord(payload.user)) return null;

    const userId = positiveId(payload.user.id);
    const displayName = text(payload.user.display_name) || text(payload.user.full_name) || "کاربر چاکود";
    return userId ? { userId, displayName } : null;
  } catch {
    return null;
  }
}

async function getDealerRole(request: NextRequest, dealerId: number) {
  if (!dealerId) return "";
  try {
    const response = await fetch(
      authApiUrl(`/api/dealer-command-center.php?dealer_id=${encodeURIComponent(String(dealerId))}`),
      {
        method: "GET",
        cache: "no-store",
        headers: requestIdentityHeaders(request),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload = await parseJsonResponse(response);
    return response.ok && isRecord(payload) ? text(payload.role) : "";
  } catch {
    return "";
  }
}

async function saveAttribution(
  request: NextRequest,
  listingId: number,
  ownerType: string,
  dealerId: number,
) {
  const user = await getCurrentUser(request);
  if (!user) return;

  const role = ownerType === "dealer" ? await getDealerRole(request, dealerId) : "owner";
  const now = new Date().toISOString();

  try {
    await ensureListingAttributionTable();
    await getDb()
      .insert(listingAttributions)
      .values({
        listingId,
        ownerType: ownerType === "dealer" ? "dealer" : "personal",
        dealerId: dealerId || null,
        submittedByUserId: user.userId,
        submittedByDisplayName: user.displayName,
        submittedByRole: role,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: listingAttributions.listingId,
        set: {
          ownerType: ownerType === "dealer" ? "dealer" : "personal",
          dealerId: dealerId || null,
          submittedByUserId: user.userId,
          submittedByDisplayName: user.displayName,
          submittedByRole: role,
          updatedAt: now,
        },
      });
  } catch {
    // ثبت آگهی نباید به خاطر خرابی موقت جدول انتساب شکست بخورد.
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  let raw = "";
  let body: JsonRecord | null = null;
  try {
    raw = await request.text();
    const parsed: unknown = JSON.parse(raw || "{}");
    body = isRecord(parsed) ? parsed : null;
  } catch {
    body = null;
  }

  if (!body) {
    return jsonResponse({ success: false, message: "اطلاعات آگهی معتبر نیست." }, 400);
  }

  try {
    const response = await fetch(authApiUrl("/api/submit-listing.php"), {
      method: "POST",
      cache: "no-store",
      headers: {
        ...requestIdentityHeaders(request),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: raw,
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await parseJsonResponse(response);
    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ ثبت آگهی معتبر نیست." }, 502);
    }

    if (response.ok && isRecord(payload) && payload.success === true) {
      const listingId = positiveId(payload.listing_id);
      if (listingId) {
        const ownerType = text(body.listing_owner_type) === "dealer" ? "dealer" : "personal";
        const dealerId = ownerType === "dealer" ? positiveId(body.dealer_id) : 0;
        await saveAttribution(request, listingId, ownerType, dealerId);
      }
    }

    return jsonResponse(payload, response.status);
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس ثبت آگهی برقرار نشد." }, 502);
  }
}
