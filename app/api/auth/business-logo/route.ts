import { NextRequest } from "next/server";

import {
  authApiUrl,
  jsonResponse,
  parseJsonResponse,
  rejectCrossSiteMutation,
  requestIdentityHeaders,
} from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_LOGO_SIZE = 6 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function positiveId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const headers = requestIdentityHeaders(request);
  if (!headers.Authorization) {
    return jsonResponse({ success: false, message: "برای بارگذاری لوگو وارد حساب شوید." }, 401);
  }

  let input: FormData;
  try {
    input = await request.formData();
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات فایل لوگو معتبر نیست." }, 400);
  }

  const dealerId = positiveId(input.get("dealer_id"));
  const file = input.get("file");

  if (!dealerId) {
    return jsonResponse({ success: false, message: "شناسه نمایشگاه معتبر نیست." }, 400);
  }
  if (!(file instanceof File)) {
    return jsonResponse({ success: false, message: "فایل لوگو انتخاب نشده است." }, 400);
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return jsonResponse({ success: false, message: "فرمت لوگو باید JPG، PNG یا WEBP باشد." }, 400);
  }
  if (file.size <= 0 || file.size > MAX_LOGO_SIZE) {
    return jsonResponse({ success: false, message: "حجم لوگو باید حداکثر ۶ مگابایت باشد." }, 400);
  }

  try {
    const accessResponse = await fetch(
      authApiUrl(`/api/dealer-command-center.php?dealer_id=${encodeURIComponent(String(dealerId))}`),
      {
        method: "GET",
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(15_000),
      },
    );
    const accessPayload = await parseJsonResponse(accessResponse);
    if (!accessResponse.ok || accessPayload?.success !== true || !isRecord(accessPayload.dealer)) {
      return jsonResponse(
        { success: false, message: "دسترسی شما به این نمایشگاه تأیید نشد." },
        accessResponse.status === 401 || accessResponse.status === 403 ? accessResponse.status : 403,
      );
    }
    if (positiveId(accessPayload.dealer.id) !== dealerId) {
      return jsonResponse({ success: false, message: "نمایشگاه انتخاب‌شده معتبر نیست." }, 403);
    }

    const uploadBody = new FormData();
    uploadBody.set("kind", "logo");
    uploadBody.set("file", file, file.name || "dealer-logo");

    const uploadResponse = await fetch(authApiUrl("/api/upload-professional-media.php"), {
      method: "POST",
      cache: "no-store",
      headers,
      body: uploadBody,
      signal: AbortSignal.timeout(120_000),
    });
    const uploadPayload = await parseJsonResponse(uploadResponse);
    const logoUrl = typeof uploadPayload?.url === "string" ? uploadPayload.url.trim() : "";
    if (!uploadResponse.ok || uploadPayload?.success !== true || !logoUrl) {
      return jsonResponse(
        { success: false, message: String(uploadPayload?.message || "بارگذاری فایل لوگو انجام نشد.") },
        uploadResponse.status >= 400 ? uploadResponse.status : 502,
      );
    }

    const profileResponse = await fetch(authApiUrl("/api/professional-profile.php"), {
      method: "GET",
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    const profilePayload = await parseJsonResponse(profileResponse);
    if (!profileResponse.ok || profilePayload?.success !== true || !isRecord(profilePayload.profile)) {
      return jsonResponse(
        { success: false, message: String(profilePayload?.message || "پروفایل مجموعه برای ذخیره لوگو دریافت نشد.") },
        profileResponse.status >= 400 ? profileResponse.status : 502,
      );
    }

    const currentProfile = profilePayload.profile;
    const profileDealerId = positiveId(currentProfile.dealer_id);
    if (profileDealerId && profileDealerId !== dealerId) {
      return jsonResponse({ success: false, message: "پروفایل حرفه‌ای به نمایشگاه انتخاب‌شده تعلق ندارد." }, 409);
    }

    const saveHeaders: Record<string, string> = {
      ...headers,
      "Content-Type": "application/json",
    };
    const saveResponse = await fetch(authApiUrl("/api/professional-profile.php"), {
      method: "POST",
      cache: "no-store",
      headers: saveHeaders,
      body: JSON.stringify({ ...currentProfile, dealer_id: dealerId, logo_url: logoUrl }),
      signal: AbortSignal.timeout(30_000),
    });
    const savedPayload = await parseJsonResponse(saveResponse);
    if (!saveResponse.ok || savedPayload?.success !== true) {
      return jsonResponse(
        { success: false, message: String(savedPayload?.message || "ذخیره لوگوی مجموعه انجام نشد.") },
        saveResponse.status >= 400 ? saveResponse.status : 502,
      );
    }

    const savedProfile = isRecord(savedPayload.profile)
      ? savedPayload.profile
      : { ...currentProfile, dealer_id: dealerId, logo_url: logoUrl };

    return jsonResponse({
      success: true,
      message: "لوگوی مجموعه ذخیره شد.",
      url: logoUrl,
      profile: savedProfile,
    });
  } catch {
    return jsonResponse(
      { success: false, message: "ارتباط با سرویس لوگوی مجموعه برقرار نشد. دوباره تلاش کنید." },
      502,
    );
  }
}
