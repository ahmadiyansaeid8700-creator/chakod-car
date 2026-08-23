"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/pricing-settings.php`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      if (response.ok) {
        setSettings(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/pricing-settings.php`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error("ذخیره تنظیمات انجام نشد");
      }

      setMessage("تنظیمات با موفقیت ذخیره شد");
      await loadSettings();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطا در ذخیره اطلاعات"
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof PricingSettings, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }

  if (loading) {
    return <main dir="rtl">در حال دریافت تنظیمات...</main>;
  }

  return (
    <main dir="rtl" style={{ padding: 24 }}>
      <h1>مدیریت قیمت‌گذاری مرکزی</h1>

      <p>
        تمام قیمت‌ها، تخفیف خریدار و پورسانت معرف باید از این مرکز کنترل شوند.
      </p>

      <section>
        <label>
          قیمت ثبت آگهی
          <input
            value={settings.adPrice ?? ""}
            onChange={(e) => updateField("adPrice", e.target.value)}
          />
        </label>

        <label>
          قیمت خدمات ویژه
          <input
            value={settings.featuredPrice ?? ""}
            onChange={(e) => updateField("featuredPrice", e.target.value)}
          />
        </label>

        <label>
          درصد تخفیف خریدار
          <input
            value={settings.buyerDiscountPercent ?? ""}
            onChange={(e) =>
              updateField("buyerDiscountPercent", e.target.value)
            }
          />
        </label>

        <label>
          درصد پورسانت معرف
          <input
            value={settings.referralCommissionPercent ?? ""}
            onChange={(e) =>
              updateField("referralCommissionPercent", e.target.value)
            }
          />
        </label>

        <button type="button" disabled={saving} onClick={saveSettings}>
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
      </section>

      <p>{message}</p>

      <p>آخرین تغییر: {settings.updatedAt ?? "—"}</p>
    </main>
  );
}
