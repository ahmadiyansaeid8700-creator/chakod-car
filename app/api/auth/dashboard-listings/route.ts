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
import { PRELAUNCH_LISTINGS } from "../../../../lib/prelaunch-fixtures";
import { readServerIdentity } from "../../../../lib/server-route-access";
import { isStagingDemoEnabled } from "../../../../lib/staging-demo-session";

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

async function stagingDemoPayload(request: NextRequest) {
  if (!isStagingDemoEnabled(request.nextUrl.hostname)) return null;
  const identity = await readServerIdentity("/api/me.php");
  if (!isRecord(identity)) return null;

  const identityRecord = identity as JsonRecord;
  if (identityRecord.staging_demo !== true) return null;

  const user = identityRecord.user;
  if (!isRecord(user)) return null;

  const owner = request.nextUrl.searchParams.get("owner")?.trim() || "";
  const dealerId = positiveId(request.nextUrl.searchParams.get("dealer_id"));
  const perPage = Math.min(24, Math.max(1, positiveId(request.nextUrl.searchParams.get("per_page")) || 6));
  const userName = text(user.display_name) || text(user.full_name) || "کاربر چاکود";
  const accountType = text(user.account_type) || "personal";
  const fixtures = PRELAUNCH_LISTINGS as unknown as JsonRecord[];

  let selected = fixtures;
  if (dealerId) {
    selected = fixtures.filter((item) => positiveId(item.dealer_id) === dealerId);
  } else if (owner === "personal" || accountType === "personal") {
    selected = fixtures.filter((item) => positiveId(item.dealer_id) === 0);
  } else if (owner === "dealer" || accountType === "dealer") {
    selected = fixtures.filter((item) => positiveId(item.dealer_id) > 0);
  }

  const data = selected.slice(0, perPage).map((item, index) => ({
    ...item,
    year: item.production_year,
    status: { code: "active", title: "فعال" },
    cover_image: item.cover_image
      ? { image_id: 9_800_000 + index, image_url: item.cover_image }
      : null,
    submitted_by_display_name: userName,
    submitted_by_role: accountType,
    submitted_by_user_id: positiveId(user.id) || null,
  }));
  const total = selected.length;

  return {
    success: true,
    staging_demo: true,
    summary: { total, active: total, pending: 0, rejected: 0, inactive: 0, sold: 0 },
    pagination: { page: 1, per_page: perPage, total },
    data,
  };
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

async function enrichAttributions(request: NextRequest, payload: JsonRecord): Promise<JsonRecord> {
  if (!Array.isArray(payload.data)) return payload;

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
      const dealerIdValue = positiveId(item.dealer_id);
      const member = dealerIdValue && userId ? memberNames.get(`${dealerIdValue}:${userId}`) : undefined;
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
  const demoPayload = await stagingDemoPayload(request);
  if (demoPayload) return jsonResponse(demoPayload);

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
