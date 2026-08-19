"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type User = {
  account_type?: string;
  business_name?: string | null;
  business_city?: string | null;
  business_location_label?: string | null;
};

type Hour = { day: string; enabled: boolean; open: string; close: string };

type Profile = {
  business_type: string;
  name: string;
  phone: string;
  whatsapp_phone: string;
  email: string;
  website_url: string;
  instagram_url: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string;
  cover_url: string;
  description: string;
  business_hours: Hour[];
  services: string[];
  service_categories: string[];
  mobile_service: boolean;
  price_range_text: string;
  gallery: string[];
  public_slug?: string;
  moderation_status?: string;
  profile_complete?: boolean;
  completion_percent?: number;
  [key: string]: unknown;
};

type MeResponse = { success?: boolean; user?: User | null; message?: string };
type ProfileResponse = { success?: boolean; profile?: Profile; message?: string };
type GeoResponse = { success?: boolean; data?: string[]; message?: string };
type UploadResponse = { success?: boolean; url?: string; message?: string };

type SectionKey = "identity" | "contact" | "services" | "hours";

const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function typeTitle(type?: string) {
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "نمایشگاه خودرو";
}

function defaultHours(): Hour[] {
  return DAYS.map((day, index) => ({ day, enabled: index !== 6, open: "09:00", close: "18:00" }));
}

function emptyProfile(user: User): Profile {
  return {
    business_type: user.account_type || "dealer",
    name: user.business_name || "",
    phone: "",
    whatsapp_phone: "",
    email: "",
    website_url: "",
    instagram_url: "",
    province: "",
    city: user.business_city || "",
    neighborhood: "",
    address: "",
    latitude: null,
    longitude: null,
    logo_url: "",
    cover_url: "",
    description: "",
    business_hours: defaultHours(),
    services: [],
    service_categories: [],
    mobile_service: false,
    price_range_text: "",
    gallery: [],
  };
}

function normalizeHours(value: unknown): Hour[] {
  const list = Array.isArray(value) ? value : [];
  return DAYS.map((day, index) => {
    const row = list.find((item) => item && typeof item === "object" && String((item as Hour).day) === day) as Hour | undefined;
    return row
      ? { day, enabled: Boolean(row.enabled), open: row.open || "09:00", close: row.close || "18:00" }
      : { day, enabled: index !== 6, open: "09:00", close: "18:00" };
  });
}

function normalizeProfile(profile: Profile | undefined, user: User): Profile {
  const fallback = emptyProfile(user);
  if (!profile) return fallback;
  return {
    ...fallback,
    ...profile,
    business_type: user.account_type || profile.business_type || "dealer",
    name: String(profile.name || fallback.name),
    phone: String(profile.phone || ""),
    whatsapp_phone: String(profile.whatsapp_phone || ""),
    email: String(profile.email || ""),
    website_url: String(profile.website_url || ""),
    instagram_url: String(profile.instagram_url || ""),
    province: String(profile.province || ""),
    city: String(profile.city || fallback.city),
    neighborhood: String(profile.neighborhood || ""),
    address: String(profile.address || ""),
    logo_url: String(profile.logo_url || ""),
    cover_url: String(profile.cover_url || ""),
    description: String(profile.description || ""),
    services: Array.isArray(profile.services) ? profile.services.map(String).filter(Boolean).slice(0, 20) : [],
    service_categories: Array.isArray(profile.service_categories) ? profile.service_categories.map(String).filter(Boolean).slice(0, 20) : [],
    business_hours: normalizeHours(profile.business_hours),
    gallery: Array.isArray(profile.gallery) ? profile.gallery.map(String).filter(Boolean).slice(0, 8) : [],
  };
}

function completion(profile: Profile) {
  const checks = [
    profile.name.trim().length >= 2,
    profile.phone.replace(/\D/g, "").length >= 7,
    Boolean(profile.province && profile.city),
    profile.address.trim().length >= 5,
    profile.services.length > 0 || profile.service_categories.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

async function json<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function BusinessProfileV2Page() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [active, setActive] = useState<SectionKey>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [serviceInput, setServiceInput] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meResponse = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const me = await json<MeResponse>(meResponse);
        if (!meResponse.ok || !me?.success || !me.user) throw new Error(me?.message || "اطلاعات حساب دریافت نشد.");
        if (cancelled) return;
        setUser(me.user);

        if (!me.user.account_type || me.user.account_type === "personal") {
          setError("این بخش برای حساب‌های کسب‌وکاری است.");
          return;
        }

        const profileResponse = await fetch("/api/auth/professional-profile", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const result = await json<ProfileResponse>(profileResponse);
        if (!profileResponse.ok || !result?.success || !result.profile) throw new Error(result?.message || "پروفایل مجموعه دریافت نشد.");
        if (!cancelled) setProfile(normalizeProfile(result.profile, me.user));
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "دریافت اطلاعات انجام نشد.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    void fetch("/api/geo-locations", { cache: "default", credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const result = await json<GeoResponse>(response);
        if (!cancelled && response.ok && result?.success && Array.isArray(result.data)) setProvinces(result.data);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profile?.province) {
      setCities([]);
      return;
    }
    let cancelled = false;
    const query = new URLSearchParams({ province: profile.province });
    void fetch(`/api/geo-locations?${query}`, { cache: "default", credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const result = await json<GeoResponse>(response);
        if (!cancelled && response.ok && result?.success && Array.isArray(result.data)) setCities(result.data);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [profile?.province]);

  const percent = useMemo(() => (profile ? completion(profile) : 0), [profile]);

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
    setError("");
    setMessage("");
  }

  function addService() {
    const value = serviceInput.trim().replace(/\s+/g, " ");
    if (!profile || !value) return;
    if (profile.services.includes(value)) {
      setServiceInput("");
      return;
    }
    if (profile.services.length >= 20) {
      setError("حداکثر ۲۰ خدمت قابل ثبت است.");
      return;
    }
    setField("services", [...profile.services, value]);
    setServiceInput("");
  }

  async function upload(kind: "logo" | "cover", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      setError("فایل انتخاب‌شده تصویر نیست.");
      return;
    }

    setUploading(kind);
    setError("");
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/auth/professional-profile/upload", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: authHeaders(),
        body,
      });
      const result = await json<UploadResponse>(response);
      if (!response.ok || !result?.success || !result.url) throw new Error(result?.message || "بارگذاری تصویر انجام نشد.");
      setField(kind === "logo" ? "logo_url" : "cover_url", result.url);
      setMessage("تصویر آماده ذخیره است.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "بارگذاری تصویر انجام نشد.");
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError("دریافت موقعیت در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProfile((current) => current ? {
          ...current,
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        } : current);
        setMessage("موقعیت روی نقشه ثبت شد؛ تغییرات را ذخیره کنید.");
      },
      () => setError("موقعیت فعلی دریافت نشد."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;

    if (profile.name.trim().length < 2) {
      setActive("identity");
      setError("نام مجموعه را کامل وارد کنید.");
      return;
    }
    if (profile.phone.replace(/\D/g, "").length < 7) {
      setActive("contact");
      setError("شماره تماس عمومی معتبر وارد کنید.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/professional-profile", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ...profile,
          name: profile.name.trim().replace(/\s+/g, " "),
          phone: profile.phone.trim(),
          whatsapp_phone: profile.whatsapp_phone.trim(),
          email: profile.email.trim(),
          website_url: profile.website_url.trim(),
          instagram_url: profile.instagram_url.trim(),
          province: profile.province.trim(),
          city: profile.city.trim(),
          neighborhood: profile.neighborhood.trim(),
          address: profile.address.trim(),
          description: profile.description.trim(),
          services: profile.services.map((item) => item.trim()).filter(Boolean).slice(0, 20),
          business_hours: normalizeHours(profile.business_hours),
        }),
      });
      const result = await json<ProfileResponse>(response);
      if (!response.ok || !result?.success || !result.profile) throw new Error(result?.message || "ذخیره پروفایل انجام نشد.");
      setProfile(normalizeProfile(result.profile, user || {}));
      setMessage(result.message || "اطلاعات مجموعه ذخیره شد.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ذخیره پروفایل انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account-v2">بازگشت</Link>
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </header>

        <section className={styles.hero}>
          <div>
            <span>{typeTitle(user?.account_type)}</span>
            <h1>پروفایل مجموعه</h1>
            <p>هر بار فقط یک بخش را ویرایش کنید؛ اطلاعات طولانی دیگر یکجا نمایش داده نمی‌شود.</p>
          </div>
          <div className={styles.progress}><strong>{percent.toLocaleString("fa-IR")}٪</strong><small>تکمیل</small></div>
        </section>

        {loading ? <div className={styles.state}>در حال دریافت پروفایل…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}

        {!loading && profile ? (
          <form onSubmit={save}>
            <nav className={styles.tabs} aria-label="بخش‌های پروفایل">
              <button type="button" className={active === "identity" ? styles.activeTab : ""} onClick={() => setActive("identity")}>معرفی</button>
              <button type="button" className={active === "contact" ? styles.activeTab : ""} onClick={() => setActive("contact")}>تماس و آدرس</button>
              <button type="button" className={active === "services" ? styles.activeTab : ""} onClick={() => setActive("services")}>خدمات</button>
              <button type="button" className={active === "hours" ? styles.activeTab : ""} onClick={() => setActive("hours")}>ساعات کاری</button>
            </nav>

            {active === "identity" ? (
              <section className={styles.card}>
                <header><h2>معرفی مجموعه</h2><p>نام، تصاویر و توضیح کوتاه عمومی</p></header>
                <div className={styles.mediaRow}>
                  <label className={styles.logoUpload}>
                    {profile.logo_url ? <img src={profile.logo_url} alt="لوگوی مجموعه" /> : <span>لوگو</span>}
                    <small>{uploading === "logo" ? "در حال بارگذاری…" : "تغییر لوگو"}</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload("logo", event)} />
                  </label>
                  <label className={styles.coverUpload}>
                    {profile.cover_url ? <img src={profile.cover_url} alt="کاور مجموعه" /> : <span>تصویر کاور</span>}
                    <small>{uploading === "cover" ? "در حال بارگذاری…" : "تغییر کاور"}</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload("cover", event)} />
                  </label>
                </div>
                <label className={styles.field}><span>نام عمومی مجموعه</span><input value={profile.name} onChange={(event) => setField("name", event.target.value)} maxLength={180} /></label>
                <label className={styles.field}><span>معرفی کوتاه</span><textarea value={profile.description} onChange={(event) => setField("description", event.target.value)} rows={4} maxLength={3000} placeholder="تخصص و مزیت اصلی مجموعه را کوتاه بنویسید." /></label>
              </section>
            ) : null}

            {active === "contact" ? (
              <section className={styles.card}>
                <header><h2>تماس و آدرس</h2><p>اطلاعاتی که مشتری برای ارتباط نیاز دارد</p></header>
                <div className={styles.twoColumns}>
                  <label className={styles.field}><span>شماره تماس عمومی</span><input value={profile.phone} onChange={(event) => setField("phone", event.target.value)} inputMode="tel" /></label>
                  <label className={styles.field}><span>واتساپ</span><input value={profile.whatsapp_phone} onChange={(event) => setField("whatsapp_phone", event.target.value)} inputMode="tel" /></label>
                </div>
                <div className={styles.twoColumns}>
                  <label className={styles.field}><span>استان</span><select value={profile.province} onChange={(event) => { setField("province", event.target.value); setField("city", ""); }}><option value="">انتخاب استان</option>{profile.province && !provinces.includes(profile.province) ? <option value={profile.province}>{profile.province}</option> : null}{provinces.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className={styles.field}><span>شهر</span><select value={profile.city} disabled={!profile.province} onChange={(event) => setField("city", event.target.value)}><option value="">انتخاب شهر</option>{profile.city && !cities.includes(profile.city) ? <option value={profile.city}>{profile.city}</option> : null}{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                </div>
                <label className={styles.field}><span>آدرس</span><textarea value={profile.address} onChange={(event) => setField("address", event.target.value)} rows={3} maxLength={500} /></label>
                <button className={styles.locationButton} type="button" onClick={useLocation}>{profile.latitude !== null && profile.longitude !== null ? "موقعیت نقشه ثبت شده ✓" : "ثبت موقعیت فعلی روی نقشه"}</button>
                <details className={styles.optional}><summary>راه‌های ارتباطی بیشتر</summary><div className={styles.optionalBody}><label className={styles.field}><span>ایمیل</span><input type="email" value={profile.email} onChange={(event) => setField("email", event.target.value)} /></label><label className={styles.field}><span>وب‌سایت</span><input dir="ltr" value={profile.website_url} onChange={(event) => setField("website_url", event.target.value)} /></label><label className={styles.field}><span>اینستاگرام</span><input dir="ltr" value={profile.instagram_url} onChange={(event) => setField("instagram_url", event.target.value)} /></label></div></details>
              </section>
            ) : null}

            {active === "services" ? (
              <section className={styles.card}>
                <header><h2>خدمات اصلی</h2><p>فقط خدماتی را بنویسید که مشتری واقعاً باید ببیند</p></header>
                <div className={styles.addService}><input value={serviceInput} onChange={(event) => setServiceInput(event.target.value)} placeholder="مثلاً فروش خودرو" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addService(); } }} /><button type="button" onClick={addService}>افزودن</button></div>
                <div className={styles.chips}>{profile.services.length ? profile.services.map((service) => <button type="button" key={service} onClick={() => setField("services", profile.services.filter((item) => item !== service))}>{service}<span>×</span></button>) : <p>هنوز خدمتی ثبت نشده است.</p>}</div>
                <label className={styles.field}><span>بازه تقریبی قیمت یا توضیح کوتاه</span><input value={profile.price_range_text} onChange={(event) => setField("price_range_text", event.target.value)} maxLength={180} /></label>
                <label className={styles.checkbox}><input type="checkbox" checked={profile.mobile_service} onChange={(event) => setField("mobile_service", event.target.checked)} /><span>خدمات در محل ارائه می‌شود</span></label>
              </section>
            ) : null}

            {active === "hours" ? (
              <section className={styles.card}>
                <header><h2>ساعات کاری</h2><p>روزهای تعطیل را خاموش کنید</p></header>
                <div className={styles.hours}>{profile.business_hours.map((row, index) => <div className={styles.hourRow} key={row.day}><label className={styles.dayToggle}><input type="checkbox" checked={row.enabled} onChange={(event) => setField("business_hours", profile.business_hours.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item))} /><strong>{row.day}</strong></label>{row.enabled ? <div><input type="time" value={row.open} onChange={(event) => setField("business_hours", profile.business_hours.map((item, itemIndex) => itemIndex === index ? { ...item, open: event.target.value } : item))} /><span>تا</span><input type="time" value={row.close} onChange={(event) => setField("business_hours", profile.business_hours.map((item, itemIndex) => itemIndex === index ? { ...item, close: event.target.value } : item))} /></div> : <small>تعطیل</small>}</div>)}</div>
              </section>
            ) : null}

            <div className={styles.saveBar}><button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button></div>
          </form>
        ) : null}

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
