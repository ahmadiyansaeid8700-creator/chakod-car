"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type BusinessType = "dealer" | "repair_shop" | "car_service" | "parts_store";

type BusinessesPageProps = {
  initialType?: "" | BusinessType;
  basePath?: string;
  lockType?: boolean;
  kicker?: string;
  title?: string;
  description?: string;
};

type PublicBusiness = {
  id: number;
  slug: string;
  business_type: BusinessType;
  business_type_title: string;
  name: string;
  province: string;
  city: string;
  neighborhood: string;
  logo_url: string;
  cover_url: string;
  description: string;
  category_labels: string[];
  services: string[];
  mobile_service: boolean;
  price_range_text: string;
  is_verified: boolean;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  items?: PublicBusiness[];
  total?: number;
};

const types: Array<{ key: "" | BusinessType; label: string }> = [
  { key: "", label: "همه کسب‌وکارها" },
  { key: "dealer", label: "نمایشگاه خودرو" },
  { key: "repair_shop", label: "تعمیرگاه خودرو" },
  { key: "car_service", label: "مرکز خدمات خودرو" },
  { key: "parts_store", label: "فروشگاه قطعات و لوازم خودرو" },
];

const serviceCategories: Array<{ key: string; label: string; type: "" | BusinessType }> = [
  { key: "", label: "همه خدمات", type: "" },
  { key: "car_wash", label: "کارواش", type: "car_service" },
  { key: "detailing", label: "دیتیلینگ", type: "car_service" },
  { key: "ceramic_coating", label: "سرامیک بدنه", type: "car_service" },
  { key: "window_tint", label: "شیشه دودی", type: "car_service" },
  { key: "ppf", label: "محافظ رنگ PPF", type: "car_service" },
  { key: "vehicle_wrap", label: "کاور بدنه", type: "car_service" },
  { key: "audio_alarm", label: "سیستم صوتی و دزدگیر", type: "car_service" },
  { key: "mechanical", label: "مکانیکی", type: "repair_shop" },
  { key: "auto_electrical", label: "برق خودرو", type: "repair_shop" },
  { key: "oil_change", label: "تعویض روغن", type: "repair_shop" },
  { key: "spare_parts", label: "قطعات یدکی", type: "parts_store" },
];

function initialParam(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

export default function BusinessesPage({
  initialType = "",
  basePath = "/businesses",
  lockType = false,
  kicker = "راهنمای خدمات خودرویی چاکود",
  title = "کسب‌وکارهای خودرو را نزدیک خودتان پیدا کنید",
  description = "نمایشگاه، تعمیرگاه، کارواش، دیتیلینگ، شیشه دودی، فروشگاه قطعات و سایر خدمات خودرو.",
}: BusinessesPageProps = {}) {
  const [type, setType] = useState<"" | BusinessType>(() => {
    const requestedType = initialParam("type") as "" | BusinessType;
    return lockType ? initialType : requestedType || initialType;
  });
  const [category, setCategory] = useState(() => initialParam("category"));
  const [query, setQuery] = useState(() => initialParam("q"));
  const [city, setCity] = useState(() => initialParam("city"));
  const [items, setItems] = useState<PublicBusiness[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const search = useMemo(() => {
    const params = new URLSearchParams({ limit: "24" });
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (query.trim()) params.set("q", query.trim());
    if (city.trim()) params.set("city", city.trim());
    return params;
  }, [type, category, query, city]);

  useEffect(() => {
    const controller = new AbortController();
    const queryString = search.toString();
    const url = `/api/businesses?${queryString}`;
    window.history.replaceState({}, "", `${basePath}?${queryString}`);
    setLoading(true);
    setError("");

    fetch(url, { cache: "no-store", headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as ApiResponse;
        if (!response.ok || !result.success) throw new Error(result.message || "دریافت فهرست انجام نشد.");
        setItems(Array.isArray(result.items) ? result.items : []);
        setTotal(Number(result.total || 0));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(reason instanceof Error ? reason.message : "دریافت فهرست انجام نشد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [basePath, search]);

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.header}>
        <a href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></a>
        <nav><button type="button" onClick={() => window.history.back()}>بازگشت</button><a href="/">صفحه اصلی</a><a href="/account/business/new">ثبت کسب‌وکار</a><a href="/account">حساب من</a></nav>
      </header>

      <section className={styles.hero}>
        <span>{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className={styles.filters} aria-label="فیلتر کسب‌وکارها">
        {!lockType ? (
          <div className={styles.typeTabs}>
            {types.map((item) => (
              <button key={item.key || "all"} type="button" className={type === item.key ? styles.activeTab : ""} onClick={() => { setType(item.key); if (item.key !== "car_service") setCategory(""); }}>
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className={styles.filterGrid}>
          <label><span>جست‌وجو</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام کسب‌وکار یا نوع خدمت" /></label>
          <label><span>شهر</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً رشت یا تهران" /></label>
          {!lockType ? (
            <label><span>خدمت</span><select value={category} onChange={(event) => {
              const nextCategory = event.target.value;
              const selected = serviceCategories.find((item) => item.key === nextCategory);
              setCategory(nextCategory);
              if (selected?.type) setType(selected.type);
            }}>{serviceCategories.map((item) => <option value={item.key} key={item.key || "all"}>{item.label}</option>)}</select></label>
          ) : null}
          <button type="button" onClick={() => { setQuery(""); setCity(""); setCategory(""); setType(lockType ? initialType : ""); }}>پاک‌کردن فیلترها</button>
        </div>
      </section>

      <section className={styles.results}>
        <div className={styles.resultHeader}><div><span>نتایج جست‌وجو</span><h2>{total.toLocaleString("fa-IR")} کسب‌وکار</h2></div><a href="/account/business/new">ثبت کسب‌وکار جدید</a></div>
        {loading ? <div className={styles.state}>در حال دریافت کسب‌وکارها…</div> : error ? <div className={styles.stateError}>{error}</div> : items.length ? (
          <div className={styles.grid}>
            {items.map((business) => (
              <article className={styles.card} key={business.id}>
                <a className={styles.media} href={`/businesses/${business.slug}`}>
                  {business.cover_url ? <img src={business.cover_url} alt="" /> : <span />}
                  {business.logo_url ? <img className={styles.logo} src={business.logo_url} alt={business.name} /> : <b>{business.name.slice(0, 1)}</b>}
                  {business.is_verified && <em>تأیید چاکود</em>}
                </a>
                <div className={styles.body}>
                  <small>{business.business_type_title}</small>
                  <h3><a href={`/businesses/${business.slug}`}>{business.name}</a></h3>
                  <p>{[business.neighborhood, business.city, business.province].filter(Boolean).join("، ") || "نشانی در پروفایل"}</p>
                  <div className={styles.tags}>{[...business.category_labels, ...business.services].slice(0, 4).map((label) => <span key={label}>{label}</span>)}{business.mobile_service && <span>خدمات در محل</span>}</div>
                  {business.price_range_text && <div className={styles.price}>{business.price_range_text}</div>}
                  <a className={styles.view} href={`/businesses/${business.slug}`}>مشاهده اطلاعات کامل</a>
                </div>
              </article>
            ))}
          </div>
        ) : <div className={styles.empty}><strong>نتیجه‌ای پیدا نشد</strong><span>فیلترها را تغییر دهید یا اولین کسب‌وکار این محدوده را ثبت کنید.</span><a href="/account/business/new">ثبت کسب‌وکار</a></div>}
      </section>
    </main>
  );
}
