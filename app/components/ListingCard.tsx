import Link from "next/link";
import { formatDualYear } from "../../lib/date-display";
import SaveListingButton from "./SaveListingButton";
import ListingCardImage from "./ListingCardImage";
import ListingCardActions from "./ListingCardActions";
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
  showActions?: boolean;
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

export default function ListingCard({
  listing,
  tone = "neutral",
  badge,
  variant = "grid",
  showActions = false,
}: ListingCardProps) {
  const href = `/cars/${listing.id}`;
  const imageUrl = getImageUrl(listing.cover_image);
  const sellerLabel = getSellerLabel(listing);
  const sellerType = getSellerType(listing);
  const dealerVerified = Boolean(
    listing.dealer_verified || listing.is_dealer_verified,
  );
  const location = [listing.city, listing.neighborhood]
    .filter(Boolean)
    .join("، ");
  const displayBadge = badge || listing.category_name || "آگهی خودرو";
  const displayTitle = listing.title?.trim() || "آگهی خودرو";
  const vehicleName = [listing.brand, listing.model, listing.trim_name]
    .filter(Boolean)
    .join(" ") || "خودرو";
  const brandInitial = (listing.brand || listing.model || displayTitle)
    .trim()
    .slice(0, 1) || "چ";

  const specs = [
    { label: "سال", value: formatDualYear(listing.production_year) },
    { label: "کارکرد", value: formatMileage(listing.mileage_km) },
    {
      label: "گیربکس",
      value: formatSpec(listing.transmission || listing.body_status),
    },
  ];

  return (
    <article
      className={`${styles.card} ${styles[tone]} ${styles[variant]} ${
        showActions ? styles.withActions : ""
      }`}
    >
      <div className={styles.media}>
        <Link
          href={href}
          prefetch={false}
          aria-label={`مشاهده آگهی ${displayTitle}`}
        >
          <ListingCardImage src={imageUrl} alt={displayTitle} />
        </Link>

        <span className={styles.badge}>{displayBadge}</span>

        <SaveListingButton
          listingId={listing.id}
          compact
          className={styles.saveButton}
        />
      </div>

      <div className={styles.body}>
        <div className={styles.identityRow}>
          <span className={styles.brandMark} aria-hidden="true">
            {brandInitial}
          </span>

          <div className={styles.heading}>
            <Link href={href} prefetch={false} className={styles.titleLink}>
              {displayTitle}
            </Link>
            <span className={styles.vehicleName}>{vehicleName}</span>
          </div>
        </div>

        <div className={styles.meta} aria-label="اطلاعات آگهی">
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

        <div className={styles.specs} aria-label="مشخصات اصلی خودرو">
          {specs.map((spec) => (
            <span key={`${listing.id}-${spec.label}`}>
              <small>{spec.label}</small>
              <strong>{spec.value}</strong>
            </span>
          ))}
        </div>

        <strong className={styles.price}>
          {formatCompactPrice(listing.price_toman)}
        </strong>

        <div className={styles.seller}>
          <span className={styles.avatar}>{sellerLabel.slice(0, 1)}</span>
          <span className={styles.sellerText}>
            <strong>{sellerLabel}</strong>
            <small>
              {dealerVerified
                ? "نمایشگاه تأییدشده چاکود"
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

        {!showActions ? (
          <Link href={href} prefetch={false} className={styles.primaryAction}>
            <span>مشاهده آگهی</span>
            <ArrowIcon />
          </Link>
        ) : (
          <ListingCardActions
            listingId={listing.id}
            title={displayTitle}
            href={href}
          />
        )}
      </div>
    </article>
  );
}
