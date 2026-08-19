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

async function readCurrentUser(request: NextRequest) {
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

async function verifyListingAccess(request: NextRequest, listingId: number) {
  try {
    const query = new URLSearchParams({ listing_id: String(listingId) });
    const response = await fetch(authApiUrl(`/api/listing-manage.php?${query.toString()}`), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await parseJsonResponse(response);
    if (!response.ok || !isRecord(payload) || payload.success !== true) return null;

    const access = isRecord(payload.access) ? payload.access : null;
    if (access && access.can_manage === false) return null;

    const listing = isRecord(payload.listing)
      ? payload.listing
      : Array.isArray(payload.data)
        ? payload.data.find((item) => isRecord(item) && positiveId(item.id) === listingId)
        : null;

    return isRecord(listing) && positiveId(listing.id) === listingId ? listing : null;
  } catch {
    return null;
  }
}

async function readDealerRole(request: NextRequest, dealerId: number) {
  if (!dealerId) return "";
  try {
    const response = await fetch(authApiUrl(`/api/dealer-command-center.php?dealer_id=${dealerId}`), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await parseJsonResponse(response);
    return response.ok && isRecord(payload) ? text(payload.role) : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  let input: JsonRecord | null = null;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : null;
  } catch {
    input = null;
  }

  const listingId = positiveId(input?.listing_id);
  if (!input || !listingId) {
    return jsonResponse({ success: false, message: "شناسه آگهی معتبر نیست." }, 400);
  }

  const [listing, user] = await Promise.all([
    verifyListingAccess(request, listingId),
    readCurrentUser(request),
  ]);

  if (!listing || !user) {
    return jsonResponse({ success: false, message: "دسترسی ثبت‌کننده آگهی قابل تأیید نیست." }, 403);
  }

  const inferredDealerId = positiveId(listing.dealer_id || input.dealer_id);
  const ownerType = text(listing.listing_owner_type) === "dealer" || inferredDealerId ? "dealer" : "personal";
  const dealerId = ownerType === "dealer" ? inferredDealerId : 0;
  const role = ownerType === "dealer" ? await readDealerRole(request, dealerId) : "owner";
  const now = new Date().toISOString();

  try {
    await ensureListingAttributionTable();
    await getDb()
      .insert(listingAttributions)
      .values({
        listingId,
        ownerType,
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
          ownerType,
          dealerId: dealerId || null,
          submittedByUserId: user.userId,
          submittedByDisplayName: user.displayName,
          submittedByRole: role,
          updatedAt: now,
        },
      });
  } catch {
    return jsonResponse({ success: false, message: "ثبت انتساب آگهی موقتاً در دسترس نیست." }, 503);
  }

  return jsonResponse({
    success: true,
    attribution: {
      listing_id: listingId,
      submitted_by_display_name: user.displayName,
      submitted_by_role: role,
    },
  });
}
