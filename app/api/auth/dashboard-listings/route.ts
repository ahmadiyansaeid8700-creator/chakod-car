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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_QUERY_KEYS = ["page", "per_page", "status", "owner", "dealer_id", "q"] as const;

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

async function enrichAttributions(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return payload;

  const records = payload.data.filter(isRecord);
  const listingIds = Array.from(new Set(records.map((item) => positiveId(item.id)).filter(Boolean)));
  const local = new Map<number, { displayName: string; role: string; userId: number }>();

  if (listingIds.length) {
    try {
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
      // در زمان rollout، نبود موقت جدول نباید لیست آگهی‌ها را از دسترس خارج کند.
    }
  }

  return {
    ...payload,
    data: payload.data.map((item) => {
      if (!isRecord(item)) return item;
      const listingId = positiveId(item.id);
      const attribution = listingId ? local.get(listingId) : undefined;
      const displayName = attribution?.displayName || upstreamSubmitterName(item);
      const role = attribution?.role || upstreamSubmitterRole(item);
      const userId = attribution?.userId || positiveId(item.submitted_by_user_id || item.created_by_user_id || item.creator_user_id);

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
    return jsonResponse(await enrichAttributions(payload), response.status);
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس آگهی‌ها برقرار نشد." }, 502);
  }
}
