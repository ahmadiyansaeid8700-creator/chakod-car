"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type ActivityType = "dealer" | "parts_store" | "repair_shop" | "car_service";
type ActivitiesResponse = {
  success?: boolean;
  message?: string;
  available_types?: ActivityType[];
};
type GeoResponse = { success?: boolean; data?: string[]; has_neighborhoods?: boolean };

const TYPES: Array<{ type: ActivityType; title: string; description: string }> = [
  { type: "dealer", title: "نمایشگاه خودرو", description: "فروش و مدیریت خودروهای مجموعه" },
  { type: "parts_store", title: "فروشگاه قطعات", description: "فروش قطعات و لوازم خودرو" },
  { type: "repair_shop", title: "تعمیرگاه خودرو", description: "خدمات تعمیر و نگهداری" },
  { type: "car_service", title: "مرکز خدمات خودرو", description: "کارواش، دیتیلینگ و سایر خدمات" },
];

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("پاسخ سرور معتبر نیست.");
  }
}

async function loadGeo(params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();
  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);
  const response = await fetch(`/api/geo-locations${search.size ? `?${search.toString()}` : ""}`, { cache: "no-store" });
  const payload = await readJson<GeoResponse>(response);
  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    hasNeighborhoods: Boolean(payload.has_neighborhoods),
  };
}

export default function NewBusinessPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<ActivityType[]>([]);
  const [type, setType] = useState<ActivityType | "">("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [hasNeighborhoods, setHasNeighborhoods] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [activitiesResponse, geo] = await Promise.all([
          fetch("/api/auth/account-activities", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }),
          loadGeo(),
        ]);
        const activities = await readJson<ActivitiesResponse>(activitiesResponse);
        if (!activitiesResponse.ok || !activities.success) throw new Error(activities.message || "کسب‌وکارهای حساب دریافت نشد.");
        const available = Array.isArray(activities.available_types) ? activities.available_types : [];
        setAvailableTypes(available);
        setType(available[0] || "");
        setProvinces(geo.items);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "اطلاعات صفحه دریافت نشد.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setCity("");
      setNeighborhood("");
      setNeighborhoods([]);
      setHasNeighborhoods(false);
      if (!province) {
        setCities([]);
        return;
      }
      setGeoLoading(true);
      try {
        const result = await loadGeo({ province });
        setCities(result.items);
      } catch {
        setCities([]);
      } finally {
        setGeoLoading(false);
      }
    })();
  }, [province]);

  useEffect(() => {
    void (async () => {
      setNeighborhood("");
      setNeighborhoods([]);
      setHasNeighborhoods(false);
      if (!province || !city) return;
      setGeoLoading(true);
      try {
        const result = await loadGeo({ province, city });
        setNeighborhoods(result.items);
        setHasNeighborhoods(result.hasNeighborhoods && result.items.length > 0);
      } catch {
        setNeighborhoods([]);
      } finally {
        setGeoLoading(false);
      }
    })();
  }, [province, city]);

  const canSubmit = useMemo(
    () => Boolean(type && name.trim().length >= 2 && province && city && !saving),
    [city, name, province, saving, type],
  );

  async function submit() {
    if (!canSubmit || !type) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/account-activities", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          phone: normalizeDigits(phone),
          province,
          city,
          neighborhood: hasNeighborhoods ? neighborhood : "",
          address: address.trim(),
        }),
      });
      const payload = await readJson<{ success?: boolean; message?: string }>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "ثبت کسب‌وکار انجام نشد.");
      setNotice(payload.message || "کسب‌وکار اضافه شد.");
      window.setTimeout(() => window.location.assign("/account"), 700);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ثبت کسب‌وکار انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/account">بازگشت به حساب</Link>
          <Link href="/" className={styles.logo}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
        </header>

        <section className={styles.hero}>
          <span>مدیریت کسب‌وکار</span>
          <h1>افزودن کسب‌وکار جدید</h1>
          <p>از هر نوع فقط یک مجموعه می‌توانید مالک باشید. عضویت شما در مجموعه‌های دیگر جدا حساب می‌شود.</p>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        {loading ? (
          <section className={styles.state}>در حال آماده‌سازی…</section>
        ) : availableTypes.length === 0 ? (
          <section className={styles.state}><strong>همه نوع‌های کسب‌وکار برای این حساب ثبت شده‌اند.</strong><Link href="/account">بازگشت به حساب</Link></section>
        ) : (
          <section className={styles.card}>
            <div className={styles.types}>
              {TYPES.map((item) => {
                const available = availableTypes.includes(item.type);
                return (
                  <button
                    key={item.type}
                    type="button"
                    disabled={!available || saving}
                    data-active={type === item.type ? "true" : "false"}
                    onClick={() => available && setType(item.type)}
                  >
                    <strong>{item.title}</strong>
                    <span>{available ? item.description : "قبلاً برای حساب ثبت شده"}</span>
                  </button>
                );
              })}
            </div>

            <label className={styles.field}>
              <span>نام مجموعه</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="نامی که کاربران می‌بینند" maxLength={160} />
            </label>

            <label className={styles.field}>
              <span>شماره تماس مجموعه</span>
              <input value={phone} onChange={(event) => setPhone(normalizeDigits(event.target.value))} inputMode="tel" placeholder="در صورت خالی بودن، شماره حساب استفاده می‌شود" />
            </label>

            <div className={styles.twoCols}>
              <label className={styles.field}>
                <span>استان</span>
                <select value={province} onChange={(event) => setProvince(event.target.value)}>
                  <option value="">انتخاب استان</option>
                  {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>شهر</span>
                <select value={city} disabled={!province || geoLoading} onChange={(event) => setCity(event.target.value)}>
                  <option value="">انتخاب شهر</option>
                  {cities.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            {hasNeighborhoods ? (
              <label className={styles.field}>
                <span>محله</span>
                <select value={neighborhood} disabled={geoLoading} onChange={(event) => setNeighborhood(event.target.value)}>
                  <option value="">انتخاب محله</option>
                  {neighborhoods.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            ) : null}

            <label className={styles.field}>
              <span>آدرس کوتاه</span>
              <textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="اختیاری" maxLength={500} />
            </label>

            <button className={styles.submit} type="button" disabled={!canSubmit} onClick={() => void submit()}>
              {saving ? "در حال ثبت…" : "افزودن کسب‌وکار"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
