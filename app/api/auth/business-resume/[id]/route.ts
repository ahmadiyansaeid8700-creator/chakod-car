import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import { accountActivities } from "../../../../../db/schema";
import { readBusinessResume, saveBusinessResume } from "../../../../../lib/business-resume";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function readUserId() {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return 0;
  const id = Math.round(Number(raw.user.id || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

async function ownedActivity(activityId: number, ownerUserId: number) {
  const [row] = await getDb()
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
    .where(and(eq(accountActivities.id, activityId), eq(accountActivities.ownerUserId, ownerUserId)))
    .limit(1);
  return row || null;
}

function publicActivity(row: NonNullable<Awaited<ReturnType<typeof ownedActivity>>>) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    neighborhood: row.neighborhood,
    address: row.address,
    status: row.status,
    verification_status: row.verificationStatus,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await readUserId();
  if (!userId) return jsonResponse({ success: false, message: "برای مشاهده رزومه کسب‌وکار وارد حساب شوید." }, 401);

  const { id: rawId } = await context.params;
  const activityId = Math.round(Number(rawId || 0));
  if (!Number.isSafeInteger(activityId) || activityId <= 0) {
    return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);
  }

  try {
    const activity = await ownedActivity(activityId, userId);
    if (!activity) return jsonResponse({ success: false, message: "کسب‌وکار پیدا نشد." }, 404);
    const resume = await readBusinessResume(activityId);
    return jsonResponse({
      success: true,
      activity: publicActivity(activity),
      resume: resume || {
        activity_id: activityId,
        headline: "",
        about: "",
        specialties: [],
        gallery: [],
        published: true,
        updated_at: "",
      },
      public_url: `/businesses/activity/${activityId}`,
    });
  } catch {
    return jsonResponse({ success: false, message: "رزومه کسب‌وکار فعلاً در دسترس نیست." }, 503);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const userId = await readUserId();
  if (!userId) return jsonResponse({ success: false, message: "برای ویرایش رزومه وارد حساب شوید." }, 401);

  const { id: rawId } = await context.params;
  const activityId = Math.round(Number(rawId || 0));
  if (!Number.isSafeInteger(activityId) || activityId <= 0) {
    return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات رزومه معتبر نیست." }, 400);
  }

  try {
    const activity = await ownedActivity(activityId, userId);
    if (!activity) return jsonResponse({ success: false, message: "کسب‌وکار پیدا نشد." }, 404);
    if (activity.type === "dealer") {
      return jsonResponse({ success: false, message: "رزومه نمایشگاه از پنل اختصاصی نمایشگاه مدیریت می‌شود." }, 409);
    }
    const resume = await saveBusinessResume(activityId, userId, input);
    return jsonResponse({
      success: true,
      message: "رزومه و آلبوم مجموعه ذخیره شد.",
      resume,
      public_url: `/businesses/activity/${activityId}`,
    });
  } catch {
    return jsonResponse({ success: false, message: "ذخیره رزومه انجام نشد." }, 503);
  }
}
