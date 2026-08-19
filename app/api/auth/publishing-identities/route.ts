import { NextRequest } from "next/server";

import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../lib/server-route-access";
import { authApiUrl, parseJsonResponse, requestIdentityHeaders } from "../../../../lib/chakod-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishingIdentity = {
  key: string;
  kind: "personal" | "dealer";
  label: string;
  subtitle: string;
  dealer_id: number | null;
  role: string;
  can_publish_vehicle: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function roleLabel(value: string) {
  if (value === "owner") return "مالک";
  if (value === "manager") return "مدیر";
  if (value === "sales") return "فروش";
  if (value === "content") return "محتوا";
  return "عضو مجموعه";
}

function normalizeDealer(item: Record<string, unknown>): PublishingIdentity | null {
  const dealerId = Math.round(Number(item.id ?? item.dealer_id ?? 0));
  if (!Number.isSafeInteger(dealerId) || dealerId <= 0) return null;
  if (item.is_active === false || Number(item.is_active ?? 1) === 0) return null;

  const name = clean(item.dealer_name ?? item.name ?? item.title, 160) || `نمایشگاه ${dealerId}`;
  const role = clean(item.role, 60) || "member";
  return {
    key: `dealer:${dealerId}`,
    kind: "dealer",
    label: name,
    subtitle: `نمایشگاه خودرو · ${roleLabel(role)}`,
    dealer_id: dealerId,
    role,
    can_publish_vehicle: true,
  };
}

export async function GET(request: NextRequest) {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) {
    return jsonResponse({ success: false, message: "برای انتخاب هویت انتشار وارد حساب شوید." }, 401);
  }

  const fullName = clean(raw.user.full_name ?? raw.user.display_name, 120) || "آگهی شخصی";
  const identities: PublishingIdentity[] = [
    {
      key: "personal",
      kind: "personal",
      label: fullName,
      subtitle: "انتشار به نام شخصی",
      dealer_id: null,
      role: "owner",
      can_publish_vehicle: true,
    },
  ];

  try {
    const response = await fetch(authApiUrl("/api/my-dealers.php"), {
      method: "GET",
      cache: "no-store",
      headers: requestIdentityHeaders(request),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await parseJsonResponse(response);
    const items = Array.isArray(payload?.data) ? payload.data : [];
    const seen = new Set<number>();

    for (const item of items) {
      if (!isRecord(item)) continue;
      const identity = normalizeDealer(item);
      if (!identity || !identity.dealer_id || seen.has(identity.dealer_id)) continue;
      seen.add(identity.dealer_id);
      identities.push(identity);
    }
  } catch {
    // Personal publishing remains available even when dealer discovery is temporarily unavailable.
  }

  return jsonResponse({
    success: true,
    vehicle: identities,
    note: "Vehicle listings currently support personal or dealer identities. Other business activity types use their own advertising flows until the listing backend accepts activity_id.",
  });
}
