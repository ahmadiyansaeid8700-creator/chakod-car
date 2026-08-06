"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../../../components/MobileBottomNav";
import styles from "./page.module.css";

type ManagedListing = {
  id: number;
  title?: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  cover_image?: { image_url?: string } | null;
  status?: { code?: string; title?: string };
};

type ManagerResponse = {
  success?: boolean;
  message?: string;
  listing?: ManagedListing;
  data?: ManagedListing[];
};

type CommerceService = {
  service_key: string;
  title: string;
  amount_toman: number;
  duration_value?: number;
  duration_unit?: string;
  is_active: boolean;
};

type CommerceResponse = {
  success?: boolean;
  message?: string;
  services?: CommerceService[];
  payment_gateway_ready?: boolean;
};

type ServicePresentation = {
  badge: string;
  description: string;
  features: string[];
};

const supportedPromotionKeys = new Set([
  "listing_bump",
  "listing_featured",
  "listing_story",
]);

const presentation: Record<string, ServicePresentation> = {
  listing_bump: {
    badge: "نمایش سریع‌تر",
    description: "آگهی دوباره به ابتدای نتایج مرتبط منتقل می‌شود.",
    features: ["انتقال به ابتدای نتایج", "حفظ اطلاعات و تصاویر فعلی", "اعمال بعد از پرداخت موفق"],
  },
  listing_featured: {
    badge: "پیشنهاد چاکود",
    description: "کارت آگهی با نشان ویژه و ظاهر برجسته‌تر نمایش داده می‌شود.",
    features: ["نشان ویژه", "ظاهر برجسته در فهرست", "اولویت نمایش در نتایج مرتبط"],
  },
  listing_story: {
    badge: "دیده‌شدن محلی",
    description: "آگهی در استوری کاربران محدوده مرتبط نمایش داده می‌شود.",
    features: ["نمایش در استوری", "هدف‌گیری موقعیت آگهی", "برچسب روشن تبلیغ"],
  },
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export default function ListingPromoteClient({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<ManagedListing | null>(null);
  const [commerce, setCommerce] = useState<CommerceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const services = useMemo(
    () => (commerce?.services || []).filter(
      (service) => service.is_active && supportedPromotionKeys.has(service.service_key),
    ),
    [commerce?.services],
  );

  async function loadPage() {
    if (!/^\d+$/.test(listingId)) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [listingResponse, commerceResponse] = await Promise.all([
        fetch(`/api/auth/listings/manage/${listingId}`, {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        }),
        fetch("/api/auth/commerce", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        }),
      ]);
      const [listingPayload, commercePayload] = await Promise.all([
        readJson<ManagerResponse>(listingResponse),
        readJson<CommerceResponse>(commerceResponse),
      ]);

      if (
        listingResponse.status === 401 || listingResponse.status === 403 ||
        commerceResponse.status === 401 || commerceResponse.status === 403
      ) {
        window.location.assign(
          `/login?returnTo=${encodeURIComponent(`/account/listings/${listingId}/promote`)}`,
        );
        return;
      }

      if (!listingResponse.ok || !listingPayload?.success) {
        setError(listingPayload?.message || "اطلاعات آگهی دریافت نشد.");
        return;
      }

      if (!commerceResponse.ok || !commercePayload?.success) {
        setError(commercePayload?.message || "تعرفه‌های فعال دریافت نشد.");
        return;
      }

      const item =
        listingPayload.listing ||
        listingPayload.data?.find((entry) => String(entry.id) === listingId) ||
        listingPayload.data?.[0];
      if (!item || String(item.id) !== listingId) {
        setError("این آگهی در حساب شما پیدا نشد.");
        return;
      }

      setListing(item);
      setCommerce(commercePayload);
    } catch {
      setError("ارتباط با سرویس آگهی و تعرفه‌ها برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [listingId]);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href={`/account/listings/${listingId}`}>← مدیریت آگهی</Link>
          <Link href="/" className={styles.brand}>
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده‌سازی محصولات ارتقا</h1>
            <p>مالکیت آگهی و تعرفه‌های فعال در حال بررسی هستند.</p>
          </section>
        )}

        {!loading && error && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>ارتقای آگهی در دسترس نیست</h1>
            <p>{error}</p>
            <button type="button" onClick={() => void loadPage()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && !error && listing && (
          <>
            <section className={styles.hero}>
              <div>
                <span>محصولات درآمدی آگهی</span>
                <h1>دیده‌شدن بیشتر برای «{listing.title || `آگهی شماره ${listing.id}`}»</h1>
                <p>
                  مبلغ و مدت هر خدمت مستقیماً از تنظیمات Commerce خوانده می‌شود و سفارش به همین شناسه آگهی متصل خواهد شد.
                </p>
              </div>
              <div className={styles.listingSummary}>
                {listing.cover_image?.image_url ? (
                  <img src={listing.cover_image.image_url} alt={listing.title || "تصویر آگهی"} />
                ) : (
                  <span className={styles.placeholder}>بدون تصویر</span>
                )}
                <div>
                  <strong>{listing.title || "آگهی بدون عنوان"}</strong>
                  <small>{[listing.brand, listing.model, listing.year].filter(Boolean).join("، ")}</small>
                  <b>{listing.status?.title || "وضعیت نامشخص"}</b>
                </div>
              </div>
            </section>

            {services.length ? (
              <section className={styles.productGrid}>
                {services.map((service) => {
                  const details = presentation[service.service_key] || {
                    badge: "خدمت فعال",
                    description: "این خدمت براساس تنظیمات فعال چاکود ارائه می‌شود.",
                    features: ["تعرفه مدیریت‌شده", "اتصال به همین آگهی", "صدور فاکتور پس از پرداخت"],
                  };

                  return (
                    <article
                      key={service.service_key}
                      className={`${styles.productCard} ${service.service_key === "listing_featured" ? styles.featuredCard : ""}`}
                    >
                      <span className={styles.badge}>{details.badge}</span>
                      <h2>{service.title}</h2>
                      <p>{details.description}</p>
                      <strong>{formatToman(service.amount_toman)}</strong>
                      <ul>
                        {details.features.map((feature) => <li key={feature}>{feature}</li>)}
                      </ul>
                      <Link
                        href={`/account/payments/checkout?type=promotion&service_key=${encodeURIComponent(service.service_key)}&listing_id=${listing.id}`}
                      >
                        انتخاب و ادامه پرداخت
                      </Link>
                    </article>
                  );
                })}
              </section>
            ) : (
              <section className={styles.stateCard}>
                <span className={styles.stateIcon}>⌁</span>
                <h1>محصول ارتقای فعالی وجود ندارد</h1>
                <p>مدیر سایت باید حداقل یکی از خدمات بالابر، ویژه یا استوری آگهی را در Commerce فعال کند.</p>
                <Link href="/account/services">مشاهده سایر خدمات</Link>
              </section>
            )}

            <section className={styles.notice}>
              <strong>{commerce?.payment_gateway_ready === false ? "درگاه در انتظار تنظیم" : "اعمال خودکار و قابل پیگیری"}</strong>
              <p>
                سفارش، پرداخت، فاکتور و شناسه آگهی در یک جریان ذخیره می‌شوند. اعمال خدمت فقط بعد از تأیید پرداخت سمت سرور انجام خواهد شد.
              </p>
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
