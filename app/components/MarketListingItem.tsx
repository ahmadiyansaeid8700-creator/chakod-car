import Link from "next/link";
import ListingCard from "./ListingCard";
import ListingCardImage from "./ListingCardImage";
import SaveListingButton from "./SaveListingButton";
import type { CatalogListing } from "../ads/[segment]/catalog-types";
import styles from "./MarketListingItem.module.css";

const API_BASE = "https://api.chakod.com";
const SITE_BASE = "https://chakod.com";

type Props = {
  listing: CatalogListing;
  tone: "luxury" | "freezone" | "economic" | "neutral";
  badge: string;
};

function getImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
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

function formatYear(year?: number | null) {
  if (!year) return "سال نامشخص";
  return `مدل ${new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(year)}`;
}

function formatMileage(mileage?: number | null) {
  if (mileage === null || mileage === undefined) return "کارکرد نامشخص";
  if (Number(mileage) === 0) return "صفر کیلومتر";
  return `${new Intl.NumberFormat("fa-IR").format(Number(mileage))} کیلومتر`;
}

function sellerLabel(listing: CatalogListing) {
  if (listing.dealer_name?.trim()) return listing.dealer_name.trim();
  if (listing.seller_type === "dealer") return "نمایشگاه خودرو";
  if (listing.seller_type === "freezone_operator") return "فعال منطقه آزاد";
  return "فروشنده شخصی";
}

export default function MarketListingItem({ listing, tone, badge }: Props) {
  const href = `/cars/${listing.id}`;
  const title = listing.title?.trim() || "آگهی خودرو";
  const vehicleName = [listing.brand, listing.model, listing.trim_name]
    .filter(Boolean)
    .join(" ");
  const location = [listing.city, listing.neighborhood]
    .filter(Boolean)
    .join("، ") || listing.province || "موقعیت نامشخص";
  const imageUrl = getImageUrl(listing.cover_image);

  return (
    <>
      <div className={styles.desktopOnly}>
        <ListingCard
          listing={listing}
          tone={tone}
          badge={badge}
          variant="grid"
          showActions
        />
      </div>

      <article
        className={styles.mobileOnly}
        style={{ borderRadius: 0, boxShadow: "none", transform: "none" }}
      >
        <Link
          href={href}
          prefetch={false}
          className={styles.rowLink}
          aria-label={`مشاهده آگهی ${title}`}
        >
          <div className={styles.copy}>
            <h3 className={styles.title}>{title}</h3>
            {vehicleName ? <span className={styles.vehicleName}>{vehicleName}</span> : null}
            <span className={styles.facts}>
              {formatYear(listing.production_year)} · {formatMileage(listing.mileage_km)}
            </span>
            <span className={styles.location}>{location}</span>
            <strong className={styles.price}>{formatPrice(listing.price_toman)}</strong>
            <span className={styles.seller}>{sellerLabel(listing)}</span>
          </div>

          <div className={styles.media}>
            <ListingCardImage src={imageUrl} alt={title} />
            <span className={styles.segmentBadge}>{badge}</span>
          </div>
        </Link>

        <SaveListingButton
          listingId={listing.id}
          compact
          className={styles.saveButton}
        />
      </article>
    </>
  );
}
