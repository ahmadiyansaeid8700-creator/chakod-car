import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { accountActivities } from "../../../../db/schema";
import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_TYPES = new Set(["parts_store", "repair_shop", "car_service"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return "";
  let phone = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9+]/g, "");
  if (phone.startsWith("+98")) phone = `0${phone.slice(3)}`;
  if (phone.startsWith("98") && phone.length === 12) phone = `0${phone.slice(2)}`;
  return phone.slice(0, 16);
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const identity: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(identity) || identity.success !== true || !isRecord(identity.user)) {
    return jsonResponse({ success: false, message: "برای همگام‌سازی کسب‌وکار وارد حساب شوید." }, 401);
  }

  const ownerUserId = Math.round(Number(identity.user.id || 0));
  if (!Number.isSafeInteger(ownerUserId) || ownerUserId <= 0) {
    return jsonResponse({ success: false, message: "شناسه حساب معتبر نیست." }, 401);
  }

  try {
    const upstream = await fetch(authApiUrl("/api/professional-profile.php"), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await parseJsonResponse(upstream);
    const profile = isRecord(payload?.profile) ? payload.profile : null;

    if (!upstream.ok || payload?.success !== true || !profile) {
      return jsonResponse({ success: true, synced: false });
    }

    const type = clean(profile.business_type ?? profile.account_type ?? profile.type, 40);
    const name = clean(profile.name ?? profile.business_name ?? profile.title, 160);
    if (!LEGACY_TYPES.has(type) || name.length < 2) {
      return jsonResponse({ success: true, synced: false });
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(accountActivities)
      .where(
        and(
          eq(accountActivities.ownerUserId, ownerUserId),
          eq(accountActivities.activityType, type),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.source === "legacy_professional_profile") {
        const [updated] = await db
          .update(accountActivities)
          .set({
            name,
            phone: normalizePhone(profile.phone ?? profile.mobile ?? identity.user.mobile) || existing.phone,
            province: clean(profile.province, 80) || existing.province,
            city: clean(profile.city, 80) || existing.city,
            neighborhood: clean(profile.neighborhood, 100) || existing.neighborhood,
            address: clean(profile.address, 500) || existing.address,
            status: "active",
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(accountActivities.id, existing.id))
          .returning();
        return jsonResponse({ success: true, synced: true, activity: updated || existing });
      }
      return jsonResponse({ success: true, synced: false, activity: existing });
    }

    const [created] = await db
      .insert(accountActivities)
      .values({
        ownerUserId,
        activityType: type,
        name,
        phone: normalizePhone(profile.phone ?? profile.mobile ?? identity.user.mobile),
        province: clean(profile.province, 80),
        city: clean(profile.city, 80),
        neighborhood: clean(profile.neighborhood, 100),
        address: clean(profile.address, 500),
        source: "legacy_professional_profile",
        status: "active",
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .onConflictDoNothing()
      .returning();

    return jsonResponse({ success: true, synced: Boolean(created), activity: created || null });
  } catch {
    // Legacy sync must never make the account switcher unavailable.
    return jsonResponse({ success: true, synced: false });
  }
}
