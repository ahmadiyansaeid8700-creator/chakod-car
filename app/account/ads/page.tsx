"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AccountType = "personal" | "dealer" | "parts_store" | "repair_shop" | "car_service" | "business";

type MeResponse = {
  success?: boolean;
  user?: { account_type?: AccountType | null } | null;
};

function destinationFor(type?: AccountType | null) {
  if (type === "dealer") return "/account/business/promotions/featured";
  if (type === "parts_store" || type === "repair_shop" || type === "car_service") {
    return "/advertising/business-placement";
  }
  return "/account/promotions";
}

function cachedAccountType(): AccountType | null {
  try {
    const raw = localStorage.getItem("chakod_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { account_type?: AccountType | null };
    return parsed.account_type || null;
  } catch {
    return null;
  }
}

export default function LegacyAdsPage() {
  const router = useRouter();

  useEffect(() => {
    const cached = cachedAccountType();
    if (cached) {
      router.replace(destinationFor(cached));
      return;
    }

    const token = localStorage.getItem("chakod_session_token") || "";
    fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {}),
      },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as MeResponse | null;
        router.replace(destinationFor(payload?.success ? payload.user?.account_type : null));
      })
      .catch(() => router.replace("/account/promotions"));
  }, [router]);

  return (
    <main dir="rtl" style={{ minHeight: "45vh", display: "grid", placeItems: "center", padding: 24 }}>
      <p style={{ margin: 0, color: "#6b5a76", fontWeight: 800 }}>در حال باز کردن تبلیغات مناسب حساب شما…</p>
    </main>
  );
}
