"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./HomeAutoBusinesses.module.css";

type BusinessType = "dealer" | "repair_shop" | "car_service" | "parts_store";

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

type BusinessesResponse = {
  success?: boolean;
  message?: string;
  items?: PublicBusiness[];
};

type Props = {
  location: string;
};

const typeCards: Array<{
  type: BusinessType;
  title: string;
  description: string;
  icon: string;
}> = [
  { type: "dealer", title: "نمایشگاه‌های خودرو", description: "خرید، فروش و تعویض خودرو", icon: "⌂" },
  { type: "repair_shop", title: "تعمیرگاه‌های خودرو", description: "تعمیرات فنی و سرویس تخصصی", icon: "⚙" },
  { type: "car_service", title: "مراکز خدمات خودرو", description: "کارواش، دیتیلینگ، شیشه دودی و کاور", icon: "✦" },
  { type: "parts_store", title: "فروشگاه‌های قطعات", description: "قطعات یدکی و لوازم خودرو", icon: "▣" },
];

const serviceShortcuts = [
  ["car_wash", "کارواش و صفرشویی"],
  ["detailing", "دیتیلینگ و سرامیک"],
  ["window_tint", "شیشه دودی"],
  ["ppf", "کاور و محافظ رنگ"],
  ["audio_alarm", "سیستم صوتی و دزدگیر"],
] as const;

function safeLocation(value: string) {
  if (!value || value === "همه شهرها" || value === "سراسر ایران") return "";
  return value;
}

export default function HomeAutoBusinesses({ location }: Props) {
  const [items, setItems] = useState<PublicBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedLocation = useMemo(() => safeLocation(location), [location]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ home: "1", limit: "8" });
    if (normalizedLocation) params.set("location", normalizedLocation);

    setLoading(true);
    setError("");

    fetch(`/api/businesses?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as BusinessesResponse;
        if (!response.ok || !result.success) {
          throw new Error(result.message || "دریافت کسب‌وکارها انجام نشد.");
        }
        setItems(Array.isArray(result.items) ? result.items : []);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(reason instanceof Error ? reason.message : "دریافت کسب‌وکارها انجام نشد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [normalizedLocation]);

  return (
    <section className={styles.section} id="businesses" aria-labelledby="home-businesses-title">
      <div className={styles.heading}>
        <div>
          <span>خدمات و کسب‌وکارهای نزدیک شما</span>
          <h2 id="home-businesses-title">هر چیزی که خودروی شما نیاز دارد</h2>
          <p>
            {normalizedLocation
              ? `مجموعه‌های فعال در ${normalizedLocation} را پیدا و مستقیم با آن‌ها ارتباط برقرار کنید.`
              : "نمایشگاه، تعمیرگاه، مرکز خدمات و فروشگاه قطعات را یک‌جا پیدا کنید."}
          </p>
        </div>
        <a className={styles.allLink} href="/businesses">مشاهده همه کسب‌وکارها</a>
      </div>

      <div className={styles.typeGrid}>
        {typeCards.map((card) => (
          <a key={card.type} href={`/businesses?type=${card.type}`} className={styles.typeCard}>
            <i aria-hidden="true">{card.icon}</i>
            <span><strong>{card.title}</strong><small>{card.description}</small></span>
            <b aria-hidden="true">←</b>
          </a>
        ))}
      </div>

      <div className={styles.shortcutRow} aria-label="دسته‌های محبوب خدمات خودرو">
        {serviceShortcuts.map(([key, label]) => (
          <a key={key} href={`/businesses?type=car_service&category=${key}`}>{label}</a>
        ))}
      </div>

      <div className={styles.featuredHeader}>
        <div>
          <strong>{normalizedLocation ? `کسب‌وکارهای منتخب ${normalizedLocation}` : "کسب‌وکارهای منتخب چاکود"}</strong>
          <span>اطلاعات کامل، آدرس، ساعت کاری و زمینه فعالیت</span>
        </div>
        <a href="/account/business/new">کسب‌وکار خود را ثبت کنید</a>
      </div>

      {loading ? (
        <div className={styles.state}>در حال دریافت کسب‌وکارهای نزدیک…</div>
      ) : items.length ? (
        <div className={styles.businessRail}>
          {items.map((business) => (
            <article className={styles.businessCard} key={business.id}>
              <a className={styles.media} href={`/businesses/${business.slug}`}>
                {business.cover_url ? <img src={business.cover_url} alt="" /> : <span />}
                {business.logo_url ? <img className={styles.logo} src={business.logo_url} alt={business.name} /> : <b className={styles.logoFallback}>{business.name.slice(0, 1)}</b>}
                {business.is_verified && <em>تأیید چاکود</em>}
              </a>
              <div className={styles.cardBody}>
                <small>{business.business_type_title}</small>
                <h3><a href={`/businesses/${business.slug}`}>{business.name}</a></h3>
                <p>{[business.neighborhood, business.city, business.province].filter(Boolean).join("، ") || "نشانی در پروفایل"}</p>
                <div className={styles.tags}>
                  {[...business.category_labels, ...business.services].slice(0, 3).map((label) => <span key={label}>{label}</span>)}
                  {business.mobile_service && <span>خدمات در محل</span>}
                </div>
                <a className={styles.viewButton} href={`/businesses/${business.slug}`}>مشاهده اطلاعات و مسیر</a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <strong>{error ? "دریافت فهرست انجام نشد" : "هنوز کسب‌وکاری در این محدوده ثبت نشده است"}</strong>
          <span>{error || "اولین کسب‌وکار این شهر را در چاکود ثبت کنید."}</span>
          <a href="/account/business/new">ثبت کسب‌وکار</a>
        </div>
      )}
    </section>
  );
}
