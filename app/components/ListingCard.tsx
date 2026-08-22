import Link from "next/link";
import SaveListingButton from "./SaveListingButton";
import ListingCardImage from "./ListingCardImage";
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
  const sellerLogoUrl = getImageUrl(
    listing.dealer_logo_url || listing.dealer_logo || listing.logo_url,
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
        <Link href={href} prefetch={false} aria-label={`مشاهده آگهی ${listing.title}`}>
          <ListingCardImage src={imageUrl} alt={listing.title} />
        </Link>

        <span className={styles.badge}>{displayBadge}</span>

        <SaveListingButton
          listingId={listing.id}
          compact
          className={styles.saveButton}
        />

        <span className={styles.mobileLogo} aria-hidden="true">
          {sellerLogoUrl ? (
            <img src={sellerLogoUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <svg viewBox="0 0 32 24">
              <path d="M5 14h22l-2-6c-.6-1.7-2.2-3-4-3H11c-1.8 0-3.4 1.3-4 3l-2 6Z" />
              <path d="M3 14h26v4H3z" />
              <circle cx="9" cy="19" r="3" />
              <circle cx="23" cy="19" r="3" />
            </svg>
          )}
        </span>
      </div>

      <div className={styles.body}>
        <Link href={href} prefetch={false} className={styles.mainLink}>
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
            <span className={styles.avatar}>
              {sellerLogoUrl ? (
                <img src={sellerLogoUrl} alt="" loading="lazy" decoding="async" />
              ) : (
                <svg viewBox="0 0 32 24" aria-hidden="true">
                  <path d="M5 14h22l-2-6c-.6-1.7-2.2-3-4-3H11c-1.8 0-3.4 1.3-4 3l-2 6Z" />
                  <path d="M3 14h26v4H3z" />
                  <circle cx="9" cy="19" r="3" />
                  <circle cx="23" cy="19" r="3" />
                </svg>
              )}
            </span>
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

          <Link href={href} prefetch={false} className={styles.viewLink}>
            مشاهده
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
