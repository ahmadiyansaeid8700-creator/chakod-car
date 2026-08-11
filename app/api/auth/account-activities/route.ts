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
import { getRuntimeEnv } from "../../../../lib/runtime-env";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVITY_TYPES = ["dealer", "parts_store", "repair_shop", "car_service"] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

type AccountUser = {
  id: number;
  mobile: string;
  accountType: string;
  businessName: string;
};

type DealerItem = {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  role: string;
  active: boolean;
};

let activitySchemaReady: Promise<void> | null = null;

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

function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

async function ensureAccountActivitiesSchema() {
  if (!activitySchemaReady) {
    activitySchemaReady = (async () => {
      const d1 = getRuntimeEnv().DB;
      await d1.exec(`CREATE TABLE IF NOT EXISTS account_activities (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        owner_user_id integer NOT NULL,
        activity_type text NOT NULL,
        name text NOT NULL,
        phone text DEFAULT '' NOT NULL,
        province text DEFAULT '' NOT NULL,
        city text DEFAULT '' NOT NULL,
        neighborhood text DEFAULT '' NOT NULL,
        address text DEFAULT '' NOT NULL,
        external_dealer_id integer,
        source text DEFAULT 'native' NOT NULL,
        status text DEFAULT 'draft' NOT NULL,
        verification_status text DEFAULT 'unverified' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`);
      await d1.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS account_activities_owner_type_unique ON account_activities (owner_user_id, activity_type)",
      );
      await d1.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS account_activities_external_dealer_unique ON account_activities (external_dealer_id)",
      );
    })().catch((error) => {
      activitySchemaReady = null;
      throw error;
    });
  }

  return activitySchemaReady;
}

async function readAccountUser(): Promise<AccountUser | null> {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return null;

  const id = Math.round(Number(raw.user.id || 0));
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    mobile: normalizePhone(raw.user.mobile),
    accountType: clean(raw.user.account_type, 40),
    businessName: clean(raw.user.business_name, 160),
  };
}

function normalizeDealer(item: Record<string, unknown>): DealerItem | null {
  const id = Math.round(Number(item.id ?? item.dealer_id ?? 0));
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const active = item.is_active !== false && Number(item.is_active ?? 1) !== 0;
  return {
    id,
    name: clean(item.dealer_name ?? item.name ?? item.title, 160) || `نمایشگاه ${id}`,
    phone: normalizePhone(item.dealer_phone ?? item.phone),
    province: clean(item.province, 80),
    city: clean(item.city, 80),
    neighborhood: clean(item.neighborhood, 100),
    address: clean(item.address, 500),
    role: clean(item.role, 60),
    active,
  };
}

async function fetchDealers(request: NextRequest): Promise<DealerItem[]> {
  try {
    const response = await fetch(authApiUrl("/api/my-dealers.php"), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await parseJsonResponse(response);
    const list = Array.isArray(payload?.data) ? payload.data : [];
    return list
      .filter(isRecord)
      .map(normalizeDealer)
      .filter((item): item is DealerItem => Boolean(item));
  } catch {
    return [];
  }
}

async function syncLegacyActivities(request: NextRequest, user: AccountUser) {
  const db = getDb();
  const dealers = await fetchDealers(request);
  const ownedDealers = dealers.filter((item) => item.role === "owner");
  const fallbackOwned = ownedDealers.length === 0 && user.accountType === "dealer" ? dealers.slice(0, 1) : [];
  const dealerToImport = [...ownedDealers, ...fallbackOwned][0];

  if (dealerToImport) {
    await db
      .insert(accountActivities)
      .values({
        ownerUserId: user.id,
        activityType: "dealer",
        name: dealerToImport.name,
        phone: dealerToImport.phone,
        province: dealerToImport.province,
        city: dealerToImport.city,
        neighborhood: dealerToImport.neighborhood,
        address: dealerToImport.address,
        externalDealerId: dealerToImport.id,
        source: "legacy_dealer",
        status: dealerToImport.active ? "active" : "disabled",
      })
      .onConflictDoNothing();
  }

  if (
    isActivityType(user.accountType) &&
    user.accountType !== "dealer" &&
    user.businessName.length >= 2
  ) {
    await db
      .insert(accountActivities)
      .values({
        ownerUserId: user.id,
        activityType: user.accountType,
        name: user.businessName,
        phone: user.mobile,
        source: "legacy_professional_profile",
        status: "active",
      })
      .onConflictDoNothing();
  }

  return dealers;
}

function publicActivity(row: typeof accountActivities.$inferSelect) {
  return {
    id: row.id,
    type: row.activityType,
    name: row.name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    neighborhood: row.neighborhood,
    address: row.address,
    external_dealer_id: row.externalDealerId,
    status: row.status,
    verification_status: row.verificationStatus,
    can_publish_vehicle: row.activityType === "dealer" && Boolean(row.externalDealerId) && row.status === "active",
  };
}

export async function GET(request: NextRequest) {
  const user = await readAccountUser();
  if (!user) {
    return jsonResponse({ success: false, message: "برای مشاهده کسب‌وکارها وارد حساب شوید." }, 401);
  }

  try {
    await ensureAccountActivitiesSchema();
    const dealers = await syncLegacyActivities(request, user);
    const rows = await getDb()
      .select()
      .from(accountActivities)
      .where(eq(accountActivities.ownerUserId, user.id))
      .orderBy(accountActivities.id);

    const ownedDealerIds = new Set(
      rows
        .filter((row) => row.activityType === "dealer" && row.externalDealerId)
        .map((row) => Number(row.externalDealerId)),
    );

    const memberships = dealers
      .filter((dealer) => dealer.active && !ownedDealerIds.has(dealer.id))
      .map((dealer) => ({
        type: "dealer",
        external_dealer_id: dealer.id,
        name: dealer.name,
        role: dealer.role || "member",
        can_publish_vehicle: true,
      }));

    const existingTypes = new Set(rows.map((row) => row.activityType));
    return jsonResponse({
      success: true,
      activities: rows.map(publicActivity),
      memberships,
      available_types: ACTIVITY_TYPES.filter((type) => !existingTypes.has(type)),
    });
  } catch {
    return jsonResponse(
      { success: false, message: "فهرست کسب‌وکارها فعلاً در دسترس نیست. دوباره تلاش کنید." },
      503,
    );
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const user = await readAccountUser();
  if (!user) {
    return jsonResponse({ success: false, message: "برای افزودن کسب‌وکار وارد حساب شوید." }, 401);
  }

  let input: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    input = isRecord(value) ? value : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات کسب‌وکار معتبر نیست." }, 400);
  }

  const type = clean(input.type, 40);
  const name = clean(input.name, 160);
  const phone = normalizePhone(input.phone) || user.mobile;
  const province = clean(input.province, 80);
  const city = clean(input.city, 80);
  const neighborhood = clean(input.neighborhood, 100);
  const address = clean(input.address, 500);

  if (!isActivityType(type)) {
    return jsonResponse({ success: false, message: "نوع کسب‌وکار معتبر نیست." }, 422);
  }
  if (name.length < 2) {
    return jsonResponse({ success: false, message: "نام کسب‌وکار را کامل وارد کنید." }, 422);
  }
  if (!province || !city) {
    return jsonResponse({ success: false, message: "استان و شهر کسب‌وکار را انتخاب کنید." }, 422);
  }

  try {
    await ensureAccountActivitiesSchema();
    await syncLegacyActivities(request, user);
    const [existing] = await getDb()
      .select({ id: accountActivities.id })
      .from(accountActivities)
      .where(and(eq(accountActivities.ownerUserId, user.id), eq(accountActivities.activityType, type)))
      .limit(1);

    if (existing) {
      return jsonResponse(
        { success: false, message: "از این نوع کسب‌وکار قبلاً برای این حساب ثبت شده است." },
        409,
      );
    }
  } catch {
    return jsonResponse({ success: false, message: "بررسی کسب‌وکارهای فعلی انجام نشد." }, 503);
  }

  let externalDealerId: number | null = null;
  let status = "draft";

  if (type === "dealer") {
    try {
      const upstream = await fetch(authApiUrl("/api/my-dealers.php"), {
        method: "POST",
        cache: "no-store",
        headers: {
          ...requestIdentityHeaders(request),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dealer_name: name,
          dealer_phone: phone,
          province,
          city,
          neighborhood,
          address,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const payload = await parseJsonResponse(upstream);
      if (!upstream.ok || payload?.success !== true) {
        return jsonResponse(
          { success: false, message: clean(payload?.message, 300) || "ثبت نمایشگاه انجام نشد." },
          upstream.status || 502,
        );
      }

      externalDealerId = Math.round(Number(payload.dealer_id ?? payload.id ?? 0)) || null;
      if (!externalDealerId) {
        const dealers = await fetchDealers(request);
        const match = dealers.find((dealer) => dealer.role === "owner" && dealer.name === name) || dealers.find((dealer) => dealer.role === "owner");
        externalDealerId = match?.id || null;
      }
      status = "active";
    } catch {
      return jsonResponse({ success: false, message: "ارتباط با سرویس ثبت نمایشگاه برقرار نشد." }, 502);
    }
  }

  try {
    const [row] = await getDb()
      .insert(accountActivities)
      .values({
        ownerUserId: user.id,
        activityType: type,
        name,
        phone,
        province,
        city,
        neighborhood,
        address,
        externalDealerId,
        source: type === "dealer" ? "external_dealer" : "native",
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .returning();

    return jsonResponse(
      {
        success: true,
        message: type === "dealer" ? "نمایشگاه به کسب‌وکارهای شما اضافه شد." : "کسب‌وکار به حساب شما اضافه شد.",
        activity: publicActivity(row),
      },
      201,
    );
  } catch {
    return jsonResponse({ success: false, message: "ذخیره کسب‌وکار انجام نشد." }, 503);
  }
}
