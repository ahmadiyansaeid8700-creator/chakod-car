"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDualYear } from "../../lib/date-display";
import SaveListingButton from "./SaveListingButton";
import type { ListingCardData } from "./ListingCard";
import styles from "./HomeVehicleCard.module.css";

const API_BASE = "https://api.chakod.com";
const SITE_BASE = "https://chakod.com";

type Tone = "luxury" | "freezone";
type LoadStatus = "loading" | "ready" | "error";

type Props = {
  listing: ListingCardData;
  tone: Tone;
  badge: string;
};

type FallbackProps = {
  tone: Tone;
  href: string;
  status: LoadStatus;
  locationLabel: string;
  index: number;
};

const SPEC_LABELS: Record<string, string> = {
  automatic: "اتوماتیک",
  auto: "اتوماتیک",
  at: "اتوماتیک",
  manual: "دستی",
  mt: "دستی",
  clean: "بدون رنگ",
  original: "بدون رنگ",
  painted: "رنگ شدگی",
  accident: "تصادفی",
  damaged: "آسیب دیده",
};

function getImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/") || path.startsWith("uploads/")) {
    return `${SITE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatPrice(price?: number | null) {
  const value = Number(price || 0);
  if (!value) return "قیمت توافقی";

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function formatMileage(mileage?: number | null) {
  if (mileage === null || mileage === undefined) return "نامشخص";
  if (Number(mileage) === 0) return "صفر";
  return new Intl.NumberFormat("fa-IR").format(Number(mileage));
}

function formatSpec(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || "";
  return SPEC_LABELS[normalized] || value?.trim() || "نامشخص";
}

function sellerLabel(listing: ListingCardData) {
  if (listing.dealer_name?.trim()) return listing.dealer_name.trim();

  const labels: Record<string, string> = {
    personal: "فروشنده شخصی",
    dealer: "فروشنده نمایشگاهی",
    showroom: "فروشنده نمایشگاهی",
    freezone_operator: "فعال منطقه آزاد",
  };

  return labels[listing.seller_type || ""] || "فروشنده چاکود";
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5.15 7-12a7 7 0 1 0-14 0c0 6.85 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.35" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 15 2.3-6.2A2.8 2.8 0 0 1 8.9 7h6.2a2.8 2.8 0 0 1 2.6 1.8L20 15" />
      <path d="M3 15h18v4H3z" />
      <circle cx="7" cy="19" r="1.8" />
      <circle cx="17" cy="19" r="1.8" />
    </svg>
  );
}

export default function HomeVehicleCard({ listing, tone, badge }: Props) {
  const href = `/cars/${listing.id}`;
  const imageUrl = getImageUrl(listing.cover_image);
  const [failedImage, setFailedImage] = useState(false);
  const showImage = Boolean(imageUrl) && !failedImage;
  const seller = sellerLabel(listing);
  const verified = Boolean(
    listing.dealer_verified || listing.is_dealer_verified,
  );
  const location = [listing.neighborhood, listing.city, listing.province]
    .filter(Boolean)
    .join("، ");
  const title = listing.title?.trim() || "آگهی خودرو";
  const vehicleName = [listing.brand, listing.model, listing.trim_name]
    .filter(Boolean)
    .join(" ");
  const brandInitial = String(listing.brand || listing.model || "چ")
    .trim()
    .slice(0, 1);

  return (
    <article className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.media}>
        <Link href={href} prefetch={false} aria-label={`مشاهده آگهی ${title}`}>
          {showImage ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              onError={() => setFailedImage(true)}
            />
          ) : (
            <span className={styles.imageFallback} aria-hidden="true">
              <CarIcon />
              <small>تصویر خودرو</small>
            </span>
          )}
        </Link>

        <span className={styles.badge}>{badge}</span>
        <SaveListingButton
          listingId={listing.id}
          compact
          className={styles.saveButton}
        />
      </div>

      <div className={styles.body}>
        <span className={styles.brandMark} aria-hidden="true">
          {brandInitial || "چ"}
        </span>

        <div className={styles.heading}>
          <Link href={href} prefetch={false}>
            {title}
          </Link>
          <p>{vehicleName || "خودرو"}</p>
        </div>

        <div className={styles.meta}>
          <span title={location || "موقعیت نامشخص"}>
            <LocationIcon />
            <b>{location || "موقعیت نامشخص"}</b>
          </span>
          <i aria-hidden="true" />
          <span title={seller}>
            <CarIcon />
            <b>{listing.dealer_name?.trim() || (listing.dealer_name ? "نمایشگاهی" : "شخصی")}</b>
          </span>
        </div>

        <div className={styles.specGrid} aria-label="مشخصات اصلی خودرو">
          <span>
            <small>سال</small>
            <b>{formatDualYear(listing.production_year)}</b>
          </span>
          <span>
            <small>کارکرد</small>
            <b>{formatMileage(listing.mileage_km)}</b>
          </span>
          <span>
            <small>گیربکس</small>
            <b>{formatSpec(listing.transmission || listing.body_status)}</b>
          </span>
        </div>

        <strong className={styles.price}>{formatPrice(listing.price_toman)}</strong>

        <div className={styles.seller}>
          <span className={styles.sellerAvatar}>{seller.slice(0, 1)}</span>
          <span className={styles.sellerCopy}>
            <strong>{seller}</strong>
            <small>
              {verified
                ? "نمایشگاه تأیید شده"
                : listing.dealer_name
                  ? "فروشنده نمایشگاهی"
                  : "فروشنده شخصی"}
            </small>
          </span>
          {verified ? (
            <span className={styles.verified} title="نمایشگاه تأیید شده">
              ✓
            </span>
          ) : null}
        </div>

        <Link className={styles.primaryAction} href={href} prefetch={false}>
          <span>مشاهده آگهی</span>
          <span aria-hidden="true">←</span>
        </Link>
      </div>
    </article>
  );
}

export function HomeVehicleCardFallback({
  tone,
  href,
  status,
  locationLabel,
  index,
}: FallbackProps) {
  const loading = status === "loading";
  const title = loading ? "در حال دریافت آگهی‌ها" : "آگهی فعالی پیدا نشد";
  const description = loading
    ? `آگهی‌های ${locationLabel} در حال بارگذاری هستند.`
    : `فعلاً آگهی فعالی برای ${locationLabel} در این بخش ثبت نشده است.`;

  return (
    <article
      className={`${styles.card} ${styles[tone]} ${styles.fallback}`}
      aria-live={index === 0 ? "polite" : undefined}
    >
      <div className={styles.fallbackMedia} aria-hidden="true">
        <CarIcon />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className={styles.fallbackBody}>
        <span className={styles.fallbackBadge}>
          {tone === "luxury" ? "خودروهای لوکس" : "منطقه آزاد"}
        </span>
        <strong>{title}</strong>
        <p>{description}</p>

        <div className={styles.fallbackSpecs} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <Link className={styles.primaryAction} href={href}>
          <span>مشاهده همه آگهی‌ها</span>
          <span aria-hidden="true">←</span>
        </Link>
      </div>
    </article>
  );
}
