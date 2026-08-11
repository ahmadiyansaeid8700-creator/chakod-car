import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { supportTickets } from "../../../../db/schema";
import {
  readBusinessDeletionContext,
  verifyBusinessDeletionCode,
} from "../../../../lib/business-deletion-access";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";
import {
  createPublicReference,
  getFinanceOwnerKey,
} from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 4_000;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ success: false, message: "حجم درخواست معتبر نیست." }, 413);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات درخواست معتبر نیست." }, 400);
  }

  const activityId = Math.round(Number(input.activity_id || 0));
  const activityType = clean(input.activity_type, 40);
  const dealerId = Math.round(Number(input.dealer_id || 0));
  const code = clean(input.code, 10)
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");
  const reason = clean(input.reason, 800);

  const context = await readBusinessDeletionContext({ activityId, activityType, dealerId });
  if (!context) {
    return jsonResponse(
      { success: false, message: "فقط مالک این کسب‌وکار می‌تواند درخواست حذف ثبت کند." },
      403,
    );
  }

  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "نشست حساب معتبر نیست. دوباره وارد شوید." }, 401);
  }

  const subject = `درخواست حذف کسب‌وکار: ${context.activityName}`.slice(0, 180);

  try {
    const [existing] = await getDb()
      .select({ ticketNo: supportTickets.ticketNo })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.ownerKey, ownerKey),
          eq(supportTickets.topic, "business"),
          eq(supportTickets.subject, subject),
          eq(supportTickets.status, "open"),
        ),
      )
      .limit(1);

    if (existing) {
      return jsonResponse(
        {
          success: false,
          message: "برای این کسب‌وکار قبلاً درخواست حذف باز ثبت شده است.",
          ticket_no: existing.ticketNo,
          tracking_url: `/support/tickets/${encodeURIComponent(existing.ticketNo)}`,
        },
        409,
      );
    }
  } catch {
    return jsonResponse({ success: false, message: "وضعیت درخواست‌های قبلی در دسترس نیست." }, 503);
  }

  try {
    const verified = await verifyBusinessDeletionCode({
      mobile: context.mobile,
      userId: context.userId,
      code,
    });
    if (!verified.ok) {
      return jsonResponse({ success: false, message: verified.message }, verified.status || 422);
    }
  } catch {
    return jsonResponse({ success: false, message: "بررسی کد تأیید انجام نشد." }, 502);
  }

  try {
    const ticketNo = createPublicReference("DEL");
    const message = [
      "درخواست حذف کسب‌وکار با احراز مجدد شماره موبایل صاحب حساب ثبت شده است.",
      context.activityId ? `شناسه فعالیت چاکود: ${context.activityId}` : "",
      `کلید فعالیت: ${context.activityKey}`,
      `نوع فعالیت: ${context.activityType}`,
      `نام مجموعه: ${context.activityName}`,
      `شناسه کاربر درخواست‌کننده: ${context.userId}`,
      context.activityExternalId ? `شناسه خارجی مجموعه: ${context.activityExternalId}` : "",
      reason ? `توضیح کاربر: ${reason}` : "توضیح کاربر: ثبت نشده",
      "نکته اجرایی: تا زمان بررسی وابستگی‌ها و اجرای حذف سمت Backend، مجموعه نباید خودکار حذف یا غیرفعال شود.",
    ].filter(Boolean).join("\n");

    const [ticket] = await getDb()
      .insert(supportTickets)
      .values({
        ticketNo,
        ownerKey,
        fullName: "",
        mobile: context.mobile,
        email: "",
        topic: "business",
        subject,
        message,
        status: "open",
        priority: "normal",
      })
      .returning();

    return jsonResponse(
      {
        success: true,
        message: "درخواست حذف کسب‌وکار ثبت شد.",
        ticket_no: ticket.ticketNo,
        tracking_url: `/support/tickets/${encodeURIComponent(ticket.ticketNo)}`,
      },
      201,
    );
  } catch {
    return jsonResponse({ success: false, message: "ثبت درخواست حذف انجام نشد." }, 503);
  }
}
