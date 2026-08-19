import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import { accountActivities } from "../../../../../db/schema";
import {
  getAccountActivityMembership,
  readAccountActivityTeamIdentity,
} from "../../../../../lib/account-activity-team";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../../lib/chakod-auth-proxy";

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
function publicActivity(
  row: typeof accountActivities.$inferSelect,
  access: { role: string; isOwner: boolean; canManage: boolean },
) {
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
    access_role: access.role,
    is_owner: access.isOwner,
    can_manage: access.canManage,
  };
}

async function resolveAccess(id: number) {
  const identity = await readAccountActivityTeamIdentity();
  if (!identity) return null;
  const [row] = await getDb().select().from(accountActivities).where(eq(accountActivities.id, id)).limit(1);
  if (!row) return { identity, row: null, role: "", isOwner: false, canManage: false };

  if (row.ownerUserId === identity.id) {
    return { identity, row, role: "owner", isOwner: true, canManage: true };
  }
  if (row.activityType === "dealer") {
    return { identity, row, role: "", isOwner: false, canManage: false };
  }

  const membership = await getAccountActivityMembership(id, identity);
  const active = membership?.status === "active";
  return {
    identity,
    row,
    role: active ? membership?.role || "viewer" : membership?.status === "invited" ? "invited" : "",
    isOwner: false,
    canManage: active && membership?.role === "manager",
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Math.round(Number(rawId || 0));
  if (!Number.isSafeInteger(id) || id <= 0) return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);

  try {
    const access = await resolveAccess(id);
    if (!access) return jsonResponse({ success: false, message: "برای مشاهده کسب‌وکار وارد حساب شوید." }, 401);
    if (!access.row) return jsonResponse({ success: false, message: "کسب‌وکار پیدا نشد." }, 404);
    if (!access.role || access.role === "invited") {
      return jsonResponse({
        success: false,
        message: access.role === "invited" ? "ابتدا دعوت عضویت در این مجموعه را قبول کنید." : "به این کسب‌وکار دسترسی ندارید.",
        invitation_pending: access.role === "invited",
      }, 403);
    }
    return jsonResponse({
      success: true,
      activity: publicActivity(access.row, {
        role: access.role,
        isOwner: access.isOwner,
        canManage: access.canManage,
      }),
    });
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

  const { id: rawId } = await context.params;
  const id = Math.round(Number(rawId || 0));
  if (!Number.isSafeInteger(id) || id <= 0) return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);

  const access = await resolveAccess(id);
  if (!access) return jsonResponse({ success: false, message: "برای ویرایش کسب‌وکار وارد حساب شوید." }, 401);
  if (!access.row) return jsonResponse({ success: false, message: "کسب‌وکار پیدا نشد." }, 404);
  if (!access.canManage) return jsonResponse({ success: false, message: "اجازه ویرایش اطلاعات این مجموعه را ندارید." }, 403);

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
  if (access.row.activityType === "dealer") {
    return jsonResponse({ success: false, message: "اطلاعات نمایشگاه از مرکز فرمان نمایشگاه ویرایش می‌شود." }, 409);
  }

  try {
    await getDb().update(accountActivities).set({
      name,
      phone,
      province,
      city,
      neighborhood,
      address,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(accountActivities.id, id));

    const [row] = await getDb().select().from(accountActivities).where(eq(accountActivities.id, id)).limit(1);
    return jsonResponse({
      success: true,
      message: "اطلاعات کسب‌وکار ذخیره شد.",
      activity: row ? publicActivity(row, { role: access.role, isOwner: access.isOwner, canManage: access.canManage }) : null,
    });
  } catch {
    return jsonResponse({ success: false, message: "ذخیره اطلاعات کسب‌وکار انجام نشد." }, 503);
  }
}
