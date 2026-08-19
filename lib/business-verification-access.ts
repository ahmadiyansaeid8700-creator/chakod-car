import { cookies } from "next/headers";

import {
  authApiUrl,
  CHAKOD_SESSION_COOKIE,
  parseJsonResponse,
} from "./chakod-auth-proxy";
import { readServerIdentity } from "./server-route-access";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export type VerificationAccountUser = {
  id: number;
  mobile: string;
  fullName: string;
};

export type DealerVerificationContext = {
  dealerId: number;
  dealerName: string;
  role: string;
  permissions: string[];
};

export async function readVerificationAccountUser(): Promise<VerificationAccountUser | null> {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return null;

  const id = Math.round(Number(raw.user.id || 0));
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    mobile: clean(raw.user.mobile, 30),
    fullName: clean(raw.user.full_name || raw.user.display_name, 120),
  };
}

export async function readDealerVerificationContext(
  dealerId: number,
): Promise<DealerVerificationContext | null> {
  if (!Number.isSafeInteger(dealerId) || dealerId <= 0) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(CHAKOD_SESSION_COOKIE)?.value?.trim() || "";
  if (!TOKEN_PATTERN.test(token)) return null;

  try {
    const response = await fetch(
      authApiUrl(`/api/dealer-command-center.php?dealer_id=${encodeURIComponent(String(dealerId))}`),
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Session-Token": token,
        },
        signal: AbortSignal.timeout(12_000),
      },
    );

    if (!response.ok) return null;
    const payload = await parseJsonResponse(response);
    if (!payload || payload.success !== true || !isRecord(payload.dealer)) return null;

    const resolvedDealerId = Math.round(Number(payload.dealer.id || 0));
    if (resolvedDealerId !== dealerId) return null;

    const role = clean(payload.role, 60);
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.map(String).filter(Boolean)
      : [];

    return {
      dealerId,
      dealerName: clean(payload.dealer.name, 160) || `نمایشگاه ${dealerId}`,
      role,
      permissions,
    };
  } catch {
    return null;
  }
}

export function canSubmitDealerVerification(context: DealerVerificationContext | null) {
  if (!context) return false;
  return context.role === "owner" || context.role === "manager" || context.permissions.includes("*") || context.permissions.includes("settings.manage");
}

export type VerificationAdmin = {
  allowed: boolean;
  reviewer: string;
};

export async function readVerificationAdmin(): Promise<VerificationAdmin> {
  const raw: unknown = await readServerIdentity("/api/admin-me.php");
  if (!isRecord(raw) || raw.success !== true || raw.is_admin !== true) {
    return { allowed: false, reviewer: "" };
  }

  const admin = isRecord(raw.admin) ? raw.admin : {};
  const permissions = Array.isArray(admin.permissions) ? admin.permissions.map(String) : [];
  const role = clean(admin.role || admin.role_key, 80);
  const allowed =
    raw.is_site_owner === true ||
    permissions.includes("*") ||
    permissions.includes("settings.manage") ||
    permissions.includes("businesses.manage") ||
    ["site_owner", "super_admin", "admin"].includes(role);

  return {
    allowed,
    reviewer: clean(admin.email || admin.mobile || admin.full_name || role, 180) || "admin",
  };
}
