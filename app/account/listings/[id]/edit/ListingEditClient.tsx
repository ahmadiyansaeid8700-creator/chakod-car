"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MobileBottomNav from "../../../../components/MobileBottomNav";
import styles from "./page.module.css";

type ListingData = {
  id: number;
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  brand_name?: string | null;
  model?: string | null;
  model_name?: string | null;
  production_year?: number | string | null;
  year?: number | string | null;
  mileage_km?: number | string | null;
  price_toman?: number | string | null;
  province?: string | null;
  province_name?: string | null;
  city?: string | null;
  city_name?: string | null;
  neighborhood?: string | null;
  color?: string | null;
  body_status?: string | null;
  body_condition?: string | null;
  transmission?: string | null;
  gearbox?: string | null;
  fuel_type?: string | null;
  category_code?: string | null;
  status?: { code?: string; title?: string } | string | null;
};

type EditResponse = {
  success?: boolean;
  message?: string;
  listing?: ListingData;
};

type GeoResponse = {
  success?: boolean;
  data?: string[];
  has_neighborhoods?: boolean;
};

const API_BASE = "https://api.chakod.com";

const colors = [
  "سفید", "مشکی", "نقره‌ای", "نوک‌مدادی", "خاکستری", "آبی", "سرمه‌ای",
  "قرمز", "زرشکی", "قهوه‌ای", "بژ", "طلایی", "سبز", "زرد", "نارنجی",
  "کرم", "سفید صدفی", "مشکی متالیک", "سایر",
];
const bodyStatuses = ["سالم", "یک لکه رنگ", "چند لکه رنگ", "دور رنگ", "تعویضی", "تصادفی", "نیازمند توضیح"];
const transmissions = ["اتوماتیک", "دنده‌ای", "CVT", "دوکلاچه", "سایر"];
const fuelTypes = ["بنزین", "گازوئیل", "دوگانه‌سوز", "هیبرید", "برقی", "سایر"];
const years = [
  ...Array.from({ length: 87 }, (_, index) => String(1405 - index)),
  ...Array.from({ length: 77 }, (_, index) => String(2026 - index)),
];

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function cleanNumber(value: string) {
  return toEnglishDigits(value).replace(/[^0-9]/g, "");
}

function formatNumber(value: string) {
  const clean = cleanNumber(value);
  return clean ? clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
}

function uniqueOptions(values: string[], current: string) {
  return Array.from(new Set([current, ...values].filter(Boolean)));
}

export default function ListingEditClient({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [listing, setListing] = useState<ListingData | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productionYear, setProductionYear] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [priceToman, setPriceToman] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [color, setColor] = useState("");
  const [bodyStatus, setBodyStatus] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");

  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [hasNeighborhoods, setHasNeighborhoods] = useState(false);

  async function loadListing() {
    if (!/^\d+$/.test(listingId)) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/listings/edit/${listingId}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<EditResponse>(response);

      if (response.status === 401 || response.status === 403) {
        window.location.assign(
          `/login?returnTo=${encodeURIComponent(`/account/listings/${listingId}/edit`)}`,
        );
        return;
      }

      if (!response.ok || !payload?.success || !payload.listing) {
        setError(payload?.message || "اطلاعات آگهی دریافت نشد.");
        return;
      }

      const item = payload.listing;
      setListing(item);
      setTitle(String(item.title || ""));
      setDescription(String(item.description || ""));
      setProductionYear(String(item.production_year || item.year || ""));
      setMileageKm(String(item.mileage_km || ""));
      setPriceToman(String(item.price_toman || ""));
      setProvince(String(item.province || item.province_name || ""));
      setCity(String(item.city || item.city_name || ""));
      setNeighborhood(String(item.neighborhood || ""));
      setColor(String(item.color || ""));
      setBodyStatus(String(item.body_status || item.body_condition || "سالم"));
      setTransmission(String(item.transmission || item.gearbox || "اتوماتیک"));
      setFuelType(String(item.fuel_type || "بنزین"));
    } catch {
      setError("ارتباط با سرویس ویرایش آگهی برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGeo(params?: { province?: string; city?: string }) {
    const search = new URLSearchParams();
    if (params?.province) search.set("province", params.province);
    if (params?.city) search.set("city", params.city);

    const response = await fetch(
      `${API_BASE}/api/geo-locations.php${search.size ? `?${search.toString()}` : ""}`,
      { cache: "no-store" },
    );
    const payload = await readJson<GeoResponse>(response);
    if (!response.ok || !payload?.success) return { data: [] as string[], hasNeighborhoods: false };
    return {
      data: Array.isArray(payload.data) ? payload.data : [],
      hasNeighborhoods: Boolean(payload.has_neighborhoods),
    };
  }

  useEffect(() => {
    void loadListing();
    void fetchGeo().then((result) => setProvinces(result.data)).catch(() => setProvinces([]));
  }, [listingId]);

  useEffect(() => {
    if (!province) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);
    void fetchGeo({ province })
      .then((result) => {
        if (!cancelled) setCities(result.data);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });

    return () => { cancelled = true; };
  }, [province]);

  useEffect(() => {
    if (!province || !city) {
      setNeighborhoods([]);
      setHasNeighborhoods(false);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);
    void fetchGeo({ province, city })
      .then((result) => {
        if (!cancelled) {
          setNeighborhoods(result.data);
          setHasNeighborhoods(result.hasNeighborhoods && result.data.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeighborhoods([]);
          setHasNeighborhoods(false);
        }
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });

    return () => { cancelled = true; };
  }, [province, city]);

  async function saveListing() {
    setError("");
    setNotice("");

    if (title.trim().length < 5) {
      setError("عنوان آگهی باید حداقل ۵ نویسه باشد.");
      return;
    }
    if (!productionYear || !province || !city) {
      setError("سال تولید، استان و شهر را کامل کنید.");
      return;
    }
    if (hasNeighborhoods && !neighborhood) {
      setError("محله را انتخاب کنید.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/auth/listings/edit/${listingId}`, {
        method: "PATCH",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          production_year: productionYear,
          mileage_km: Number(cleanNumber(mileageKm) || 0),
          price_toman: Number(cleanNumber(priceToman) || 0),
          province,
          city,
          neighborhood: hasNeighborhoods ? neighborhood : "",
          color,
          body_status: bodyStatus,
          transmission,
          fuel_type: fuelType,
        }),
      });
      const payload = await readJson<EditResponse>(response);

      if (!response.ok || !payload?.success) {
        setError(payload?.message || "ذخیره تغییرات انجام نشد.");
        return;
      }

      setNotice(payload.message || "تغییرات آگهی با موفقیت ذخیره شد.");
      await loadListing();
    } catch {
      setError("ارتباط با سرویس ذخیره ویرایش برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  const brand = listing?.brand_name || listing?.brand || "ثبت نشده";
  const model = listing?.model_name || listing?.model || "ثبت نشده";
  const statusTitle = typeof listing?.status === "object"
    ? listing.status?.title || listing.status?.code
    : listing?.status || "نامشخص";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href={`/account/listings/${listingId}`}>← مدیریت آگهی</Link>
          <Link className={styles.brand} href="/">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده‌سازی ویرایش آگهی</h1>
          </section>
        )}

        {!loading && error && !listing && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>آگهی قابل ویرایش نیست</h1>
            <p>{error}</p>
            <button type="button" onClick={() => void loadListing()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && listing && (
          <>
            <section className={styles.hero}>
              <div>
                <span>ویرایش آگهی شماره {new Intl.NumberFormat("fa-IR").format(listing.id)}</span>
                <h1>{title || "آگهی بدون عنوان"}</h1>
                <p>{brand}، {model} · وضعیت: {statusTitle}</p>
              </div>
              <div className={styles.heroActions}>
                <Link href={`/account/listings/${listingId}/images`}>مدیریت تصاویر</Link>
                <Link href={`/cars/${listingId}`}>نمایش عمومی</Link>
              </div>
            </section>

            {error && <div className={styles.error}>{error}</div>}
            {notice && <div className={styles.notice}>{notice}</div>}

            <section className={styles.formLayout}>
              <div className={styles.formMain}>
                <section className={styles.formCard}>
                  <header><span>اطلاعات اصلی</span><h2>عنوان، سال و مبلغ</h2></header>
                  <label className={styles.fullField}>
                    <span>عنوان آگهی</span>
                    <input value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} />
                  </label>
                  <div className={styles.fieldGrid}>
                    <label>
                      <span>سال تولید</span>
                      <select value={productionYear} onChange={(event) => setProductionYear(event.target.value)}>
                        <option value="">انتخاب سال</option>
                        {uniqueOptions(years, productionYear).map((year) => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>کارکرد</span>
                      <div className={styles.numberField}>
                        <input inputMode="numeric" value={formatNumber(mileageKm)} onChange={(event) => setMileageKm(cleanNumber(event.target.value))} />
                        <b>کیلومتر</b>
                      </div>
                    </label>
                    <label>
                      <span>قیمت</span>
                      <div className={styles.numberField}>
                        <input inputMode="numeric" value={formatNumber(priceToman)} onChange={(event) => setPriceToman(cleanNumber(event.target.value))} />
                        <b>تومان</b>
                      </div>
                    </label>
                  </div>
                </section>

                <section className={styles.formCard}>
                  <header><span>وضعیت خودرو</span><h2>مشخصات قابل نمایش</h2></header>
                  <div className={styles.fieldGrid}>
                    <label><span>رنگ</span><select value={color} onChange={(event) => setColor(event.target.value)}><option value="">انتخاب رنگ</option>{uniqueOptions(colors, color).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label><span>وضعیت بدنه</span><select value={bodyStatus} onChange={(event) => setBodyStatus(event.target.value)}>{uniqueOptions(bodyStatuses, bodyStatus).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label><span>گیربکس</span><select value={transmission} onChange={(event) => setTransmission(event.target.value)}>{uniqueOptions(transmissions, transmission).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label><span>نوع سوخت</span><select value={fuelType} onChange={(event) => setFuelType(event.target.value)}>{uniqueOptions(fuelTypes, fuelType).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  </div>
                </section>

                <section className={styles.formCard}>
                  <header><span>موقعیت</span><h2>استان، شهر و محله</h2></header>
                  <div className={styles.fieldGrid}>
                    <label><span>استان</span><select value={province} disabled={geoLoading} onChange={(event) => { setProvince(event.target.value); setCity(""); setNeighborhood(""); }}><option value="">انتخاب استان</option>{uniqueOptions(provinces, province).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label><span>شهر</span><select value={city} disabled={!province || geoLoading} onChange={(event) => { setCity(event.target.value); setNeighborhood(""); }}><option value="">انتخاب شهر</option>{uniqueOptions(cities, city).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    {hasNeighborhoods && <label><span>محله</span><select value={neighborhood} disabled={geoLoading} onChange={(event) => setNeighborhood(event.target.value)}><option value="">انتخاب محله</option>{uniqueOptions(neighborhoods, neighborhood).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
                  </div>
                </section>

                <section className={styles.formCard}>
                  <header><span>توضیحات</span><h2>اطلاعات تکمیلی فروشنده</h2></header>
                  <label className={styles.fullField}>
                    <span>توضیحات آگهی</span>
                    <textarea value={description} maxLength={4000} onChange={(event) => setDescription(event.target.value)} placeholder="وضعیت فنی، سرویس‌ها، بیمه و شرایط فروش را شفاف بنویسید." />
                    <small>{new Intl.NumberFormat("fa-IR").format(description.length)} از ۴۰۰۰ نویسه</small>
                  </label>
                </section>
              </div>

              <aside className={styles.summaryCard}>
                <span>خلاصه تغییرات</span>
                <h2>{brand} {model}</h2>
                <dl>
                  <div><dt>سال</dt><dd>{productionYear || "—"}</dd></div>
                  <div><dt>کارکرد</dt><dd>{formatNumber(mileageKm) || "۰"} کیلومتر</dd></div>
                  <div><dt>قیمت</dt><dd>{formatNumber(priceToman) || "توافقی"}</dd></div>
                  <div><dt>موقعیت</dt><dd>{[province, city, neighborhood].filter(Boolean).join("، ") || "—"}</dd></div>
                </dl>
                <button type="button" disabled={saving} onClick={() => void saveListing()}>
                  {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
                <Link href={`/account/listings/${listingId}`}>انصراف و بازگشت</Link>
              </aside>
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
