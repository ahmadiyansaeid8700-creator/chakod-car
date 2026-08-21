"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import DealerShareActions from "./DealerShareActions";
import styles from "./ShowroomCard.module.css";

const API_BASE = "https://api.chakod.com";
const SITE_BASE = "https://chakod.com";

export type ShowroomListingPreview = {
  id: number | string;
  title: string;
  image?: string | null;
};

export type ShowroomCardData = {
  key: string;
  href?: string;
  slug?: string | null;
  name: string;
  city: string;
  province?: string;
  listingCount: number;
  logoUrl?: string | null;
  coverImage?: string | null;
  coverImageDesktop?: string | null;
  coverImageMobile?: string | null;
  verified?: boolean;
  featured?: boolean;
  latestListings?: ShowroomListingPreview[];
};

type ShowroomCardProps = {
  showroom: ShowroomCardData;
  density?: "default" | "compact";
};

function getImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/") || path.startsWith("uploads/")) {
    return `${SITE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "چ";
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

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5 7-12a7 7 0 1 0-14 0c0 7 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.3" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2.7 2.1 1.7 2.7-.1.8 2.6 2.2 1.5-.9 2.6.9 2.5-2.2 1.5-.8 2.6-2.7-.1-2.1 1.7-2.1-1.7-2.7.1-.8-2.6-2.2-1.5.9-2.5-.9-2.6L6.4 7l.8-2.6 2.7.1L12 2.7Z" />
      <path d="m8.6 11.3 2.1 2.1 4.7-4.8" />
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

function ListingThumbnail({ listing }: { listing: ShowroomListingPreview }) {
  const imageUrl = getImageUrl(listing.image);
  const [failedUrl, setFailedUrl] = useState("");
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <a
      className={styles.latestListing}
      href={`/cars/${listing.id}`}
      aria-label={`مشاهده آگهی ${listing.title}`}
      title={listing.title}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={listing.title}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <span className={styles.listingPlaceholder} aria-hidden="true">
          <CarIcon />
        </span>
      )}
    </a>
  );
}

export default function ShowroomCard({ showroom, density = "default" }: ShowroomCardProps) {
  const href = showroom.href || (showroom.slug
    ? `/businesses/${encodeURIComponent(showroom.slug)}`
    : `/businesses?type=dealer&q=${encodeURIComponent(showroom.name)}`);
  const desktopCoverUrl = getImageUrl(showroom.coverImageDesktop || showroom.coverImage);
  const mobileCoverUrl = getImageUrl(
    showroom.coverImageMobile || showroom.coverImageDesktop || showroom.coverImage,
  );
  const logoUrl = getImageUrl(showroom.logoUrl);
  const [failedCoverUrl, setFailedCoverUrl] = useState("");
  const [failedLogoUrl, setFailedLogoUrl] = useState("");

  const showCover = Boolean(desktopCoverUrl || mobileCoverUrl) && failedCoverUrl !== (desktopCoverUrl || mobileCoverUrl);
  const showLogo = Boolean(logoUrl) && failedLogoUrl !== logoUrl;
  const latestListings = (showroom.latestListings || []).slice(0, 3);
  const thumbnailSlots = Array.from({ length: 3 }, (_, index) => latestListings[index] || null);
  const location = [showroom.city, showroom.province]
    .filter(Boolean)
    .filter((item, index, values) => values.indexOf(item) === index)
    .join("، ");
  const formattedCount = new Intl.NumberFormat("fa-IR").format(showroom.listingCount);

  return (
    <article className={`${styles.card} ${density === "compact" ? styles.compact : ""}`}>
      <div className={styles.cover}>
        <a className={styles.coverLink} href={href} aria-label={`مشاهده نمایشگاه ${showroom.name}`}>
          {showCover ? (
            <picture>
              {mobileCoverUrl ? <source media="(max-width: 780px)" srcSet={mobileCoverUrl} /> : null}
              <img
                className={styles.coverImage}
                src={desktopCoverUrl || mobileCoverUrl}
                alt={`ویترین خودروهای ${showroom.name}`}
                loading="lazy"
                decoding="async"
                onError={() => setFailedCoverUrl(desktopCoverUrl || mobileCoverUrl)}
              />
            </picture>
          ) : (
            <span className={styles.coverPlaceholder} aria-hidden="true">
              <span />
              <CarIcon />
            </span>
          )}
        </a>

        <span
          className={`${styles.statusBadge} ${
            showroom.featured ? styles.featuredBadge : styles.activeBadge
          }`}
        >
          {showroom.featured ? "منتخب" : "فعال"}
        </span>

        <div className={styles.shareAction}>
          <DealerShareActions dealerName={showroom.name} city={showroom.city} href={href} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.logoWrap}>
          <a className={styles.logo} href={href} aria-label={`صفحه ${showroom.name}`}>
            {showLogo ? (
              <img
                src={logoUrl}
                alt={`لوگوی ${showroom.name}`}
                loading="lazy"
                decoding="async"
                onError={() => setFailedLogoUrl(logoUrl)}
              />
            ) : (
              <span aria-hidden="true">{getInitial(showroom.name)}</span>
            )}
          </a>
        </div>

        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <a href={href}>{showroom.name}</a>
            {showroom.verified ? (
              <span className={styles.verifiedMark} title="تأییدشده در چاکود">
                <VerifiedIcon />
              </span>
            ) : null}
          </div>
          <p>نمایشگاه خودرو</p>
        </div>

        <div className={styles.meta} aria-label="اطلاعات نمایشگاه">
          <span title={location || "موقعیت ثبت نشده"}>
            <LocationIcon />
            <b>{location || "موقعیت ثبت نشده"}</b>
          </span>
          <i aria-hidden="true" />
          <span>
            <CarIcon />
            <b>{formattedCount} آگهی</b>
          </span>
        </div>

        <div className={styles.latestGrid} aria-label={`خودروهای منتخب ${showroom.name}`}>
          {thumbnailSlots.map((listing, index) =>
            listing ? (
              <ListingThumbnail key={listing.id} listing={listing} />
            ) : (
              <span className={styles.emptyListing} key={`empty-${index}`} aria-hidden="true">
                <CarIcon />
              </span>
            ),
          )}
        </div>

        <a className={styles.primaryAction} href={href}>
          <span>مشاهده نمایشگاه</span>
          <ArrowIcon />
        </a>
      </div>
    </article>
  );
}
