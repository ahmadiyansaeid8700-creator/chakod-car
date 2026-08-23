"use client";

import { useEffect, useState } from "react";
import {
  getAdminMe,
  getGoldenOpportunitySettings,
  saveGoldenOpportunitySettings,
  type AdminMeResponse,
} from "./api";
import {
  defaultGoldenOpportunitySettings,
  type GoldenOpportunitySettings,
} from "./types";
import { canManageGoldenOpportunity } from "./permission";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function normalizeSettings(payload: unknown): GoldenOpportunitySettings | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const candidate =
    (root.settings as Record<string, unknown> | undefined) ||
    (root.data as Record<string, unknown> | undefined) ||
    root;

  const merged = {
    ...defaultGoldenOpportunitySettings,
    ...candidate,
  } as GoldenOpportunitySettings;

  return merged;
}

export default function GoldenOpportunitySettingsPage() {
  const [settings, setSettings] = useState<GoldenOpportunitySettings>(
    defaultGoldenOpportunitySettings
  );
  const [admin, setAdmin] = useState<AdminMeResponse["admin"]>();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setCheckingAccess(true);
      setError("");
      setMessage("");

      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setError("برای ورود به این بخش ابتدا وارد حساب مدیریتی شوید.");
          setCheckingAccess(false);
        }
        return;
      }

      try {
        const adminResponse = await getAdminMe(token);
        const adminJson = (await adminResponse.json()) as AdminMeResponse;

        if (!adminResponse.ok || !adminJson.success || !adminJson.is_admin) {
          throw new Error(adminJson.message || "دسترسی مدیریت تأیید نشد.");
        }

        const adminData = adminJson.admin;
        const allowed = canManageGoldenOpportunity({
          role: adminData?.role,
          permissions: adminData?.permissions,
          canManageSettings: adminData?.can_manage_settings,
        });

        if (cancelled) return;

        setAdmin(adminData);
        setAccessAllowed(allowed);
        setCheckingAccess(false);

        if (!allowed) {
          setError("مجوز مدیریت قیمت‌ها برای این حساب فعال نیست.");
          return;
        }

        setLoadingSettings(true);
        const settingsResponse = await getGoldenOpportunitySettings(token);
        const settingsJson = await settingsResponse.json();

        if (!settingsResponse.ok) {
          const apiMessage =
            typeof settingsJson === "object" &&
            settingsJson &&
            "message" in settingsJson
              ? String((settingsJson as { message?: unknown }).message || "")
              : "";
          throw new Error(apiMessage || "دریافت تنظیمات فرصت طلایی ناموفق بود.");
        }

        const normalized = normalizeSettings(settingsJson);
        if (normalized && !cancelled) {
          setSettings(normalized);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "خطا در اتصال به سامانه مدیریت."
          );
        }
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
          setLoadingSettings(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function update(
    key: keyof GoldenOpportunitySettings,
    value: string | boolean
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === "number" ? Number(value) : value,
    }));
    setMessage("");
  }

  async function save() {
    const token = getToken();

    if (!token || !accessAllowed) {
      setError("اجازه ذخیره این تنظیمات را ندارید.");
      return;
    }

    const stillAllowed = canManageGoldenOpportunity({
      role: admin?.role,
      permissions: admin?.permissions,
      canManageSettings: admin?.can_manage_settings,
    });

    if (!stillAllowed) {
      setAccessAllowed(false);
      setError("مجوز مدیریت قیمت‌ها برای این حساب فعال نیست.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await saveGoldenOpportunitySettings(token, settings);
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const apiMessage =
          typeof json === "object" && json && "message" in json
            ? String((json as { message?: unknown }).message || "")
            : "";
        throw new Error(apiMessage || "ذخیره تنظیمات ناموفق بود.");
      }

      setMessage("تنظیمات فرصت طلایی ذخیره شد.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "خطا در ذخیره تنظیمات."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checkingAccess) {
    return (
      <main dir="rtl" style={{ padding: 24, fontFamily: "Tahoma" }}>
        در حال بررسی دسترسی مدیریت...
      </main>
    );
  }

  if (!accessAllowed) {
    return (
      <main dir="rtl" style={{ padding: 24, fontFamily: "Tahoma" }}>
        <h1>تنظیمات فرصت طلایی</h1>
        <p>{error || "دسترسی مدیریت قیمت‌ها برای این بخش فعال نیست."}</p>
      </main>
    );
  }

  return (
    <main dir="rtl" style={{ padding: 24, fontFamily: "Tahoma" }}>
      <h1>تنظیمات فرصت طلایی</h1>
      <p>مدیریت قیمت، ظرفیت، قوانین AI و بازگشت وجه.</p>

      {loadingSettings && <p>در حال دریافت تنظیمات...</p>}
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      {message && <p style={{ color: "#067647" }}>{message}</p>}

      <section>
        <label>فعال بودن فرصت طلایی</label>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update("enabled", e.target.checked)}
        />
      </section>

      <section>
        <label>هزینه بررسی فرصت طلایی</label>
        <input
          type="number"
          min={0}
          value={settings.reviewPrice}
          onChange={(e) => update("reviewPrice", e.target.value)}
        />
      </section>

      <section>
        <label>ظرفیت هر استان</label>
        <input
          type="number"
          min={1}
          value={settings.provinceCapacity}
          onChange={(e) => update("provinceCapacity", e.target.value)}
        />
      </section>

      <section>
        <label>ساعت شروع چرخه روزانه</label>
        <input
          type="time"
          value={settings.cycleStart}
          onChange={(e) => update("cycleStart", e.target.value)}
        />
      </section>

      <section>
        <label>حداقل امتیاز AI</label>
        <input
          type="number"
          min={0}
          max={100}
          value={settings.minimumAiScore}
          onChange={(e) => update("minimumAiScore", e.target.value)}
        />
      </section>

      <section>
        <label>مدت نمایش (ساعت)</label>
        <input
          type="number"
          min={1}
          value={settings.displayHours}
          onChange={(e) => update("displayHours", e.target.value)}
        />
      </section>

      <section>
        <label>بازگشت وجه در صورت رد</label>
        <input
          type="checkbox"
          checked={settings.refundEnabled}
          onChange={(e) => update("refundEnabled", e.target.checked)}
        />
      </section>

      <button disabled={saving || loadingSettings} onClick={() => void save()}>
        {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
      </button>
    </main>
  );
}
