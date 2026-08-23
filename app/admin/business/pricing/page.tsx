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
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/pricing-settings.php`,
          {
            headers: {
              Accept: "application/json",
            },
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

    void loadSettings();
  }, []);

  return (
    <main dir="rtl" style={{ padding: 24 }}>
      <h1>مدیریت قیمت‌گذاری مرکزی</h1>

      <p>
        این بخش به‌عنوان مرکز کنترل قیمت‌ها، تخفیف‌ها و پورسانت‌ها طراحی شده
        است تا تمام خدمات تجاری سایت از یک منبع استفاده کنند.
      </p>

      {loading ? (
        <p>در حال دریافت تنظیمات...</p>
      ) : (
        <section>
          <h2>تنظیمات فعلی</h2>
          <ul>
            <li>قیمت ثبت آگهی: {settings?.adPrice ?? "—"}</li>
            <li>قیمت خدمات ویژه: {settings?.featuredPrice ?? "—"}</li>
            <li>تخفیف خریدار: {settings?.buyerDiscountPercent ?? "—"}%</li>
            <li>پورسانت معرف: {settings?.referralCommissionPercent ?? "—"}%</li>
            <li>آخرین تغییر: {settings?.updatedAt ?? "—"}</li>
          </ul>
        </section>
      )}
    </main>
  );
}
