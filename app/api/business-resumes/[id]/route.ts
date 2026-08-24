import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { accountActivities } from "../../../../db/schema";
import { readBusinessResume } from "../../../../lib/business-resume";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function typeLabel(type: string) {
  if (type === "parts_store") return "فروشگاه قطعات و لوازم یدکی";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار خودرو";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const activityId = Math.round(Number(rawId || 0));
  if (!Number.isSafeInteger(activityId) || activityId <= 0) {
    return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);
  }

  try {
    const [activity] = await getDb()
      .select({
        id: accountActivities.id,
        type: accountActivities.activityType,
        name: accountActivities.name,
        phone: accountActivities.phone,
        province: accountActivities.province,
        city: accountActivities.city,
        neighborhood: accountActivities.neighborhood,
        address: accountActivities.address,
        status: accountActivities.status,
        verificationStatus: accountActivities.verificationStatus,
      })
      .from(accountActivities)
      .where(eq(accountActivities.id, activityId))
      .limit(1);

    if (!activity || activity.type === "dealer" || activity.status !== "active") {
      return jsonResponse({ success: false, message: "صفحه این کسب‌وکار در دسترس نیست." }, 404);
    }

    const resume = await readBusinessResume(activityId);
    if (!resume || !resume.published) {
      return jsonResponse({ success: false, message: "رزومه این کسب‌وکار هنوز منتشر نشده است." }, 404);
    }

    return jsonResponse({
      success: true,
      activity: {
        id: activity.id,
        type: activity.type,
        type_title: typeLabel(activity.type),
        name: activity.name,
        phone: activity.phone,
        province: activity.province,
        city: activity.city,
        neighborhood: activity.neighborhood,
        address: activity.address,
        is_verified: activity.verificationStatus === "verified",
      },
      resume,
    });
  } catch {
    return jsonResponse({ success: false, message: "رزومه کسب‌وکار فعلاً در دسترس نیست." }, 503);
  }
}
