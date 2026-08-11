import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import { accountActivities } from "../../../../../db/schema";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
async function readUserId() {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return 0;
  const id = Math.round(Number(raw.user.id || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
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
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await readUserId();
  if (!userId) return jsonResponse({ success: false, message: "برای مشاهده کسب‌وکار وارد حساب شوید." }, 401);
  const { id: rawId } = await context.params;
  const id = Math.round(Number(rawId || 0));
  if (!Number.isSafeInteger(id) || id <= 0) return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);

  try {
    const [row] = await getDb().select().from(accountActivities)
      .where(and(eq(accountActivities.id, id), eq(accountActivities.ownerUserId, userId))).limit(1);
    if (!row) return jsonResponse({ success: false, message: "کسب‌وکار پیدا نشد." }, 404);
    return jsonResponse({ success: true, activity: publicActivity(row) });
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات کسب‌وکار در دسترس نیست." }, 503);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const userId = await readUserId();
  if (!userId) return jsonResponse({ success: false, message: "برای ویرایش کسب‌وکار وارد حساب شوید." }, 401);
  const { id: rawId } = await context.params;
  const id = Math.round(Number(rawId || 0));
  if (!Number.isSafeInteger(id) || id <= 0) return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);

  let input: Record<string, unknown>;
  try {
    const raw: unknown = await request.json();
    input = isRecord(raw) ? raw : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات ارسالی معتبر نیست." }, 400);
  }

  const name = clean(input.name, 160);
  const phone = normalizePhone(input.phone);
  const province = clean(input.province, 80);
  const city = clean(input.city, 80);
  const neighborhood = clean(input.neighborhood, 100);
  const address = clean(input.address, 500);
  if (name.length < 2 || !province || !city) {
    return jsonResponse({ success: false, message: "نام، استان و شهر را کامل کنید." }, 422);
  }

  try {
    const [existing] = await getDb().select().from(accountActivities)
      .where(and(eq(accountActivities.id, id), eq(accountActivities.ownerUserId, userId))).limit(1);
    if (!existing) return jsonResponse({ success: false, message: "کسب‌وکار پیدا نشد." }, 404);
    if (existing.activityType === "dealer") {
      return jsonResponse({ success: false, message: "اطلاعات نمایشگاه از مرکز فرمان نمایشگاه ویرایش می‌شود." }, 409);
    }

    await getDb().update(accountActivities).set({
      name,
      phone,
      province,
      city,
      neighborhood,
      address,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(and(eq(accountActivities.id, id), eq(accountActivities.ownerUserId, userId)));

    const [row] = await getDb().select().from(accountActivities).where(eq(accountActivities.id, id)).limit(1);
    return jsonResponse({ success: true, message: "اطلاعات کسب‌وکار ذخیره شد.", activity: row ? publicActivity(row) : null });
  } catch {
    return jsonResponse({ success: false, message: "ذخیره اطلاعات کسب‌وکار انجام نشد." }, 503);
  }
}
