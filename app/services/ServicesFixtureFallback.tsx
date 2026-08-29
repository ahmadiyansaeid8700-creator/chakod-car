"use client";

import { useMemo, useState } from "react";

import AuthStatus from "../components/AuthStatus";
import MarketModeSwitch from "../components/MarketModeSwitch";
import MobileBottomNav from "../components/MobileBottomNav";
import styles from "../businesses/page.module.css";
import catalogStyles from "../ads/[segment]/CatalogPage.module.css";
import chrome from "../ads/[segment]/CatalogChrome.module.css";

type BusinessType = "car_service" | "parts_store" | "repair_shop";

export type FixtureBusiness = {
  id: number;
  slug: string;
  business_type: BusinessType;
  business_type_title: string;
  name: string;
  province: string;
  city: string;
  neighborhood: string;
  description: string;
  category_labels: string[];
  services: string[];
  category_keys: string[];
  logo_url: string;
  cover_url: string;
  mobile_service: boolean;
  price_range_text: string;
  is_verified: boolean;
};

type Props = {
  items: FixtureBusiness[];
  initialType?: "" | BusinessType;
  lockType?: boolean;
  basePath: string;
  kicker: string;
  title: string;
  description: string;
};

const TYPES: Array<{ key: "" | BusinessType; label: string }> = [
  { key: "", label: "همه خدمات" },
  { key: "car_service", label: "خدمات خودرو" },
  { key: "parts_store", label: "لوازم یدکی" },
  { key: "repair_shop", label: "تعمیرکاران" },
];

const CATEGORIES = [
  ["", "همه خدمات", ""],
  ["car_wash", "کارواش", "car_service"],
  ["detailing", "دیتیلینگ", "car_service"],
  ["ceramic_coating", "سرامیک بدنه", "car_service"],
  ["window_tint", "شیشه دودی", "car_service"],
  ["ppf", "محافظ رنگ PPF", "car_service"],
  ["vehicle_wrap", "کاور بدنه", "car_service"],
  ["audio_alarm", "سیستم صوتی و دزدگیر", "car_service"],
  ["mechanical", "مکانیکی", "repair_shop"],
  ["auto_electrical", "برق خودرو", "repair_shop"],
  ["oil_change", "تعویض روغن", "repair_shop"],
  ["spare_parts", "قطعات یدکی", "parts_store"],
] as const;

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

export function filterFixtureBusinesses(
  items: FixtureBusiness[],
  type: "" | BusinessType,
  category: string,
  query: string,
  city: string,
) {
  const normalizedQuery = normalize(query);
  const normalizedCity = normalize(city);

  return items.filter((business) => {
    if (type && business.business_type !== type) return false;
    if (category && !business.category_keys.includes(category)) return false;
    if (normalizedCity && !normalize(`${business.city} ${business.province}`).includes(normalizedCity)) return false;
    if (normalizedQuery) {
      const haystack = normalize([
        business.name,
        business.description,
        business.city,
        business.province,
        ...business.category_labels,
        ...business.services,
      ].join(" "));
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });
}

export default function ServicesFixtureFallback({
  items,
  initialType = "",
  lockType = false,
  basePath,
  kicker,
  title,
  description,
}: Props) {
  const [type, setType] = useState<"" | BusinessType>(initialType);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const filtered = useMemo(
    () => filterFixtureBusinesses(items, type, category, query, city),
    [items, type, category, query, city],
  );

  function changeType(nextType: "" | BusinessType) {
    setType(lockType ? initialType : nextType);
    setCategory("");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (nextType) params.set("type", nextType); else params.delete("type");
      window.history.replaceState({}, "", `${basePath}${params.size ? `?${params}` : ""}`);
    }
  }

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    const definition = CATEGORIES.find(([key]) => key === nextCategory);
    if (!lockType && definition?.[2]) setType(definition[2] as BusinessType);
  }

  return (
    <main className={`${catalogStyles.page} ${styles.marketPage}`} dir="rtl">
      <header className={chrome.header}>
        <div className={chrome.headerInner}>
          <a className={chrome.brand} href="/" aria-label="صفحه اصلی چاکود">
            <img className={chrome.logo} src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </a>
          <nav className={chrome.primaryNav} aria-label="ناوبری اصلی چاکود">
            <a href="/cars">خودروها</a>
            <a href="/dealerships">نمایشگاه‌ها</a>
            <a className={chrome.activeNav} href="/services">بازار خدمات</a>
          </nav>
          <div className={chrome.actions}>
            <a className={chrome.savedLink} href="/account/saved">نشان</a>
            <div className={chrome.accountStatus}><AuthStatus /></div>
          </div>
        </div>
      </header>

      <MarketModeSwitch active="services" />

      <section className={chrome.hero}>
        <span className={chrome.kicker}>{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      {!lockType ? (
        <nav className={chrome.segmentNav} aria-label="دسته‌های بازار خدمات">
          {TYPES.map((item) => (
            <button
              key={item.key || "all"}
              type="button"
              data-market-type={item.key || "all"}
              className={type === item.key ? chrome.segmentActive : undefined}
              onClick={() => changeType(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      <section className={chrome.browser} aria-label={title}>
        <div className={catalogStyles.marketGrid}>
          <aside className={catalogStyles.desktopFilters} aria-label="فیلتر خدمات">
            <div className={catalogStyles.filterHeader}>
              <div><span>دموی کامل چاکود</span><strong>فیلتر خدمات</strong></div>
              <b>⌕</b>
            </div>
            <div className={catalogStyles.filterForm}>
              <div className={catalogStyles.filterBody}>
                <section className={catalogStyles.filterSection}>
                  <div className={catalogStyles.sectionTitle}>جست‌وجو</div>
                  <label className={catalogStyles.fieldWide}>
                    <span>نام یا نوع خدمت</span>
                    <input className={catalogStyles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً دیتیلینگ یا باتری" />
                  </label>
                </section>
                <section className={catalogStyles.filterSection}>
                  <div className={catalogStyles.sectionTitle}>دسته خدمات</div>
                  {!lockType ? (
                    <label className={catalogStyles.fieldWide}>
                      <span>نوع کسب‌وکار</span>
                      <select className={catalogStyles.select} value={type} onChange={(event) => changeType(event.target.value as "" | BusinessType)}>
                        {TYPES.map((item) => <option value={item.key} key={item.key || "all"}>{item.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className={catalogStyles.fieldWide}>
                    <span>خدمت</span>
                    <select className={catalogStyles.select} value={category} onChange={(event) => changeCategory(event.target.value)}>
                      {CATEGORIES.filter(([, , categoryType]) => !categoryType || !lockType || categoryType === initialType).map(([key, label]) => (
                        <option value={key} key={key || "all"}>{label}</option>
                      ))}
                    </select>
                  </label>
                </section>
                <section className={catalogStyles.filterSection}>
                  <div className={catalogStyles.sectionTitle}>موقعیت</div>
                  <label className={catalogStyles.fieldWide}>
                    <span>شهر یا استان</span>
                    <input className={catalogStyles.input} value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً تهران یا رشت" />
                  </label>
                </section>
              </div>
              <div className={catalogStyles.filterActions}>
                <button className={catalogStyles.clearButton} type="button" onClick={() => { setQuery(""); setCity(""); setCategory(""); if (!lockType) setType(""); }}>پاک‌کردن فیلترها</button>
              </div>
            </div>
          </aside>

          <section className={catalogStyles.resultsColumn} aria-live="polite">
            <div className={catalogStyles.resultsTop}>
              <div className={catalogStyles.resultsCopy}>
                <strong>{filtered.length.toLocaleString("fa-IR")} کسب‌وکار دمو</strong>
                <span>همه موارد با TEST_ مشخص شده‌اند و برای نمایش staging هستند.</span>
              </div>
            </div>

            {filtered.length ? (
              <div className={`${catalogStyles.grid} ${styles.marketBusinessGrid}`}>
                {filtered.map((business) => {
                  const href = `/services/${business.slug}`;
                  return (
                    <article data-business-type={business.business_type} className={styles.card} key={business.id}>
                      <a className={styles.media} href={href}>
                        {business.cover_url ? <img src={business.cover_url} alt="" /> : <span />}
                        {business.logo_url ? <img className={styles.logo} src={business.logo_url} alt={business.name} /> : <b>{business.name.slice(0, 1)}</b>}
                        <em>{business.business_type_title}</em>
                      </a>
                      <div className={styles.body}>
                        <small>{business.business_type_title}</small>
                        <h3><a href={href}>{business.name}</a></h3>
                        <p>{[business.neighborhood, business.city, business.province].filter(Boolean).join("، ")}</p>
                        <div className={styles.tags}>
                          {[...business.category_labels, ...business.services].slice(0, 4).map((label) => <span key={label}>{label}</span>)}
                          {business.mobile_service ? <span>خدمات در محل</span> : null}
                        </div>
                        <div className={styles.price}>{business.price_range_text}</div>
                        <a className={styles.view} href={href}>مشاهده اطلاعات کامل</a>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={catalogStyles.empty}>
                <span className={catalogStyles.emptyIcon}>⌕</span>
                <strong>خدمتی مطابق این فیلتر پیدا نشد</strong>
                <p>فیلترها را پاک کن تا همه نمونه‌های دمو را ببینی.</p>
              </div>
            )}
          </section>
        </div>
      </section>
      <MobileBottomNav />
    </main>
  );
}
