"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./DealerDirectoryClient.module.css";

type Dealer = {
  id?: number;
  dealer_id?: number;
  dealer_name?: string;
  dealer_phone?: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  is_active?: number | boolean;
};

type GeoResponse = {
  success?: boolean;
  data?: string[];
  has_neighborhoods?: boolean;
};

const GEO_API = "https://api.chakod.com/api/geo-locations.php";

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
  const url = search.size ? `${GEO_API}?${search.toString()}` : GEO_API;
  const response = await fetch(url, { cache: "no-store" });
  const payload = await readJson<GeoResponse>(response);
  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    hasNeighborhoods: Boolean(payload.has_neighborhoods),
  };
}

export default function DealerDirectoryClient() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [hasNeighborhoods, setHasNeighborhoods] = useState(false);

  const [form, setForm] = useState({
    dealer_name: "",
    dealer_phone: "",
    province: "",
    city: "",
    neighborhood: "",
    address: "",
  });

  async function loadDealers() {
    const response = await fetch("/api/auth/dealers", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await readJson<{ success?: boolean; data?: Dealer[]; message?: string }>(response);
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "نمایشگاه‌ها دریافت نشدند.");
    }
    setDealers(
      (Array.isArray(payload.data) ? payload.data : []).map((item) => ({
        ...item,
        id: Number(item.id ?? item.dealer_id ?? 0),
      })),
    );
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([
          loadDealers(),
          loadGeo().then((result) => setProvinces(result.items)),
        ]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "خطای ناشناخته");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (!form.province) {
        setCities([]);
        setNeighborhoods([]);
        setHasNeighborhoods(false);
        return;
      }
      setGeoLoading(true);
      try {
        const result = await loadGeo({ province: form.province });
        setCities(result.items);
      } catch {
        setCities([]);
      } finally {
        setGeoLoading(false);
      }
    })();
  }, [form.province]);

  useEffect(() => {
    void (async () => {
      if (!form.province || !form.city) {
        setNeighborhoods([]);
        setHasNeighborhoods(false);
        return;
      }
      setGeoLoading(true);
      try {
        const result = await loadGeo({ province: form.province, city: form.city });
        setNeighborhoods(result.items);
        setHasNeighborhoods(result.hasNeighborhoods && result.items.length > 0);
      } catch {
        setNeighborhoods([]);
        setHasNeighborhoods(false);
      } finally {
        setGeoLoading(false);
      }
    })();
  }, [form.province, form.city]);

  async function submit() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/dealers", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dealer_phone: normalizeDigits(form.dealer_phone),
          neighborhood: hasNeighborhoods ? form.neighborhood : "",
        }),
      });
      const payload = await readJson<{ success?: boolean; message?: string }>(response);
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "ثبت نمایشگاه انجام نشد.");
      }
      setNotice(payload.message || "نمایشگاه با موفقیت ثبت شد.");
      setForm({ dealer_name: "", dealer_phone: "", province: "", city: "", neighborhood: "", address: "" });
      setCities([]);
      setNeighborhoods([]);
      setHasNeighborhoods(false);
      await loadDealers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "خطای ناشناخته");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <span>نمایشگاه‌های متصل به حساب</span>
            <h1>مدیریت چند نمایشگاه</h1>
            <p>نمایشگاه جدید اضافه کنید و مدیریت اعضا، آگهی‌ها و عملکرد را از مرکز فرمان انجام دهید.</p>
          </div>
          <div className={styles.heroActions}>
            <Link href="/account/business">مرکز فرمان</Link>
            <Link href="/account/listings/new">ثبت آگهی</Link>
          </div>
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        <section className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.sectionHead}>
              <span>افزودن نمایشگاه</span>
              <h2>اطلاعات نمایشگاه جدید</h2>
            </div>

            <label className={styles.field}>
              <span>نام نمایشگاه</span>
              <input value={form.dealer_name} onChange={(event) => setForm((current) => ({ ...current, dealer_name: event.target.value }))} placeholder="مثلاً نمایشگاه اتومبیل برتر" />
            </label>

            <label className={styles.field}>
              <span>شماره تماس</span>
              <input value={form.dealer_phone} onChange={(event) => setForm((current) => ({ ...current, dealer_phone: normalizeDigits(event.target.value) }))} inputMode="tel" placeholder="09120000000" />
            </label>

            <div className={styles.twoCols}>
              <label className={styles.field}>
                <span>استان</span>
                <select value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value, city: "", neighborhood: "" }))}>
                  <option value="">انتخاب استان</option>
                  {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>شهر</span>
                <select value={form.city} disabled={!form.province || geoLoading} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value, neighborhood: "" }))}>
                  <option value="">انتخاب شهر</option>
                  {cities.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            {hasNeighborhoods && (
              <label className={styles.field}>
                <span>محله</span>
                <select value={form.neighborhood} disabled={geoLoading} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))}>
                  <option value="">انتخاب محله</option>
                  {neighborhoods.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            )}

            <label className={styles.field}>
              <span>آدرس</span>
              <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="آدرس کوتاه نمایشگاه" />
            </label>

            <button className={styles.primaryButton} type="button" disabled={saving || !form.dealer_name.trim() || !form.province || !form.city} onClick={() => void submit()}>
              {saving ? "در حال ثبت..." : "ثبت نمایشگاه"}
            </button>
          </article>

          <article className={styles.card}>
            <div className={styles.sectionHead}>
              <span>نمایشگاه‌های من</span>
              <h2>{loading ? "در حال دریافت..." : `${dealers.length.toLocaleString("fa-IR")} نمایشگاه`}</h2>
            </div>

            {!loading && dealers.length === 0 && <div className={styles.empty}>هنوز نمایشگاهی به این حساب متصل نشده است.</div>}

            <div className={styles.list}>
              {dealers.map((dealer) => (
                <div className={styles.item} key={dealer.id ?? dealer.dealer_id}>
                  <div>
                    <strong>{dealer.dealer_name || "نمایشگاه بدون نام"}</strong>
                    <span>{[dealer.province, dealer.city, dealer.neighborhood].filter(Boolean).join("، ") || "موقعیت ثبت نشده"}</span>
                    <small>{dealer.dealer_phone || "شماره تماس ثبت نشده"}</small>
                  </div>
                  <div className={styles.itemActions}>
                    <b data-active={dealer.is_active === false || dealer.is_active === 0 ? "false" : "true"}>{dealer.is_active === false || dealer.is_active === 0 ? "غیرفعال" : "فعال"}</b>
                    <Link href="/account/business">مدیریت در مرکز فرمان</Link>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
