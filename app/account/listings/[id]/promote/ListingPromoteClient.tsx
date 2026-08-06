"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const products = [
  {
    code: "boost",
    title: "بالابر آگهی",
    description: "آگهی شما دوباره به ابتدای نتایج مرتبط منتقل می‌شود.",
    price: 149_000,
    badge: "نمایش سریع‌تر",
    features: ["انتقال به ابتدای نتایج", "حفظ اطلاعات و تصاویر فعلی", "اعمال پس از پرداخت موفق"],
  },
  {
    code: "featured",
    title: "آگهی ویژه",
    description: "کارت آگهی با نشان ویژه و ظاهر برجسته‌تر نمایش داده می‌شود.",
    price: 349_000,
    badge: "پیشنهاد چاکود",
    features: ["نشان ویژه", "ظاهر برجسته در فهرست", "اولویت نمایش در نتایج مرتبط"],
  },
  {
    code: "story",
    title: "استوری منطقه‌ای",
    description: "آگهی در استوری کاربران محدوده مرتبط با آگهی نمایش داده می‌شود.",
    price: 690_000,
    badge: "دیده‌شدن محلی",
    features: ["نمایش در استوری", "هدف‌گیری موقعیت آگهی", "برچسب روشن تبلیغ"],
  },
];

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadListing() {
    if (!/^\d+$/.test(listingId)) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/listings/manage/${listingId}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<ManagerResponse>(response);

      if (response.status === 401 || response.status === 403) {
        window.location.assign(
          `/login?returnTo=${encodeURIComponent(`/account/listings/${listingId}/promote`)}`,
        );
        return;
      }

      if (!response.ok || !payload?.success) {
        setError(payload?.message || "اطلاعات آگهی دریافت نشد.");
        return;
      }

      const item = payload.listing || payload.data?.find((entry) => String(entry.id) === listingId) || payload.data?.[0];
      if (!item || String(item.id) !== listingId) {
        setError("این آگهی در حساب شما پیدا نشد.");
        return;
      }

      setListing(item);
    } catch {
      setError("ارتباط با سرویس آگهی برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListing();
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
            <p>مالکیت و وضعیت آگهی در حال بررسی است.</p>
          </section>
        )}

        {!loading && error && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>ارتقای آگهی در دسترس نیست</h1>
            <p>{error}</p>
            <button type="button" onClick={() => void loadListing()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && !error && listing && (
          <>
            <section className={styles.hero}>
              <div>
                <span>محصولات درآمدی آگهی</span>
                <h1>دیده‌شدن بیشتر برای «{listing.title || `آگهی شماره ${listing.id}`}»</h1>
                <p>
                  محصول مناسب را انتخاب کنید. سفارش به همین شناسه آگهی متصل می‌شود و فقط بعد از پرداخت موفق قابل اعمال است.
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

            <section className={styles.productGrid}>
              {products.map((product) => (
                <article
                  key={product.code}
                  className={`${styles.productCard} ${product.code === "featured" ? styles.featuredCard : ""}`}
                >
                  <span className={styles.badge}>{product.badge}</span>
                  <h2>{product.title}</h2>
                  <p>{product.description}</p>
                  <strong>{formatToman(product.price)}</strong>
                  <ul>
                    {product.features.map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                  <Link
                    href={`/account/payments/checkout?type=promotion&product=${product.code}&listing_id=${listing.id}`}
                  >
                    انتخاب و ادامه پرداخت
                  </Link>
                </article>
              ))}
            </section>

            <section className={styles.notice}>
              <strong>اعمال خودکار و قابل پیگیری</strong>
              <p>
                سفارش، پرداخت، فاکتور و شناسه آگهی در یک جریان ذخیره می‌شوند. وضعیت ارتقا از بخش پرداخت‌ها و مدیریت آگهی قابل پیگیری خواهد بود.
              </p>
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
