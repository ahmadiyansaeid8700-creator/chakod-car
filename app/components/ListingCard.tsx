/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import Link from "next/link";
import { formatDualYear } from "../../lib/date-display";
import SaveListingButton from "./SaveListingButton";
import ListingCardImage from "./ListingCardImage";
import ListingCardActions from "./ListingCardActions";
import styles from "./ListingCard.module.css";
import unified from "./UnifiedVehicleCard.module.css";

const API_BASE = "https://api.chakod.com";
const SITE_BASE = "https://chakod.com";

export type ListingCardData = {
  id: number | string;
  title: string;
  brand?: string | null;
  model?: string | null;
  trim_name?: string | null;
  production_year?: number | null;
  mileage_km?: number | null;
  price_toman?: number | null;
  province?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  body_status?: string | null;
  transmission?: string | null;
  seller_type?: string | null;
  dealer_name?: string | null;
  dealer_logo_url?: string | null;
  dealer_logo?: string | null;
  logo_url?: string | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  category_name?: string | null;
  cover_image?: string | null;
  views_count?: number | null;
};

type ListingCardProps = {
  listing: ListingCardData;
  tone?: "luxury" | "freezone" | "economic" | "neutral";
  badge?: string;
  variant?: "rail" | "grid";
  showActions?: boolean;
  showSave?: boolean;
  href?: string;
  identityName?: string;
  identityDetail?: string;
  identityVerified?: boolean;
  customActions?: ReactNode;
};

const SPEC_LABELS: Record<string, string> = {
  automatic: "اتوماتیک",
  auto: "اتوماتیک",
  at: "اتوماتیک",
  manual: "دستی",
  mt: "دستی",
  clean: "بدون رنگ",
  original: "بدون رنگ",
  painted: "رنگ‌شده",
  accident: "تصادفی",
  damaged: "آسیب‌دیده",
};

function getImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads/") || path.startsWith("uploads/")) {
    return `${SITE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatCompactPrice(price?: number | null) {
  const value = Number(price || 0);
  if (!value) return "قیمت توافقی";
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیارد تومان`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} میلیون تومان`;
  }
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function formatMileage(mileage?: number | null) {
  if (mileage === null || mileage === undefined) return "نامشخص";
  if (Number(mileage) === 0) return "صفر کیلومتر";
  return `${new Intl.NumberFormat("fa-IR").format(Number(mileage))} کیلومتر`;
}

function formatSpec(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || "";
  return SPEC_LABELS[normalized] || value?.trim() || "نامشخص";
}

function getSellerLabel(listing: ListingCardData) {
  if (listing.dealer_name?.trim()) return listing.dealer_name.trim();
  const labels: Record<string, string> = {
    personal: "فروشنده شخصی",
    dealer: "فروشنده نمایشگاهی",
    showroom: "فروشنده نمایشگاهی",
    freezone_operator: "فعال منطقه آزاد",
  };
  return labels[listing.seller_type || ""] || "فروشنده چاکود";
}

function getSellerType(listing: ListingCardData) {
  if (listing.dealer_name?.trim()) return listing.dealer_name.trim();
  if (listing.seller_type === "dealer") return "نمایشگاه خودرو";
  if (listing.seller_type === "freezone_operator") return "فعال منطقه آزاد";
  return "فروشنده شخصی";
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5.15 7-12a7 7 0 1 0-14 0c0 6.85 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.35" />
    </svg>
  );
}

function SellerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-4.2 3.1-6.3 7-6.3s6.3 2.1 7 6.3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18 9 12l6-6" />
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

export default function ListingCard({
  listing,
  tone = "neutral",
  badge,
  variant = "grid",
  showActions = false,
  showSave = true,
  href: hrefOverride,
  identityName,
  identityDetail,
  identityVerified,
  customActions,
}: ListingCardProps) {
  const href = hrefOverride || `/cars/${listing.id}`;
  const imageUrl = getImageUrl(listing.cover_image);
  const logoUrl = getImageUrl(
    listing.dealer_logo_url || listing.dealer_logo || listing.logo_url,
  );
  const sellerLabel = identityName?.trim() || getSellerLabel(listing);
  const sellerType = identityName?.trim() || getSellerType(listing);
  const dealerVerified = identityVerified ?? Boolean(listing.dealer_verified || listing.is_dealer_verified);
  const sellerDetail = identityDetail?.trim() || (dealerVerified
    ? "نمایشگاه تأییدشده چاکود"
    : listing.dealer_name
      ? "فروشنده نمایشگاهی"
      : "فروشنده شخصی");
  const location = [listing.city, listing.neighborhood].filter(Boolean).join("، ");
  const displayBadge = badge || listing.category_name || "آگهی خودرو";
  const displayTitle = listing.title?.trim() || "آگهی خودرو";
  const vehicleName = [listing.brand, listing.model, listing.trim_name].filter(Boolean).join(" ") || "خودرو";
  const specs = [
    { label: "سال", value: formatDualYear(listing.production_year) },
    { label: "کارکرد", value: formatMileage(listing.mileage_km) },
    { label: "گیربکس", value: formatSpec(listing.transmission || listing.body_status) },
  ];

  return (
    <article className={`${styles.card} ${styles[tone]} ${styles[variant]} ${showActions ? styles.withActions : ""} ${unified.card} ${customActions ? unified.managedCard : ""}`}>
      <div className={styles.media} data-part="media">
        <Link href={href} prefetch={false} aria-label={`مشاهده آگهی ${displayTitle}`}>
          <ListingCardImage src={imageUrl} alt={displayTitle} />
        </Link>
        <span className={styles.badge} data-part="badge">{displayBadge}</span>
        {showSave ? (
          <SaveListingButton listingId={listing.id} compact className={styles.saveButton} />
        ) : null}
      </div>

      <div className={styles.body} data-part="body">
        <div className={styles.identityRow} data-part="identity">
          <span className={styles.brandMark} data-part="brand-mark" aria-hidden="true">
            {logoUrl ? <img src={logoUrl} alt="" loading="lazy" decoding="async" /> : <CarIcon />}
          </span>
          <div className={styles.heading} data-part="heading">
            <Link href={href} prefetch={false} className={styles.titleLink}>{displayTitle}</Link>
            <span className={styles.vehicleName} data-part="vehicle-name">{vehicleName}</span>
          </div>
        </div>

        <div className={styles.meta} data-part="meta" aria-label="اطلاعات آگهی">
          <span className={styles.metaItem}>
            <LocationIcon />
            <b>{location || listing.province || "موقعیت نامشخص"}</b>
          </span>
          <i className={styles.metaDivider} aria-hidden="true" />
          <span className={styles.metaItem} title={sellerType}>
            <SellerIcon />
            <b>{sellerType}</b>
          </span>
        </div>

        <div className={styles.specs} data-part="specs" aria-label="مشخصات اصلی خودرو">
          {specs.map((spec) => (
            <span key={`${listing.id}-${spec.label}`}>
              <small>{spec.label}</small>
              <strong>{spec.value}</strong>
            </span>
          ))}
        </div>

        <strong className={styles.price} data-part="price">{formatCompactPrice(listing.price_toman)}</strong>

        {!customActions ? (
          <div className={styles.seller} data-part="seller">
            <span className={styles.avatar} data-part="seller-avatar">{sellerLabel.slice(0, 1)}</span>
            <span className={styles.sellerText}>
              <strong data-part="seller-name">{sellerLabel}</strong>
              <small data-part="seller-detail">{sellerDetail}</small>
            </span>
            {dealerVerified ? <span className={styles.verified} data-part="verified" title="تأییدشده">✓</span> : null}
          </div>
        ) : null}

        {customActions ? (
          <div className={unified.customActions} data-part="custom-actions">{customActions}</div>
        ) : !showActions ? (
          <div className={unified.publicActions} data-part="public-actions">
            <Link href={href} prefetch={false} className={styles.primaryAction}>
              <span>مشاهده آگهی</span>
              <ArrowIcon />
            </Link>
          </div>
        ) : (
          <div className={unified.publicActions} data-part="public-actions">
            <ListingCardActions listingId={listing.id} title={displayTitle} href={href} />
          </div>
        )}
      </div>
    </article>
  );
}
