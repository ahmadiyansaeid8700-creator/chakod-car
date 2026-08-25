"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import AuthStatus from "../components/AuthStatus";
import MobileBottomNav from "../components/MobileBottomNav";
import MobileBackButton from "../components/MobileBackButton";
import MarketModeSwitch from "../components/MarketModeSwitch";
import styles from "./page.module.css";
import catalogStyles from "../ads/[segment]/CatalogPage.module.css";
import chrome from "../ads/[segment]/CatalogChrome.module.css";

type BusinessType = "dealer" | "repair_shop" | "car_service" | "parts_store";

type BusinessesPageProps = {
  initialType?: "" | BusinessType;
  basePath?: string;
  lockType?: boolean;
  kicker?: string;
  title?: string;
  description?: string;
  marketMode?: boolean;
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
  href?: string;
  is_selected?: boolean;
  selected_listing_ids?: number[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  items?: PublicBusiness[];
  total?: number;
};

type FeaturedPlacement = {
  id?: number;
  dealer_id?: number;
  dealer_name?: string;
  province?: string;
  desktop_banner_url?: string;
  mobile_banner_url?: string;
  listing_ids?: number[];
  creative_status?: string;
};

type FeaturedResponse = {
  success?: boolean;
  data?: FeaturedPlacement[];
};

type SelectedListing = {
  id: number;
  title?: string;
  brand?: string;
  model?: string;
  production_year?: number | null;
  price_toman?: number | null;
  cover_image?: string;
};

type SelectedListingsResponse = {
  success?: boolean;
  data?: SelectedListing[];
};

const types: Array<{ key: "" | BusinessType; label: string }> = [
  { key: "", label: "همه کسب‌وکارها" },
  { key: "dealer", label: "نمایشگاه خودرو" },
  { key: "repair_shop", label: "تعمیرگاه خودرو" },
  { key: "car_service", label: "مرکز خدمات خودرو" },
  { key: "parts_store", label: "فروشگاه قطعات و لوازم خودرو" },
];

const serviceMarketTypes: Array<{ key: "" | BusinessType; label: string }> = [
  { key: "", label: "همه خدمات" },
  { key: "car_service", label: "خدمات خودرو" },
  { key: "parts_store", label: "لوازم یدکی" },
  { key: "repair_shop", label: "تعمیرکاران" },
];

const serviceMarketTone: Record<"all" | "car_service" | "parts_store" | "repair_shop", { accent: string; dark: string; soft: string }> = {
  all: { accent: "#6d28d9", dark: "#35134f", soft: "#f4effd" },
  car_service: { accent: "#0f8f83", dark: "#07554f", soft: "#e9fbf8" },
  parts_store: { accent: "#d97706", dark: "#7a3d04", soft: "#fff5dc" },
  repair_shop: { accent: "#1683c7", dark: "#0b4f7b", soft: "#e8f6ff" },
};

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

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function normalizeListingIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Math.round(Number(item || 0)))
        .filter((item) => Number.isSafeInteger(item) && item > 0),
    ),
  ).slice(0, 3);
}

function listingTitle(listing: SelectedListing) {
  const title = String(listing.title || "").trim();
  if (title) return title;
  return [listing.brand, listing.model, listing.production_year]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .join(" ") || `خودرو ${listing.id}`;
}

function listingPrice(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "توافقی";
  return `${Math.round(amount).toLocaleString("fa-IR")} تومان`;
}

function SelectedShowroomCars({ ids }: { ids?: number[] }) {
  const idsKey = normalizeListingIds(ids).join(",");
  const requestedIds = idsKey ? idsKey.split(",").map(Number) : [];
  const [listings, setListings] = useState<SelectedListing[]>([]);
  const [loading, setLoading] = useState(Boolean(idsKey));

  useEffect(() => {
    if (!idsKey) {
      setListings([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    async function load() {
      try {
        const response = await fetch(`/api/compare-listings?ids=${encodeURIComponent(idsKey)}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const result = (await response.json()) as SelectedListingsResponse;
        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          setListings([]);
          return;
        }
        const order = new Map(requestedIds.map((id, index) => [id, index]));
        setListings(
          result.data
            .filter((item) => requestedIds.includes(Number(item.id)))
            .sort((a, b) => (order.get(Number(a.id)) ?? 99) - (order.get(Number(b.id)) ?? 99))
            .slice(0, 3),
        );
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setListings([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [idsKey]);

  if (!idsKey) return null;

  return (
    <div className={styles.selectedCarsWrap}>
      <span className={styles.selectedCarsLabel}>خودروهای منتخب</span>
      <div className={`${styles.selectedCars} ${(loading ? requestedIds.length : listings.length) === 2 ? styles.selectedCarsTwo : ""}`}>
        {loading
          ? requestedIds.map((id) => <span className={styles.selectedCarSkeleton} key={id} />)
          : listings.map((listing) => (
              <a className={styles.selectedCar} href={`/cars/${listing.id}`} key={listing.id}>
                <span className={styles.selectedCarMedia}>
                  {listing.cover_image ? <img src={listing.cover_image} alt={listingTitle(listing)} /> : <span />}
                </span>
                <strong>{listingTitle(listing)}</strong>
                <small>{listingPrice(listing.price_toman)}</small>
              </a>
            ))}
      </div>
    </div>
  );
}

function mergeSelectedShowrooms(
  baseItems: PublicBusiness[],
  placements: FeaturedPlacement[],
  query: string,
  city: string,
) {
  const itemIndexByName = new Map<string, number>();
  baseItems.forEach((item, index) => {
    const key = normalizeText(item.name);
    if (key && !itemIndexByName.has(key)) itemIndexByName.set(key, index);
  });

  const usedBaseIndexes = new Set<number>();
  const seenDealerIds = new Set<number>();
  const featuredItems: PublicBusiness[] = [];
  let syntheticCount = 0;

  for (const placement of placements) {
    const dealerId = Math.round(Number(placement.dealer_id || 0));
    if (!Number.isSafeInteger(dealerId) || dealerId <= 0 || seenDealerIds.has(dealerId)) continue;
    seenDealerIds.add(dealerId);

    const name = String(placement.dealer_name || "").trim() || `نمایشگاه ${dealerId}`;
    const nameKey = normalizeText(name);
    const matchingIndex = itemIndexByName.get(nameKey);
    const selectedCover = String(
      placement.mobile_banner_url || placement.desktop_banner_url || "",
    ).trim();
    const selectedListingIds = normalizeListingIds(placement.listing_ids);

    if (matchingIndex !== undefined) {
      const item = baseItems[matchingIndex];
      usedBaseIndexes.add(matchingIndex);
      featuredItems.push({
        ...item,
        cover_url: selectedCover || item.cover_url,
        is_selected: true,
        selected_listing_ids: selectedListingIds,
        href: `/businesses/${encodeURIComponent(item.slug)}`,
      });
      continue;
    }

    const searchable = normalizeText(`${name} ${placement.province || ""}`);
    if (query.trim() && !searchable.includes(normalizeText(query))) continue;
    if (city.trim() && !normalizeText(placement.province).includes(normalizeText(city))) continue;

    syntheticCount += 1;
    featuredItems.push({
      id: 1_500_000_000 + dealerId,
      slug: "",
      business_type: "dealer",
      business_type_title: "نمایشگاه منتخب",
      name,
      province: String(placement.province || ""),
      city: "",
      neighborhood: "",
      logo_url: "",
      cover_url: selectedCover,
      description: "",
      category_labels: ["منتخب چاکود"],
      services: [],
      mobile_service: false,
      price_range_text: "",
      is_verified: false,
      is_selected: true,
      selected_listing_ids: selectedListingIds,
      href: `/showrooms/${dealerId}`,
    });
  }

  return {
    items: [
      ...featuredItems,
      ...baseItems.filter((_, index) => !usedBaseIndexes.has(index)),
    ],
    syntheticCount,
  };
}

export default function BusinessesPage({
  initialType = "",
  basePath = "/businesses",
  lockType = false,
  kicker = "راهنمای خدمات خودرویی چاکود",
  title = "کسب‌وکارهای خودرو را نزدیک خودتان پیدا کنید",
  description = "نمایشگاه، تعمیرگاه، کارواش، دیتیلینگ، شیشه دودی، فروشگاه قطعات و سایر خدمات خودرو.",
  marketMode = false,
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

  const dealerDirectory = lockType && initialType === "dealer";

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

    async function load() {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const result = (await response.json()) as ApiResponse;
        if (!response.ok || !result.success) {
          throw new Error(result.message || "دریافت فهرست انجام نشد.");
        }

        const receivedItems = Array.isArray(result.items) ? result.items : [];
        const baseItems = marketMode
          ? receivedItems.filter((item) => item.business_type !== "dealer")
          : receivedItems;
        if (!dealerDirectory) {
          setItems(baseItems);
          setTotal(marketMode ? baseItems.length : Number(result.total || 0));
          return;
        }

        let placements: FeaturedPlacement[] = [];
        try {
          const featuredResponse = await fetch("/api/featured-showrooms", {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          const featuredResult = (await featuredResponse.json()) as FeaturedResponse;
          if (featuredResponse.ok && featuredResult.success && Array.isArray(featuredResult.data)) {
            placements = featuredResult.data;
          }
        } catch (reason: unknown) {
          if ((reason as Error).name === "AbortError") throw reason;
        }

        const merged = mergeSelectedShowrooms(baseItems, placements, query, city);
        setItems(merged.items);
        setTotal(Number(result.total || baseItems.length) + merged.syntheticCount);
      } catch (reason: unknown) {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(reason instanceof Error ? reason.message : "دریافت فهرست انجام نشد.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [basePath, city, dealerDirectory, marketMode, query, search]);

  const mobileTitle = dealerDirectory ? "نمایشگاه‌ها" : marketMode ? "بازار خدمات" : "کسب‌وکارها";
  const resultNoun = dealerDirectory ? "نمایشگاه" : "کسب‌وکار";

  if (marketMode) {
    const toneKey = (type || "all") as keyof typeof serviceMarketTone;
    const tone = serviceMarketTone[toneKey] || serviceMarketTone.all;
    const cssVars = {
      "--accent": tone.accent,
      "--accent-dark": tone.dark,
      "--soft": tone.soft,
    } as CSSProperties;

    return (
      <main className={`${catalogStyles.page} ${styles.marketPage}`} dir="rtl" style={cssVars}>
        <header className={chrome.header}>
          <div className={chrome.headerInner}>
            <a className={chrome.brand} href="/" aria-label="صفحه اصلی چاکود">
              <img className={chrome.logo} src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
            </a>
            <nav className={chrome.primaryNav} aria-label="ناوبری اصلی چاکود">
              <a href="/cars">خودروها</a>
              <a href="/dealerships">نمایشگاه‌ها</a>
              <a href="/businesses">کسب‌وکارها</a>
              <a className={chrome.activeNav} href="/services">بازار خدمات</a>
            </nav>
            <div className={chrome.actions}>
              <a className={chrome.savedLink} href="/account/saved">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.25 4.75A1.75 1.75 0 0 1 9 3h6a1.75 1.75 0 0 1 1.75 1.75v15L12 16.6l-4.75 3.15v-15Z" /></svg>
                <b>نشان</b>
              </a>
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

        <nav className={chrome.segmentNav} aria-label="دسته‌های بازار خدمات">
          {serviceMarketTypes.map((item) => (
            <button
              data-market-type={item.key || "all"}
              key={item.key || "all"}
              type="button"
              className={type === item.key ? chrome.segmentActive : undefined}
              onClick={() => { setType(item.key); if (item.key !== "car_service") setCategory(""); }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className={chrome.browser} aria-label={title}>
          <div className={catalogStyles.marketGrid}>
            <aside className={catalogStyles.desktopFilters} aria-label="فیلتر آگهی‌ها">
              <div className={catalogStyles.filterHeader}>
                <div><span>نتیجه دقیق</span><strong>فیلتر خدمات</strong></div>
                <b>⌕</b>
              </div>
              <form className={catalogStyles.filterForm} onSubmit={(event) => event.preventDefault()}>
                <div className={catalogStyles.filterBody}>
                  <section className={catalogStyles.filterSection}>
                    <div className={catalogStyles.sectionTitle}>جست‌وجوی کسب‌وکار <small>نام یا نوع خدمت</small></div>
                    <label className={catalogStyles.fieldWide}>
                      <span>عبارت جست‌وجو</span>
                      <input className={catalogStyles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً صافکاری یا لوازم یدکی" />
                    </label>
                  </section>
                  <section className={catalogStyles.filterSection}>
                    <div className={catalogStyles.sectionTitle}>دسته خدمات</div>
                    <label className={catalogStyles.fieldWide}>
                      <span>نوع کسب‌وکار</span>
                      <select className={catalogStyles.select} value={type} onChange={(event) => { setType(event.target.value as "" | BusinessType); setCategory(""); }}>
                        {serviceMarketTypes.map((item) => <option value={item.key} key={item.key || "all"}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className={catalogStyles.fieldWide}>
                      <span>خدمت</span>
                      <select className={catalogStyles.select} value={category} onChange={(event) => {
                        const nextCategory = event.target.value;
                        const selected = serviceCategories.find((item) => item.key === nextCategory);
                        setCategory(nextCategory);
                        if (selected?.type) setType(selected.type);
                      }}>
                        {serviceCategories.map((item) => <option value={item.key} key={item.key || "all"}>{item.label}</option>)}
                      </select>
                    </label>
                  </section>
                  <section className={catalogStyles.filterSection}>
                    <div className={catalogStyles.sectionTitle}>موقعیت <small>استان و شهر</small></div>
                    <label className={catalogStyles.fieldWide}>
                      <span>شهر</span>
                      <input className={catalogStyles.input} value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً رشت یا تهران" />
                    </label>
                  </section>
                </div>
                <div className={catalogStyles.filterActions}>
                  <button className={catalogStyles.applyButton} type="button">اعمال فیلترها</button>
                  <button className={catalogStyles.clearButton} type="button" onClick={() => { setQuery(""); setCity(""); setCategory(""); setType(""); }}>پاک‌کردن</button>
                </div>
              </form>
            </aside>

            <section className={catalogStyles.resultsColumn} aria-live="polite">
              <div className={catalogStyles.resultsTop}>
                <div className={catalogStyles.resultsCopy}>
                  <strong>{loading ? "در حال دریافت خدمات" : `${total.toLocaleString("fa-IR")} کسب‌وکار پیدا شد`}</strong>
                  <span>کسب‌وکارهای تأییدشده و منتخب در اولویت نمایش‌اند.</span>
                </div>
              </div>
              {loading ? (
                <div className={catalogStyles.grid} aria-label="در حال بارگذاری">
                  {Array.from({ length: 6 }).map((_, index) => <div className={catalogStyles.skeleton} key={index}><div className={catalogStyles.skeletonMedia} /><div className={catalogStyles.skeletonBody}><span className={catalogStyles.skeletonLine} /><span className={catalogStyles.skeletonLine} /><span className={catalogStyles.skeletonLine} /></div></div>)}
                </div>
              ) : error ? (
                <div className={catalogStyles.empty}><span className={catalogStyles.emptyIcon}>!</span><strong>ارتباط با بازار خدمات برقرار نشد</strong><p>{error}</p><button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button></div>
              ) : items.length ? (
                <div className={catalogStyles.grid}>
                  {items.map((business) => {
                    const href = business.href || `/businesses/${encodeURIComponent(business.slug)}`;
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
                          <p>{[business.neighborhood, business.city, business.province].filter(Boolean).join("، ") || "موقعیت ثبت نشده"}</p>
                          <div className={styles.tags}>{[...business.category_labels, ...business.services].slice(0, 3).map((label) => <span key={label}>{label}</span>)}</div>
                          {business.price_range_text && <div className={styles.price}>{business.price_range_text}</div>}
                          <a className={styles.view} href={href}>مشاهده اطلاعات کامل</a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={catalogStyles.empty}><span className={catalogStyles.emptyIcon}>⌕</span><strong>خدمتی مطابق این فیلترها پیدا نشد</strong><p>موقعیت یا دسته خدمات را تغییر بده تا گزینه‌های بیشتری ببینی.</p><a href="/services">نمایش همه خدمات</a></div>
              )}
            </section>
          </div>
        </section>
        <MobileBottomNav />
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${marketMode ? styles.marketPage : ""}`} dir="rtl">
      <header className={styles.header}>
        <a href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></a>
        <nav><button type="button" onClick={() => window.history.back()}>بازگشت</button><a href="/">صفحه اصلی</a><a href="/account/business/new">ثبت کسب‌وکار</a><a href="/account">حساب من</a></nav>
      </header>

      <header className={styles.mobileHeader} aria-label="ناوبری صفحه">
        <MobileBackButton />
        <strong>{mobileTitle}</strong>
        <a href="/" aria-label="صفحه اصلی چاکود"><img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" /></a>
      </header>

      {marketMode ? <MarketModeSwitch active="services" /> : null}

      {dealerDirectory ? (
        <section className={styles.dealerSearch} aria-label="جستجوی نمایشگاه‌ها">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو"
            aria-label="جستجوی نمایشگاه"
          />
        </section>
      ) : (
        <>
          <section className={`${styles.hero} ${marketMode ? styles.marketHero : ""}`}>
            <span>{kicker}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </section>

          <section className={`${styles.filters} ${marketMode ? styles.marketFilters : ""}`} aria-label="فیلتر کسب‌وکارها">
            <div className={styles.typeTabs}>
              {(marketMode ? serviceMarketTypes : types).map((item) => (
                <button data-market-type={item.key || "all"} key={item.key || "all"} type="button" className={type === item.key ? styles.activeTab : ""} onClick={() => { setType(item.key); if (item.key !== "car_service") setCategory(""); }}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.filterGrid}>
              <label><span>جست‌وجو</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام کسب‌وکار یا نوع خدمت" /></label>
              <label><span>شهر</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً رشت یا تهران" /></label>
              <label><span>خدمت</span><select value={category} onChange={(event) => {
                const nextCategory = event.target.value;
                const selected = serviceCategories.find((item) => item.key === nextCategory);
                setCategory(nextCategory);
                if (selected?.type) setType(selected.type);
              }}>{serviceCategories.map((item) => <option value={item.key} key={item.key || "all"}>{item.label}</option>)}</select></label>
              <button type="button" onClick={() => { setQuery(""); setCity(""); setCategory(""); setType(""); }}>پاک‌کردن فیلترها</button>
            </div>
          </section>
        </>
      )}

      <section className={styles.results}>
        <div className={styles.resultHeader}><div><span>نتایج جست‌وجو</span><h2>{total.toLocaleString("fa-IR")} {resultNoun}</h2></div><a href="/account/business/new">ثبت کسب‌وکار جدید</a></div>
        {loading ? <div className={styles.state}>در حال دریافت {resultNoun}ها…</div> : error ? <div className={styles.stateError}>{error}</div> : items.length ? (
          <div className={styles.grid}>
            {items.map((business) => {
              const href = business.href || `/businesses/${encodeURIComponent(business.slug)}`;
              return (
                <article data-business-type={business.business_type} className={`${styles.card} ${business.is_selected ? styles.cardSelected : ""}`} key={business.id}>
                  <a className={styles.media} href={href}>
                    {business.cover_url ? <img src={business.cover_url} alt="" /> : <span />}
                    {business.logo_url ? <img className={styles.logo} src={business.logo_url} alt={business.name} /> : <b>{business.name.slice(0, 1)}</b>}
                    {business.is_selected && <em className={styles.selectedBadge}>منتخب چاکود</em>}
                    {business.is_verified && <em>تأیید چاکود</em>}
                  </a>
                  <div className={styles.body}>
                    <small>{business.is_selected ? "نمایشگاه منتخب" : business.business_type_title}</small>
                    <h3><a href={href}>{business.name}</a></h3>
                    <p>{[business.neighborhood, business.city, business.province].filter(Boolean).join("، ") || "نشانی در پروفایل"}</p>
                    {business.is_selected ? <SelectedShowroomCars ids={business.selected_listing_ids} /> : null}
                    <div className={styles.tags}>{[...business.category_labels, ...business.services].slice(0, 4).map((label) => <span key={label}>{label}</span>)}{business.mobile_service && <span>خدمات در محل</span>}</div>
                    {business.price_range_text && <div className={styles.price}>{business.price_range_text}</div>}
                    <a className={styles.view} href={href}>مشاهده اطلاعات کامل</a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className={styles.empty}><strong>نتیجه‌ای پیدا نشد</strong><span>فیلترها را تغییر دهید یا اولین کسب‌وکار این محدوده را ثبت کنید.</span><a href="/account/business/new">ثبت کسب‌وکار</a></div>}
      </section>

      <MobileBottomNav />
    </main>
  );
}
