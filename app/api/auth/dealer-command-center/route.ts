import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { businessVerificationRequests } from "../../../../db/schema";
import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASELINE_MEMBER_PERMISSION = "ads.manage";

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

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, endpoint(request));
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
    return jsonResponse(
      {
        success: false,
        message: "فعال‌سازی عضو از طرف مدیر مجاز نیست. عضو دعوت‌شده باید دعوت را از حساب خودش قبول کند.",
      },
      403,
    );
  }

  return proxyAuthenticatedJson(request, endpoint(request), {
    method: "PATCH",
    body: JSON.stringify(payload),
    timeoutMs: 20_000,
  });
}
