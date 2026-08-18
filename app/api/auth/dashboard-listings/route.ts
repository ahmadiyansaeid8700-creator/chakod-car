import { inArray } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { listingAttributions } from "../../../../db/listing-attributions";
import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";
import { ensureListingAttributionTable } from "../../../../lib/listing-attribution-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_QUERY_KEYS = ["page", "per_page", "status", "owner", "dealer_id", "q"] as const;

type JsonRecord = Record<string, unknown>;
type MemberIdentity = { displayName: string; role: string };

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

function upstreamSubmitterName(item: JsonRecord) {
  return (
    text(item.submitted_by_display_name) ||
    text(item.created_by_display_name) ||
    text(item.creator_display_name) ||
    text(item.created_by_name) ||
    text(item.member_display_name) ||
    text(item.author_display_name)
  );
}

function upstreamSubmitterRole(item: JsonRecord) {
  return text(item.submitted_by_role) || text(item.creator_role) || text(item.member_role);
}

function upstreamSubmitterUserId(item: JsonRecord) {
  return positiveId(
    item.submitted_by_user_id ||
    item.created_by_user_id ||
    item.creator_user_id ||
    item.author_user_id ||
    item.member_user_id,
  );
}

async function resolveDealerMembers(request: NextRequest, dealerIds: number[]) {
  const result = new Map<string, MemberIdentity>();
  const uniqueDealerIds = Array.from(new Set(dealerIds.filter(Boolean)));

  await Promise.all(uniqueDealerIds.map(async (dealerId) => {
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
      if (!response.ok || !isRecord(payload) || !Array.isArray(payload.members)) return;

      for (const member of payload.members) {
        if (!isRecord(member)) continue;
        const userId = positiveId(member.auth_user_id || member.user_id);
        const displayName = text(member.display_name) || text(member.full_name);
        if (!userId || !displayName) continue;
        result.set(`${dealerId}:${userId}`, {
          displayName,
          role: text(member.role),
        });
      }
    } catch {
      // عدم دسترسی به تیم نباید لیست آگهی‌ها را خراب کند.
    }
  }));

  return result;
}

async function enrichAttributions(request: NextRequest, payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return payload;

  const records = payload.data.filter(isRecord);
  const listingIds = Array.from(new Set(records.map((item) => positiveId(item.id)).filter(Boolean)));
  const local = new Map<number, { displayName: string; role: string; userId: number }>();

  if (listingIds.length) {
    try {
      await ensureListingAttributionTable();
      const rows = await getDb()
        .select({
          listingId: listingAttributions.listingId,
          displayName: listingAttributions.submittedByDisplayName,
          role: listingAttributions.submittedByRole,
          userId: listingAttributions.submittedByUserId,
        })
        .from(listingAttributions)
        .where(inArray(listingAttributions.listingId, listingIds));

      for (const row of rows) {
        local.set(row.listingId, {
          displayName: row.displayName,
          role: row.role,
          userId: row.userId,
        });
      }
    } catch {
      // نبود موقت storage نباید لیست آگهی‌ها را از دسترس خارج کند.
    }
  }

  const dealerIdsNeedingMemberLookup = records
    .filter((item) => {
      const listingId = positiveId(item.id);
      if (listingId && local.has(listingId)) return false;
      if (upstreamSubmitterName(item)) return false;
      return positiveId(item.dealer_id) > 0 && upstreamSubmitterUserId(item) > 0;
    })
    .map((item) => positiveId(item.dealer_id));

  const memberNames = dealerIdsNeedingMemberLookup.length
    ? await resolveDealerMembers(request, dealerIdsNeedingMemberLookup)
    : new Map<string, MemberIdentity>();

  return {
    ...payload,
    data: payload.data.map((item) => {
      if (!isRecord(item)) return item;
      const listingId = positiveId(item.id);
      const attribution = listingId ? local.get(listingId) : undefined;
      const userId = attribution?.userId || upstreamSubmitterUserId(item);
      const dealerId = positiveId(item.dealer_id);
      const member = dealerId && userId ? memberNames.get(`${dealerId}:${userId}`) : undefined;
      const displayName = attribution?.displayName || upstreamSubmitterName(item) || member?.displayName || "";
      const role = attribution?.role || upstreamSubmitterRole(item) || member?.role || "";

      return {
        ...item,
        submitted_by_display_name: displayName,
        submitted_by_role: role,
        submitted_by_user_id: userId || null,
        submitted_by: displayName
          ? { user_id: userId || null, display_name: displayName, role }
          : null,
      };
    }),
  };
}

export async function GET(request: NextRequest) {
  const upstream = new URL(authApiUrl("/api/dashboard-listings.php"));

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = request.nextUrl.searchParams.get(key)?.trim();
    if (value) upstream.searchParams.set(key, value.slice(0, key === "q" ? 160 : 40));
  }

  try {
    const response = await fetch(upstream, {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await parseJsonResponse(response);
    if (!payload) {
      return jsonResponse({ success: false, message: "پاسخ سرویس آگهی‌ها معتبر نیست." }, 502);
    }
    return jsonResponse(await enrichAttributions(request, payload), response.status);
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس آگهی‌ها برقرار نشد." }, 502);
  }
}
