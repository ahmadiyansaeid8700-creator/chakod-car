"use client";

import { useEffect, useState } from "react";
import { AdminPage, AdminPanel, StatusPill } from "../../components/AdminPage";
import styles from "../../components/AdminForms.module.css";

const API_BASE = "https://api.chakod.com";

type PricingSettings = {
  adPrice?: number;
  featuredPrice?: number;
  buyerDiscountPercent?: number;
  referralCommissionPercent?: number;
  updatedAt?: string;
};

export default function PricingManagementPage() {
  const [settings, setSettings] = useState<PricingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSettings() {
    try {
      const response = await fetch(`${API_BASE}/api/admin/pricing-settings.php`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (response.ok) setSettings(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/pricing-settings.php`, {
        method: "PUT",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("ذخیره تنظیمات انجام نشد");
      setMessage("تنظیمات با موفقیت ذخیره شد");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطا در ذخیره اطلاعات");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof PricingSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <AdminPage
      eyebrow="تجارت و درآمد"
      title="قیمت‌گذاری مرکزی"
      description="قیمت خدمات، تخفیف خریدار و پورسانت معرف را از یک منبع مرکزی مدیریت کنید."
      actions={<StatusPill>{loading ? "در حال همگام‌سازی" : "اطلاعات همگام است"}</StatusPill>}
    >
      <AdminPanel title="قوانین قیمت و سهم‌ها" description="تغییرات پس از ذخیره در مسیرهای خرید و ثبت آگهی استفاده می‌شوند.">
        {message ? <p className={message.includes("موفقیت") ? styles.success : styles.error}>{message}</p> : null}
        <div className={styles.formGrid}>
          <label className={styles.field}>قیمت ثبت آگهی (تومان)
            <input inputMode="numeric" value={settings.adPrice ?? ""} onChange={(event) => updateField("adPrice", event.target.value)} />
          </label>
          <label className={styles.field}>قیمت خدمات ویژه (تومان)
            <input inputMode="numeric" value={settings.featuredPrice ?? ""} onChange={(event) => updateField("featuredPrice", event.target.value)} />
          </label>
          <label className={styles.field}>درصد تخفیف خریدار
            <input inputMode="decimal" value={settings.buyerDiscountPercent ?? ""} onChange={(event) => updateField("buyerDiscountPercent", event.target.value)} />
          </label>
          <label className={styles.field}>درصد پورسانت معرف
            <input inputMode="decimal" value={settings.referralCommissionPercent ?? ""} onChange={(event) => updateField("referralCommissionPercent", event.target.value)} />
          </label>
        </div>
        <div className={styles.toolbar}>
          <p className={styles.meta}>آخرین تغییر: {settings.updatedAt ?? "—"}</p>
          <button className={styles.primaryButton} type="button" disabled={saving || loading} onClick={saveSettings}>
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
