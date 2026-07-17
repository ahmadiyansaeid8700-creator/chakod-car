import Link from "next/link";
import SaveListingButton from "./SaveListingButton";
import styles from "./ListingCard.module.css";

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
  if (mileage === null || mileage === undefined) return "کارکرد نامشخص";
  if (Number(mileage) === 0) return "صفر کیلومتر";
  return `${new Intl.NumberFormat("fa-IR").format(Number(mileage))} کیلومتر`;
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

function CarPlaceholder() {
  return (
    <div className={styles.placeholder} aria-label="تصویر خودرو ثبت نشده است">
      <svg viewBox="0 0 160 80" aria-hidden="true">
        <path d="M24 53h112l-8-21c-2-5-7-8-12-8H55c-5 0-10 3-13 8L24 53Z" />
        <path d="M17 54h126v10H17z" />
        <circle cx="48" cy="65" r="10" />
        <circle cx="116" cy="65" r="10" />
        <path d="M52 30h55l10 23H38l14-23Z" />
      </svg>
      <span>تصویر خودرو در حال تکمیل است</span>
    </div>
  );
}

export default function ListingCard({
  listing,
  tone = "neutral",
  badge,
  variant = "grid",
}: ListingCardProps) {
  const href = `/listing/${listing.id}`;
  const imageUrl = getImageUrl(listing.cover_image);
  const sellerLabel = getSellerLabel(listing);
  const dealerVerified = Boolean(
    listing.dealer_verified || listing.is_dealer_verified,
  );
  const location = [listing.city, listing.neighborhood]
    .filter(Boolean)
    .join("، ");
  const displayBadge = badge || listing.category_name || "آگهی خودرو";

  const specs = [
    listing.production_year ? String(listing.production_year) : "سال نامشخص",
    formatMileage(listing.mileage_km),
    listing.transmission || listing.body_status || "مشخصات تکمیلی",
  ];

  return (
    <article
      className={`${styles.card} ${styles[tone]} ${styles[variant]}`}
    >
      <div className={styles.media}>
        <Link href={href} aria-label={`مشاهده آگهی ${listing.title}`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={listing.title}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <CarPlaceholder />
          )}
        </Link>

        <span className={styles.badge}>{displayBadge}</span>

        <SaveListingButton
          listingId={listing.id}
          compact
          className={styles.saveButton}
        />
      </div>

      <div className={styles.body}>
        <Link href={href} className={styles.mainLink}>
          <div className={styles.titleRow}>
            <h3>{listing.title}</h3>
            {listing.production_year ? (
              <span>{listing.production_year}</span>
            ) : null}
          </div>

          <div className={styles.vehicleName}>
            {[listing.brand, listing.model, listing.trim_name]
              .filter(Boolean)
              .join(" ") || "خودرو"}
          </div>

          <div className={styles.specs} aria-label="مشخصات اصلی خودرو">
            {specs.map((spec, index) => (
              <span key={`${listing.id}-${index}`}>{spec}</span>
            ))}
          </div>

          <div className={styles.location}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s7-5.15 7-12a7 7 0 1 0-14 0c0 6.85 7 12 7 12Z" />
              <circle cx="12" cy="9" r="2.35" />
            </svg>
            <span>{location || listing.province || "موقعیت نامشخص"}</span>
          </div>

          <strong className={styles.price}>
            {formatCompactPrice(listing.price_toman)}
          </strong>
        </Link>

        <div className={styles.footer}>
          <div className={styles.seller}>
            <span className={styles.avatar}>{sellerLabel.slice(0, 1)}</span>
            <span className={styles.sellerText}>
              <strong>{sellerLabel}</strong>
              <small>
                {dealerVerified
                  ? "نمایشگاه تأییدشده"
                  : listing.dealer_name
                    ? "فروشنده نمایشگاهی"
                    : "فروشنده شخصی"}
              </small>
            </span>
            {dealerVerified ? (
              <span className={styles.verified} title="نمایشگاه تأییدشده">
                ✓
              </span>
            ) : null}
          </div>

          <Link href={href} className={styles.viewLink}>
            مشاهده
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
