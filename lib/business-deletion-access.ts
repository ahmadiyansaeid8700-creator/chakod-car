import {
  authApiUrl,
  parseJsonResponse,
} from "./chakod-auth-proxy";
import { readDealerVerificationContext } from "./business-verification-access";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_REFUND_VERSION,
  CURRENT_TERMS_VERSION,
} from "./legal-consent";
import { readServerIdentity } from "./server-route-access";

export const DELETABLE_BUSINESS_TYPES = [
  "dealer",
  "parts_store",
  "repair_shop",
  "car_service",
] as const;

export type DeletableBusinessType = (typeof DELETABLE_BUSINESS_TYPES)[number];

export type BusinessDeletionContext = {
  activityType: DeletableBusinessType;
  activityKey: string;
  activityExternalId: number;
  activityName: string;
  userId: number;
  mobile: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeMobile(value: unknown) {
  if (typeof value !== "string") return "";
  let mobile = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\s\-_()]/g, "");

  if (mobile.startsWith("+98")) mobile = `0${mobile.slice(3)}`;
  if (mobile.startsWith("98") && mobile.length === 12) mobile = `0${mobile.slice(2)}`;
  return mobile;
}

function isDeletionType(value: string): value is DeletableBusinessType {
  return (DELETABLE_BUSINESS_TYPES as readonly string[]).includes(value);
}

export async function readBusinessDeletionContext(input: {
  activityType: string;
  dealerId?: number;
}): Promise<BusinessDeletionContext | null> {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return null;

  const userId = Math.round(Number(raw.user.id || 0));
  const mobile = normalizeMobile(raw.user.mobile);
  const accountType = clean(raw.user.account_type, 40);
  const activityType = clean(input.activityType, 40);

  if (!Number.isSafeInteger(userId) || userId <= 0 || !/^09\d{9}$/.test(mobile)) return null;
  if (!isDeletionType(activityType)) return null;

  if (activityType === "dealer") {
    const dealerId = Math.round(Number(input.dealerId || 0));
    if (!Number.isSafeInteger(dealerId) || dealerId <= 0) return null;

    const dealer = await readDealerVerificationContext(dealerId);
    if (!dealer || dealer.role !== "owner") return null;

    return {
      activityType,
      activityKey: `dealer:${dealerId}`,
      activityExternalId: dealerId,
      activityName: dealer.dealerName,
      userId,
      mobile,
    };
  }

  // Legacy professional profiles are currently owned directly by the signed-in account.
  // Once generic activities land, this branch should resolve ownership by activity membership too.
  if (accountType !== activityType) return null;

  const activityName =
    clean(raw.user.business_name, 160) ||
    (activityType === "parts_store"
      ? "فروشگاه قطعات"
      : activityType === "repair_shop"
        ? "تعمیرگاه خودرو"
        : "مرکز خدمات خودرو");

  return {
    activityType,
    activityKey: `${activityType}:user:${userId}`,
    activityExternalId: 0,
    activityName,
    userId,
    mobile,
  };
}

export async function sendBusinessDeletionCode(mobile: string) {
  const upstream = await fetch(authApiUrl("/api/send-login-code.php"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile,
      accept_terms: true,
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
      refund_version: CURRENT_REFUND_VERSION,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await parseJsonResponse(upstream);
  return {
    ok: upstream.ok && payload?.success === true,
    status: upstream.status,
    message: clean(payload?.message, 300) || (upstream.ok ? "کد تأیید ارسال شد." : "ارسال کد تأیید انجام نشد."),
  };
}

export async function verifyBusinessDeletionCode(input: {
  mobile: string;
  userId: number;
  code: string;
}) {
  if (!/^\d{5}$/.test(input.code)) {
    return { ok: false, status: 400, message: "کد تأیید باید ۵ رقم باشد." };
  }

  const upstream = await fetch(authApiUrl("/api/verify-login-code.php"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mobile: input.mobile, code: input.code }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await parseJsonResponse(upstream);
  if (!upstream.ok || payload?.success !== true || !isRecord(payload.user)) {
    return {
      ok: false,
      status: upstream.status || 422,
      message: clean(payload?.message, 300) || "کد تأیید صحیح نیست.",
    };
  }

  const verifiedUserId = Math.round(Number(payload.user.id || 0));
  const verifiedMobile = normalizeMobile(payload.user.mobile);
  if (verifiedUserId !== input.userId || verifiedMobile !== input.mobile) {
    return { ok: false, status: 403, message: "کد تأیید با صاحب این حساب تطبیق ندارد." };
  }

  return { ok: true, status: 200, message: "هویت صاحب حساب تأیید شد." };
}
