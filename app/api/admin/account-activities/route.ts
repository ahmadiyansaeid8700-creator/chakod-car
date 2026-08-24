import { desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { accountActivities } from "../../../../db/schema";
import { readVerificationAdmin } from "../../../../lib/business-verification-access";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function moderationStatus(status: string) {
  if (status === "active") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "suspended" || status === "disabled") return "suspended";
  return "pending";
}

function publicRow(row: typeof accountActivities.$inferSelect) {
  return {
    id: -row.id,
    activity_id: row.id,
    source: "native",
    auth_user_id: row.ownerUserId,
    business_type: row.activityType,
    name: row.name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    neighborhood: row.neighborhood,
    address: row.address,
    logo_url: "",
    public_slug: `activity-${row.id}`,
    profile_status: "complete",
    moderation_status: moderationStatus(row.status),
    moderation_note: "",
    service_categories: [],
    services: [],
    is_active: row.status === "active",
    is_verified: row.verificationStatus === "verified",
    home_featured: false,
    mobile_service: false,
    updated_at: row.updatedAt,
  };
}

export async function GET() {
  const admin = await readVerificationAdmin();
  if (!admin.allowed) return jsonResponse({ success: false, message: "دسترسی مدیریت کسب‌وکارها مجاز نیست." }, 403);

  try {
    const rows = await getDb()
      .select()
      .from(accountActivities)
      .where(sql`${accountActivities.activityType} <> 'dealer'`)
      .orderBy(desc(accountActivities.updatedAt), desc(accountActivities.id));
    return jsonResponse({ success: true, items: rows.map(publicRow), can_manage: true });
  } catch {
    return jsonResponse({ success: false, message: "صف ثبت‌های جدید کسب‌وکار در دسترس نیست." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const admin = await readVerificationAdmin();
  if (!admin.allowed) return jsonResponse({ success: false, message: "دسترسی مدیریت کسب‌وکارها مجاز نیست." }, 403);

  let input: Record<string, unknown>;
  try { input = (await request.json()) as Record<string, unknown>; }
  catch { return jsonResponse({ success: false, message: "اطلاعات عملیات معتبر نیست." }, 400); }

  const id = Math.round(Number(input.activity_id || 0));
  const requestedStatus = String(input.status || "");
  const statusMap: Record<string, string> = { approved: "active", pending: "draft", rejected: "rejected", suspended: "suspended" };
  const status = statusMap[requestedStatus];
  if (!Number.isSafeInteger(id) || id <= 0 || !status) {
    return jsonResponse({ success: false, message: "شناسه یا وضعیت کسب‌وکار معتبر نیست." }, 422);
  }

  try {
    await getDb().update(accountActivities).set({
      status,
      verificationStatus: status === "active" ? "verified" : "unverified",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(accountActivities.id, id));
    const [row] = await getDb().select().from(accountActivities).where(eq(accountActivities.id, id)).limit(1);
    if (!row) return jsonResponse({ success: false, message: "کسب‌وکار پیدا نشد." }, 404);
    return jsonResponse({ success: true, message: status === "active" ? "کسب‌وکار تأیید و برای نمایش عمومی فعال شد." : "وضعیت کسب‌وکار ذخیره شد.", item: publicRow(row) });
  } catch {
    return jsonResponse({ success: false, message: "ذخیره وضعیت کسب‌وکار انجام نشد." }, 503);
  }
}
