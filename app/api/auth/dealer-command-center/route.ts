import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { businessVerificationRequests } from "../../../../db/schema";
import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASELINE_MEMBER_PERMISSION = "ads.manage";
const LISTING_STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  pending: "در انتظار بررسی",
  rejected: "نیازمند اصلاح",
  sold: "فروخته‌شده",
  inactive: "غیرفعال",
  expired: "منقضی‌شده",
  deleted: "بایگانی‌شده",
  draft: "پیش‌نویس",
};

type MutationPayload = Record<string, unknown>;

function endpoint(request: NextRequest) {
  const dealerId = request.nextUrl.searchParams.get("dealer_id");
  return dealerId
    ? `/api/dealer-command-center.php?dealer_id=${encodeURIComponent(dealerId)}`
    : "/api/dealer-command-center.php";
}

function isRecord(value: unknown): value is MutationPayload {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function positiveId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function localizeListingStatus(value: unknown) {
  const code = String(value || "").trim().toLowerCase();
  if (LISTING_STATUS_LABELS[code]) return LISTING_STATUS_LABELS[code];
  if (typeof value === "string" && value && !/[A-Za-z]/.test(value)) return value;
  return "وضعیت نامشخص";
}

function localizeCommandPayload(payload: MutationPayload): MutationPayload {
  if (!Array.isArray(payload.top_listings)) return payload;

  return {
    ...payload,
    top_listings: payload.top_listings.map((item) => {
      if (!isRecord(item)) return item;
      return { ...item, status: localizeListingStatus(item.status) };
    }),
  };
}

async function readMutationPayload(request: NextRequest): Promise<MutationPayload | null> {
  try {
    const payload: unknown = await request.json();
    return isRecord(payload) ? { ...payload } : null;
  } catch {
    return null;
  }
}

function ensureInviteBaseline(payload: MutationPayload) {
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((item): item is string => typeof item === "string")
    : [];

  return {
    ...payload,
    status: "invited",
    permissions: Array.from(new Set([...permissions, BASELINE_MEMBER_PERMISSION])),
  };
}

async function requireVerifiedManagement(dealerId: number) {
  if (!dealerId) {
    return jsonResponse({ success: false, message: "شناسه نمایشگاه معتبر نیست." }, 400);
  }

  try {
    const [verification] = await getDb()
      .select({ status: businessVerificationRequests.status })
      .from(businessVerificationRequests)
      .where(eq(businessVerificationRequests.activityKey, `dealer:${dealerId}`))
      .limit(1);

    if (verification?.status !== "verified") {
      return jsonResponse(
        {
          success: false,
          message: "برای افزودن پرسنل ابتدا مجوز مجموعه را ثبت کنید و تأیید مدیریت چاکود را دریافت کنید.",
          verification_required: true,
          verification_status: verification?.status || "unverified",
        },
        403,
      );
    }
  } catch {
    return jsonResponse(
      {
        success: false,
        message: "وضعیت تأیید مدیریت مجموعه در دسترس نیست؛ برای امنیت تیم، افزودن پرسنل موقتاً قفل است.",
      },
      503,
    );
  }

  return null;
}

async function readCurrentMemberStatus(request: NextRequest, dealerId: number, memberId: number) {
  if (!dealerId || !memberId) return null;

  try {
    const response = await fetch(
      authApiUrl(`/api/dealer-command-center.php?dealer_id=${encodeURIComponent(String(dealerId))}`),
      {
        method: "GET",
        cache: "no-store",
        headers: requestIdentityHeaders(request),
        signal: AbortSignal.timeout(12_000),
      },
    );
    const payload = await parseJsonResponse(response);
    if (!response.ok || payload?.success !== true || !Array.isArray(payload.members)) return null;

    const member = payload.members.find((item) => isRecord(item) && positiveId(item.id) === memberId);
    return isRecord(member) && typeof member.status === "string" ? member.status : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(authApiUrl(endpoint(request)), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await parseJsonResponse(response);
    if (!isRecord(payload)) {
      return jsonResponse({ success: false, message: "پاسخ پنل نمایشگاه معتبر نیست." }, 502);
    }
    return jsonResponse(localizeCommandPayload(payload), response.status);
  } catch {
    return jsonResponse({ success: false, message: "ارتباط با سرویس پنل نمایشگاه برقرار نشد." }, 502);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const payload = await readMutationPayload(request);
  if (!payload) {
    return jsonResponse({ success: false, message: "اطلاعات عضو تیم معتبر نیست." }, 400);
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  const dealerId = positiveId(payload.dealer_id || request.nextUrl.searchParams.get("dealer_id"));

  if (action === "invite_member") {
    const verificationError = await requireVerifiedManagement(dealerId);
    if (verificationError) return verificationError;

    const invitePayload = ensureInviteBaseline(payload);
    return proxyAuthenticatedJson(request, endpoint(request), {
      method: "POST",
      body: JSON.stringify(invitePayload),
      timeoutMs: 20_000,
    });
  }

  return proxyAuthenticatedJson(request, endpoint(request), {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 20_000,
  });
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const payload = await readMutationPayload(request);
  if (!payload) {
    return jsonResponse({ success: false, message: "اطلاعات عضو معتبر نیست." }, 400);
  }

  if (payload.status === "active") {
    const dealerId = positiveId(payload.dealer_id || request.nextUrl.searchParams.get("dealer_id"));
    const memberId = positiveId(payload.member_id);
    const currentStatus = await readCurrentMemberStatus(request, dealerId, memberId);

    if (!currentStatus) {
      return jsonResponse(
        { success: false, message: "وضعیت فعلی عضو قابل بررسی نیست؛ تغییر وضعیت انجام نشد." },
        503,
      );
    }
    if (currentStatus === "invited") {
      return jsonResponse(
        {
          success: false,
          message: "فعال‌سازی عضو دعوت‌شده از طرف مدیر مجاز نیست. خود شخص باید دعوت را از حساب خودش قبول کند.",
        },
        403,
      );
    }
  }

  return proxyAuthenticatedJson(request, endpoint(request), {
    method: "PATCH",
    body: JSON.stringify(payload),
    timeoutMs: 20_000,
  });
}
