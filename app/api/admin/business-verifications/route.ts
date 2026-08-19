import { desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { businessVerificationRequests } from "../../../../db/schema";
import { readVerificationAdmin } from "../../../../lib/business-verification-access";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function publicAdminRow(row: typeof businessVerificationRequests.$inferSelect) {
  return {
    id: row.id,
    activity_type: row.activityType,
    activity_external_id: row.activityExternalId,
    activity_name: row.activityName,
    applicant_user_id: row.applicantUserId,
    applicant_mobile: row.applicantMobile,
    applicant_relation: row.applicantRelation,
    document_type: row.documentType,
    document_reference: row.documentReference,
    license_holder_name: row.licenseHolderName,
    document_name: row.documentName,
    document_mime: row.documentMime,
    status: row.status,
    rejection_reason: row.rejectionReason,
    reviewed_by: row.reviewedBy,
    reviewed_at: row.reviewedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function GET() {
  const admin = await readVerificationAdmin();
  if (!admin.allowed) {
    return jsonResponse({ success: false, message: "دسترسی بررسی مدارک مجاز نیست." }, 403);
  }

  try {
    const rows = await getDb()
      .select()
      .from(businessVerificationRequests)
      .orderBy(desc(businessVerificationRequests.updatedAt), desc(businessVerificationRequests.id));

    return jsonResponse({ success: true, requests: rows.map(publicAdminRow) });
  } catch {
    return jsonResponse({ success: false, message: "پرونده‌های تأیید در دسترس نیستند. Migration را بررسی کنید." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const admin = await readVerificationAdmin();
  if (!admin.allowed) {
    return jsonResponse({ success: false, message: "دسترسی بررسی مدارک مجاز نیست." }, 403);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات عملیات معتبر نیست." }, 400);
  }

  const id = Math.round(Number(input.id || 0));
  const action = clean(input.action, 30);
  const rejectionReason = clean(input.rejection_reason, 500);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return jsonResponse({ success: false, message: "شناسه پرونده معتبر نیست." }, 400);
  }
  if (!["approve", "reject", "suspend"].includes(action)) {
    return jsonResponse({ success: false, message: "عملیات بررسی معتبر نیست." }, 400);
  }
  if (action === "reject" && rejectionReason.length < 4) {
    return jsonResponse({ success: false, message: "دلیل رد مدرک را وارد کنید." }, 422);
  }

  const status = action === "approve" ? "verified" : action === "reject" ? "rejected" : "suspended";

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(businessVerificationRequests)
      .where(eq(businessVerificationRequests.id, id))
      .limit(1);
    if (!existing) return jsonResponse({ success: false, message: "پرونده پیدا نشد." }, 404);

    await db
      .update(businessVerificationRequests)
      .set({
        status,
        rejectionReason: action === "reject" ? rejectionReason : "",
        reviewedBy: admin.reviewer,
        reviewedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(businessVerificationRequests.id, id));

    const [row] = await db
      .select()
      .from(businessVerificationRequests)
      .where(eq(businessVerificationRequests.id, id))
      .limit(1);

    return jsonResponse({
      success: true,
      message: status === "verified" ? "مجموعه تأیید شد." : status === "rejected" ? "مدرک رد شد." : "تأیید مجموعه متوقف شد.",
      verification: publicAdminRow(row),
    });
  } catch {
    return jsonResponse({ success: false, message: "عملیات بررسی پرونده انجام نشد." }, 503);
  }
}
