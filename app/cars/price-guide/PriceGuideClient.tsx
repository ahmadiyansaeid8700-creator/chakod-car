"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { CatalogListing, CatalogResponse } from "../../ads/[segment]/catalog-types";
import styles from "./page.module.css";

type FacetOption = { name: string; code?: string; brand_code?: string };

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(value || 0))} تومان`;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * percentileValue)));
  return sorted[index];
}

async function readCatalog(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as CatalogResponse & { message?: string };
  if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
    throw new Error(payload?.message || "اطلاعات بازار دریافت نشد.");
  }
  return payload;
}

export default function PriceGuideClient() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [results, setResults] = useState<CatalogListing[]>([]);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [province, setProvince] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function loadFacets() {
    setLoading(true);
    setError("");
    try {
      const payload = await readCatalog("/api/catalog?limit=24&sort=newest");
      setCatalog(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "اطلاعات بازار دریافت نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFacets();
  }, []);

  const brands: FacetOption[] = useMemo(
    () => (catalog?.facets?.brands || []).map((item) => ({ name: item.name, code: item.code })),
    [catalog?.facets?.brands],
  );
  const models: FacetOption[] = useMemo(
    () => (catalog?.facets?.models || [])
      .filter((item) => !brand || item.brand_code === brand)
      .map((item) => ({ name: item.name, code: item.code, brand_code: item.brand_code })),
    [catalog?.facets?.models, brand],
  );
  const provinces = useMemo(
    () => (catalog?.facets?.provinces || []).map((item) => item.name),
    [catalog?.facets?.provinces],
  );

  useEffect(() => {
    if (model && !models.some((item) => item.code === model)) setModel("");
  }, [brand, model, models]);

  async function searchMarket() {
    if (!brand) {
      setError("برای مقایسه دقیق تر حداقل برند خودرو را انتخاب کنید.");
      return;
    }

    setSearching(true);
    setError("");
    setSearched(true);
    try {
      const params = new URLSearchParams({
        limit: "24",
        sort: "newest",
        brand,
      });
      if (model) params.set("model", model);
      if (province) params.set("province", province);
      const payload = await readCatalog(`/api/catalog?${params.toString()}`);
      setResults(payload.data);
      setCatalog((current) => current || payload);
    } catch (searchError) {
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : "جست وجوی قیمت انجام نشد.");
    } finally {
      setSearching(false);
    }
  }

  const priced = useMemo(
    () => results.filter((item) => Number(item.price_toman || 0) > 0),
    [results],
  );
  const prices = useMemo(() => priced.map((item) => Number(item.price_toman || 0)), [priced]);
  const stats = useMemo(() => ({
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    median: median(prices),
    lower: percentile(prices, 0.25),
    upper: percentile(prices, 0.75),
  }), [prices]);

  const selectedBrandName = brands.find((item) => item.code === brand)?.name || "";
  const selectedModelName = models.find((item) => item.code === model)?.name || "";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span>CHAKOD MARKET GUIDE</span>
          <h1>راهنمای قیمت بازار خودرو</h1>
          <p>قیمت آگهی های مشابه فعال در چاکود را مقایسه کنید. اعداد این صفحه قیمت پیشنهادی فروشندگان هستند و جای کارشناسی فنی، بدنه و معامله نهایی را نمی گیرند.</p>
          <div className={styles.heroLinks}>
            <Link href="/cars">مشاهده بازار خودرو</Link>
            <Link href="/account/listings/new">ثبت آگهی</Link>
          </div>
        </section>

        <section className={styles.searchCard}>
          <header>
            <span>جست وجوی خودروهای مشابه</span>
            <h2>خودرو را انتخاب کنید</h2>
          </header>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <div className={styles.loading}><span className={styles.loader}/><p>در حال دریافت برندها و مدل های بازار...</p></div>
          ) : (
            <div className={styles.filters}>
              <label>
                برند
                <select value={brand} onChange={(event) => setBrand(event.target.value)}>
                  <option value="">انتخاب برند</option>
                  {brands.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                مدل
                <select value={model} onChange={(event) => setModel(event.target.value)} disabled={!brand}>
                  <option value="">همه مدل های برند</option>
                  {models.map((item) => <option key={`${item.brand_code}-${item.code}`} value={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                استان
                <select value={province} onChange={(event) => setProvince(event.target.value)}>
                  <option value="">سراسر ایران</option>
                  {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <button type="button" disabled={searching || !brand} onClick={() => void searchMarket()}>
                {searching ? "در حال مقایسه..." : "مقایسه قیمت آگهی ها"}
              </button>
            </div>
          )}
        </section>

        {searched && !searching && priced.length > 0 && (
          <>
            <section className={styles.summary}>
              <header>
                <span>نمونه بازار</span>
                <h2>{[selectedBrandName, selectedModelName, province].filter(Boolean).join("، ")}</h2>
                <p>{new Intl.NumberFormat("fa-IR").format(priced.length)} آگهی دارای قیمت برای محاسبه استفاده شده است.</p>
              </header>
              <div className={styles.statsGrid}>
                <article><span>میانه قیمت</span><strong>{formatToman(stats.median)}</strong><small>مرکز نمونه قیمت های بازار</small></article>
                <article><span>بازه رایج</span><strong>{formatToman(stats.lower)}</strong><small>تا {formatToman(stats.upper)}</small></article>
                <article><span>کمترین قیمت نمونه</span><strong>{formatToman(stats.min)}</strong><small>قیمت آگهی، نه قیمت کارشناسی</small></article>
                <article><span>بیشترین قیمت نمونه</span><strong>{formatToman(stats.max)}</strong><small>ممکن است تیپ یا وضعیت متفاوت باشد</small></article>
              </div>
            </section>

            <section className={styles.examples}>
              <header><span>آگهی های مبنا</span><h2>نمونه های مشابه بازار</h2></header>
              <div className={styles.exampleGrid}>
                {priced.slice(0, 8).map((item) => (
                  <Link href={`/cars/${item.id}`} key={String(item.id)}>
                    <div className={styles.imageWrap}>
                      {item.cover_image ? <img src={item.cover_image} alt={item.title} /> : <span>بدون تصویر</span>}
                    </div>
                    <div className={styles.exampleBody}>
                      <strong>{item.title}</strong>
                      <small>{[item.production_year, item.city || item.province].filter(Boolean).join(" · ")}</small>
                      <b>{formatToman(Number(item.price_toman || 0))}</b>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        {searched && !searching && !error && priced.length === 0 && (
          <section className={styles.empty}>
            <span>⌁</span>
            <h2>نمونه قیمت کافی پیدا نشد</h2>
            <p>مدل یا استان را بازتر انتخاب کنید تا آگهی های مشابه بیشتری وارد مقایسه شوند.</p>
            <Link href="/cars">جست وجوی کامل بازار</Link>
          </section>
        )}

        <section className={styles.disclaimer}>
          <strong>این عدد قیمت قطعی خودرو نیست</strong>
          <p>کارکرد، تیپ، سلامت بدنه و فنی، رنگ شدگی، آپشن ها، شرایط سند، منطقه جغرافیایی و زمان معامله روی قیمت واقعی اثر دارند. چاکود در این صفحه فقط آمار قیمت آگهی های مشابه را نشان می دهد.</p>
        </section>
      </div>
    </main>
  );
}
