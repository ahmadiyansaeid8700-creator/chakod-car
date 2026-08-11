import { NextRequest } from "next/server";

import {
  readBusinessDeletionContext,
  sendBusinessDeletionCode,
} from "../../../../../lib/business-deletion-access";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 2_000;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function maskMobile(value: string) {
  return value.length >= 11 ? `${value.slice(0, 4)}••••${value.slice(-3)}` : value;
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
  const context = await readBusinessDeletionContext({ activityId, activityType, dealerId });

  if (!context) {
    return jsonResponse(
      { success: false, message: "فقط مالک این کسب‌وکار می‌تواند درخواست حذف ثبت کند." },
      403,
    );
  }

  try {
    const sent = await sendBusinessDeletionCode(context.mobile);
    if (!sent.ok) return jsonResponse({ success: false, message: sent.message }, sent.status || 502);

    return jsonResponse({
      success: true,
      message: "کد تأیید به شماره صاحب حساب ارسال شد.",
      mobile_masked: maskMobile(context.mobile),
      business_name: context.activityName,
      activity_id: context.activityId,
    });
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس پیامک برقرار نشد." }, 502);
  }
}
