"use client";

import { useState } from "react";
import { defaultGoldenOpportunitySettings } from "./types";
import { saveGoldenOpportunitySettings } from "./api";
import { canManageGoldenOpportunity } from "./permission";

export default function GoldenOpportunitySettingsPage() {
  const [settings, setSettings] = useState(defaultGoldenOpportunitySettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Permission must be supplied by the central admin session/API.
  // Default is denied until real permission data is available.
  const adminContext = {
    role: "",
    permissions: [] as string[],
  };

  if (!canManageGoldenOpportunity(adminContext)) {
    return (
      <main dir="rtl" style={{ padding: 24 }}>
        دسترسی مدیریت قیمت‌ها برای این بخش فعال نیست.
      </main>
    );
  }

  function update(key: keyof typeof settings, value: string | boolean) {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === "number" ? Number(value) : value,
    }));
    setSaved(false);
  }

  async function save() {
    const token = localStorage.getItem("chakod_session_token") || "";
    setLoading(true);
    try {
      await saveGoldenOpportunitySettings(token, settings);
      setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" style={{ padding: 24, fontFamily: "Tahoma" }}>
      <h1>تنظیمات فرصت طلایی</h1>
      <p>مدیریت قیمت، ظرفیت، قوانین AI و بازگشت وجه.</p>

      <label>هزینه بررسی فرصت طلایی</label>
      <input value={settings.reviewPrice} onChange={(e) => update("reviewPrice", e.target.value)} />

      <label>ظرفیت هر استان</label>
      <input value={settings.provinceCapacity} onChange={(e) => update("provinceCapacity", e.target.value)} />

      <label>حداقل امتیاز AI</label>
      <input value={settings.minimumAiScore} onChange={(e) => update("minimumAiScore", e.target.value)} />

      <label>مدت نمایش</label>
      <input value={settings.displayHours} onChange={(e) => update("displayHours", e.target.value)} />

      <button disabled={loading} onClick={save}>
        {loading ? "در حال ذخیره" : "ذخیره تنظیمات"}
      </button>
      {saved && <p>تنظیمات ذخیره شد.</p>}
    </main>
  );
}
