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
import {
  AdminPage,
  AdminPanel,
  StatusPill,
} from "../../components/AdminPage";
import styles from "../../components/AdminForms.module.css";

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
      <AdminPage eyebrow="تنظیمات سیستم" title="فرصت طلایی" description="در حال بررسی سطح دسترسی مدیریت...">
        <AdminPanel title="بررسی دسترسی"><p className={styles.meta}>لطفاً چند لحظه صبر کنید.</p></AdminPanel>
      </AdminPage>
    );
  }

  if (!accessAllowed) {
    return (
      <AdminPage eyebrow="تنظیمات سیستم" title="فرصت طلایی" description="مدیریت این بخش فقط برای حساب‌های دارای مجوز قیمت‌گذاری فعال است.">
        <p className={styles.error}>{error || "دسترسی مدیریت قیمت‌ها برای این بخش فعال نیست."}</p>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow="تنظیمات سیستم"
      title="تنظیمات فرصت طلایی"
      description="قیمت بررسی، ظرفیت استانی، قوانین هوشمند و بازگشت وجه را از این مرکز مدیریت کنید."
      actions={<StatusPill>{settings.enabled ? "سرویس فعال" : "سرویس غیرفعال"}</StatusPill>}
    >
      {loadingSettings && <p className={styles.meta}>در حال دریافت تنظیمات...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.success}>{message}</p>}

      <AdminPanel title="قوانین نمایش و بررسی" description="این مقادیر پس از ذخیره به‌عنوان تنظیمات مرکزی فرصت طلایی استفاده می‌شوند.">
      <div className={styles.formGrid}>
      <label className={styles.field}>فعال بودن فرصت طلایی
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update("enabled", e.target.checked)}
        />
      </label>

      <label className={styles.field}>هزینه بررسی فرصت طلایی (تومان)
        <input
          type="number"
          min={0}
          value={settings.reviewPrice}
          onChange={(e) => update("reviewPrice", e.target.value)}
        />
      </label>

      <label className={styles.field}>ظرفیت هر استان
        <input
          type="number"
          min={1}
          value={settings.provinceCapacity}
          onChange={(e) => update("provinceCapacity", e.target.value)}
        />
      </label>

      <label className={styles.field}>ساعت شروع چرخه روزانه
        <input
          type="time"
          value={settings.cycleStart}
          onChange={(e) => update("cycleStart", e.target.value)}
        />
      </label>

      <label className={styles.field}>حداقل امتیاز AI
        <input
          type="number"
          min={0}
          max={100}
          value={settings.minimumAiScore}
          onChange={(e) => update("minimumAiScore", e.target.value)}
        />
      </label>

      <label className={styles.field}>مدت نمایش (ساعت)
        <input
          type="number"
          min={1}
          value={settings.displayHours}
          onChange={(e) => update("displayHours", e.target.value)}
        />
      </label>

      <label className={styles.field}>بازگشت وجه در صورت رد
        <input
          type="checkbox"
          checked={settings.refundEnabled}
          onChange={(e) => update("refundEnabled", e.target.checked)}
        />
      </label>
      </div>
      <div className={styles.toolbar}>
      <p className={styles.meta}>تنها مدیر دارای مجوز قیمت‌گذاری می‌تواند تغییرات را ذخیره کند.</p>
      <button className={styles.primaryButton} type="button" disabled={saving || loadingSettings} onClick={() => void save()}>
        {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
      </button>
      </div>
      </AdminPanel>
    </AdminPage>
  );
}
