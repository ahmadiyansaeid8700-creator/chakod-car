"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type ListingStatus = {
  code?: string;
  title?: string;
  raw?: string;
};

type ListingImage = {
  image_id?: number;
  image_url?: string;
  is_cover?: boolean;
};

type ManagedListing = {
  id: number;
  title?: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  mileage_km?: string | number | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  category_code?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  status?: ListingStatus;
  cover_image?: ListingImage | null;
  images?: ListingImage[];
  image_count?: number;
  rejection_reason?: string | null;
  moderation_note?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ManagerResponse = {
  success?: boolean;
  message?: string;
  listing?: ManagedListing;
  data?: ManagedListing[];
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      }
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

function formatNumber(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("fa-IR") : "۰";
}

function formatPrice(value: number | string | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${number.toLocaleString("fa-IR")} تومان`;
}

function formatDate(value?: string) {
  if (!value) return "ثبت نشده";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function categoryTitle(code?: string) {
  const titles: Record<string, string> = {
    zero: "صفر و آماده تحویل",
    used: "کارکرده و کم‌کارکرد",
    preorder: "حواله و پیش‌فروش",
    freezone: "منطقه آزاد",
    classic: "کلاسیک و کلکسیونی",
  };

  return code ? titles[code] || code : "دسته‌بندی ثبت نشده";
}

function statusClass(code?: string) {
  if (code === "active") return styles.statusActive;
  if (code === "rejected") return styles.statusRejected;
  if (code === "sold") return styles.statusSold;
  if (["inactive", "expired", "deleted", "draft"].includes(code || "")) {
    return styles.statusInactive;
  }
  return styles.statusPending;
}

export default function ListingManagerClient({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<ManagedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const validId = /^\d+$/.test(listingId);

  async function loadListing() {
    if (!validId) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      const returnTo = `/account/listings/${listingId}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    try {
      const response = await fetch(`/api/auth/listings/manage/${listingId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<ManagerResponse>(response);

      if (response.status === 401 || response.status === 403) {
        const returnTo = `/account/listings/${listingId}`;
        window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      if (!response.ok || !payload?.success) {
        setError(payload?.message || "اطلاعات آگهی دریافت نشد.");
        return;
      }

      const directListing = payload.listing;
      const collectionListing = Array.isArray(payload.data)
        ? payload.data.find((item) => String(item.id) === listingId) || payload.data[0]
        : undefined;
      const nextListing = directListing || collectionListing || null;

      if (!nextListing || String(nextListing.id) !== listingId) {
        setError("این آگهی در فهرست آگهی‌های قابل مدیریت شما پیدا نشد.");
        return;
      }

      setListing(nextListing);
    } catch {
      setError("ارتباط با سرویس مدیریت آگهی برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListing();
  }, [listingId]);

  const locationLabel = useMemo(() => {
    return [listing?.province, listing?.city, listing?.neighborhood]
      .filter(Boolean)
      .join("، ") || "موقعیت ثبت نشده";
  }, [listing]);

  const rejectionText = listing?.rejection_reason || listing?.moderation_note || "";
  const coverImage = listing?.cover_image?.image_url || listing?.images?.find((image) => image.is_cover)?.image_url || listing?.images?.[0]?.image_url || "";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account/listings" className={styles.backLink}>← آگهی‌های من</Link>
          <Link href="/" className={styles.brand} aria-label="صفحه اصلی چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده‌سازی مدیریت آگهی</h1>
            <p>اطلاعات آگهی و وضعیت انتشار در حال دریافت است.</p>
          </section>
        )}

        {!loading && error && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>مدیریت آگهی در دسترس نیست</h1>
            <p>{error}</p>
            <div className={styles.stateActions}>
              <button type="button" onClick={() => void loadListing()}>تلاش دوباره</button>
              <Link href="/account/listings">بازگشت به آگهی‌ها</Link>
            </div>
          </section>
        )}

        {!loading && !error && listing && (
          <>
            <section className={styles.hero}>
              <div className={styles.heroContent}>
                <div className={styles.badgeRow}>
                  <span className={`${styles.statusBadge} ${statusClass(listing.status?.code)}`}>
                    {listing.status?.title || "در انتظار بررسی"}
                  </span>
                  <span>شناسه #{formatNumber(listing.id)}</span>
                  <span>{listing.listing_owner_type === "dealer" ? "نمایشگاهی" : "شخصی"}</span>
                </div>
                <h1>{listing.title || "آگهی بدون عنوان"}</h1>
                <p>
                  {[listing.brand, listing.model, listing.year].filter(Boolean).join("، ") ||
                    "مشخصات خودرو تکمیل نشده است."}
                </p>
              </div>
              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} href={`/account/listings/${listing.id}/edit`}>
                  ویرایش آگهی
                </Link>
                <Link className={styles.secondaryAction} href={`/cars/${listing.id}`}>
                  نمایش عمومی
                </Link>
              </div>
            </section>

            {rejectionText && listing.status?.code === "rejected" && (
              <section className={styles.rejectionCard}>
                <span>علت رد یا نیاز به اصلاح</span>
                <p>{rejectionText}</p>
                <Link href={`/account/listings/${listing.id}/edit`}>اصلاح آگهی</Link>
              </section>
            )}

            <section className={styles.contentGrid}>
              <article className={styles.previewCard}>
                <div className={styles.imageWrap}>
                  {coverImage ? (
                    <img src={coverImage} alt={listing.title || "تصویر خودرو"} />
                  ) : (
                    <div className={styles.imagePlaceholder}>بدون تصویر</div>
                  )}
                </div>
                <div className={styles.previewBody}>
                  <span>قیمت آگهی</span>
                  <strong>{formatPrice(listing.price_toman)}</strong>
                  <small>{locationLabel}</small>
                </div>
              </article>

              <section className={styles.summaryCard}>
                <header>
                  <span>خلاصه آگهی</span>
                  <h2>وضعیت و مشخصات</h2>
                </header>
                <dl>
                  <div><dt>دسته‌بندی</dt><dd>{categoryTitle(listing.category_code)}</dd></div>
                  <div><dt>کارکرد</dt><dd>{formatNumber(listing.mileage_km)} کیلومتر</dd></div>
                  <div><dt>تعداد تصاویر</dt><dd>{formatNumber(listing.image_count || listing.images?.length || 0)}</dd></div>
                  <div><dt>فروشنده</dt><dd>{listing.seller_display_name || "مالک آگهی"}</dd></div>
                  <div><dt>تاریخ ثبت</dt><dd>{formatDate(listing.created_at)}</dd></div>
                  <div><dt>آخرین ویرایش</dt><dd>{formatDate(listing.updated_at)}</dd></div>
                </dl>
              </section>
            </section>

            <section className={styles.actionGrid} aria-label="عملیات آگهی">
              <Link href={`/account/listings/${listing.id}/edit`}>
                <span>✎</span>
                <strong>ویرایش مشخصات</strong>
                <small>عنوان، قیمت، موقعیت و توضیحات</small>
              </Link>
              <Link href={`/account/listings/${listing.id}/images`}>
                <span>▧</span>
                <strong>مدیریت تصاویر</strong>
                <small>آپلود، حذف و انتخاب تصویر اصلی</small>
              </Link>
              <Link href={`/account/listings/${listing.id}/promote`} className={styles.promoteAction}>
                <span>★</span>
                <strong>ارتقای آگهی</strong>
                <small>بالابر، ویژه و استوری منطقه‌ای</small>
              </Link>
              <Link href={`/cars/${listing.id}`}>
                <span>↗</span>
                <strong>مشاهده آگهی</strong>
                <small>نمایش نسخه عمومی برای خریداران</small>
              </Link>
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
