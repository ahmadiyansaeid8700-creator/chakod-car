import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { businessVerificationRequests } from "../../../../db/schema";
import {
  canSubmitDealerVerification,
  readDealerVerificationContext,
  readVerificationAccountUser,
} from "../../../../lib/business-verification-access";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DOCUMENT_BYTES = 1_000_000;
const DOCUMENT_TYPES = new Set(["business_license", "activity_license", "registration_document", "other"]);
const RELATIONS = new Set(["owner", "manager", "authorized_representative"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "application/pdf"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function publicRow(row: typeof businessVerificationRequests.$inferSelect) {
  return {
    id: row.id,
    activity_type: row.activityType,
    activity_external_id: row.activityExternalId,
    activity_name: row.activityName,
    applicant_relation: row.applicantRelation,
    document_type: row.documentType,
    document_reference: row.documentReference,
    license_holder_name: row.licenseHolderName,
    document_name: row.documentName,
    document_mime: row.documentMime,
    status: row.status,
    rejection_reason: row.rejectionReason,
    reviewed_at: row.reviewedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

async function authorizeDealer(dealerId: number) {
  const user = await readVerificationAccountUser();
  if (!user) return { error: jsonResponse({ success: false, message: "برای تأیید مجموعه وارد حساب شوید." }, 401) } as const;

  const context = await readDealerVerificationContext(dealerId);
  if (!canSubmitDealerVerification(context)) {
    return { error: jsonResponse({ success: false, message: "فقط مالک یا مدیر مجاز این نمایشگاه می‌تواند پرونده تأیید را مدیریت کند." }, 403) } as const;
  }

  return { user, context: context! } as const;
}

export async function GET(request: NextRequest) {
  const dealerId = Math.round(Number(request.nextUrl.searchParams.get("dealer_id") || 0));
  if (!Number.isSafeInteger(dealerId) || dealerId <= 0) {
    return jsonResponse({ success: false, message: "شناسه نمایشگاه معتبر نیست." }, 400);
  }

  const access = await authorizeDealer(dealerId);
  if ("error" in access) return access.error;

  try {
    const activityKey = `dealer:${dealerId}`;
    const [row] = await getDb()
      .select()
      .from(businessVerificationRequests)
      .where(eq(businessVerificationRequests.activityKey, activityKey))
      .limit(1);

    return jsonResponse({
      success: true,
      dealer: {
        id: dealerId,
        name: access.context.dealerName,
        role: access.context.role,
      },
      verification: row ? publicRow(row) : null,
    });
  } catch {
    return jsonResponse({ success: false, message: "وضعیت تأیید مجموعه در دسترس نیست. Migration را بررسی کنید." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات پرونده معتبر نیست." }, 400);
  }

  const dealerId = Math.round(Number(input.dealer_id || 0));
  if (!Number.isSafeInteger(dealerId) || dealerId <= 0) {
    return jsonResponse({ success: false, message: "شناسه نمایشگاه معتبر نیست." }, 400);
  }

  const access = await authorizeDealer(dealerId);
  if ("error" in access) return access.error;

  const applicantRelation = clean(input.applicant_relation, 40);
  const documentType = clean(input.document_type, 50);
  const documentReference = clean(input.document_reference, 100);
  const licenseHolderName = clean(input.license_holder_name, 160);
  const documentName = clean(input.document_name, 180).replace(/[\\/]/g, "-");
  const dataUrl = clean(input.document_data_url, 1_600_000);

  if (!RELATIONS.has(applicantRelation)) {
    return jsonResponse({ success: false, message: "نسبت درخواست‌کننده با مجموعه معتبر نیست." }, 422);
  }
  if (!DOCUMENT_TYPES.has(documentType)) {
    return jsonResponse({ success: false, message: "نوع مدرک معتبر نیست." }, 422);
  }
  if (licenseHolderName.length < 2) {
    return jsonResponse({ success: false, message: "نام صاحب مجوز را کامل وارد کنید." }, 422);
  }
  if (!documentName) {
    return jsonResponse({ success: false, message: "فایل مدرک انتخاب نشده است." }, 422);
  }

  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !ALLOWED_MIME.has(match[1])) {
    return jsonResponse({ success: false, message: "مدرک باید تصویر JPG/PNG یا PDF باشد." }, 422);
  }

  let bytes = 0;
  try {
    bytes = Buffer.from(match[2], "base64").byteLength;
  } catch {
    return jsonResponse({ success: false, message: "فایل مدرک معتبر نیست." }, 422);
  }
  if (bytes <= 0 || bytes > MAX_DOCUMENT_BYTES) {
    return jsonResponse({ success: false, message: "حجم مدرک بعد از آماده‌سازی باید حداکثر ۱ مگابایت باشد." }, 413);
  }

  const activityKey = `dealer:${dealerId}`;
  const values = {
    activityType: "dealer",
    activityExternalId: dealerId,
    activityName: access.context.dealerName,
    applicantUserId: access.user.id,
    applicantMobile: access.user.mobile,
    applicantRelation,
    documentType,
    documentReference,
    licenseHolderName,
    documentName,
    documentMime: match[1],
    documentBase64: match[2],
    status: "pending",
    rejectionReason: "",
    reviewedBy: "",
    reviewedAt: null,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  };

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(businessVerificationRequests)
      .where(eq(businessVerificationRequests.activityKey, activityKey))
      .limit(1);

    if (existing?.status === "verified") {
      return jsonResponse({ success: false, message: "این مجموعه قبلاً تأیید شده است." }, 409);
    }
    if (existing?.status === "suspended") {
      return jsonResponse({ success: false, message: "تأیید این مجموعه متوقف شده است؛ ابتدا با پشتیبانی یا مدیریت تماس بگیرید." }, 409);
    }

    let row: typeof businessVerificationRequests.$inferSelect;
    if (existing) {
      await db
        .update(businessVerificationRequests)
        .set(values)
        .where(eq(businessVerificationRequests.id, existing.id));
      [row] = await db
        .select()
        .from(businessVerificationRequests)
        .where(eq(businessVerificationRequests.id, existing.id))
        .limit(1);
    } else {
      [row] = await db
        .insert(businessVerificationRequests)
        .values({ activityKey, ...values })
        .returning();
    }

    return jsonResponse({
      success: true,
      message: "مدرک ثبت شد و برای بررسی مدیریت ارسال شد.",
      verification: publicRow(row),
    }, existing ? 200 : 201);
  } catch {
    return jsonResponse({ success: false, message: "ثبت پرونده تأیید انجام نشد. Migration را بررسی کنید." }, 503);
  }
}
