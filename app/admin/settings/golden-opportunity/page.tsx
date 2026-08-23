"use client";

import { useState } from "react";
import { defaultGoldenOpportunitySettings } from "./types";

export default function GoldenOpportunitySettingsPage() {
  const [settings, setSettings] = useState(defaultGoldenOpportunitySettings);
  const [saved, setSaved] = useState(false);

  function update(key: keyof typeof settings, value: string | boolean) {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === "number" ? Number(value) : value,
    }));
    setSaved(false);
  }

  function save() {
    setSaved(true);
  }

  return (
    <main dir="rtl" style={{ padding: 24, fontFamily: "Tahoma" }}>
      <h1>تنظیمات فرصت طلایی</h1>
      <p>مدیریت قیمت، ظرفیت، قوانین AI و بازگشت وجه.</p>

      <section>
        <label>هزینه بررسی فرصت طلایی</label>
        <input value={settings.reviewPrice} onChange={(e) => update("reviewPrice", e.target.value)} />
      </section>

      <section>
        <label>ظرفیت هر استان</label>
        <input value={settings.provinceCapacity} onChange={(e) => update("provinceCapacity", e.target.value)} />
      </section>

      <section>
        <label>حداقل امتیاز AI</label>
        <input value={settings.minimumAiScore} onChange={(e) => update("minimumAiScore", e.target.value)} />
      </section>

      <section>
        <label>مدت نمایش (ساعت)</label>
        <input value={settings.displayHours} onChange={(e) => update("displayHours", e.target.value)} />
      </section>

      <button onClick={save}>ذخیره تنظیمات</button>
      {saved && <p>تنظیمات آماده ارسال به سامانه مرکزی است.</p>}
    </main>
  );
}
