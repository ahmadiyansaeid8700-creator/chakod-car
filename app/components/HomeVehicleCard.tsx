"use client";

import Link from "next/link";
import ListingCard, { type ListingCardData } from "./ListingCard";
import styles from "./HomeVehicleCard.module.css";

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
  return <ListingCard listing={listing} tone={tone} badge={badge} variant="rail" />;
}

export function HomeVehicleCardFallback({
  tone,
  href,
  status,
  locationLabel,
  index,
}: FallbackProps) {
  const loading = status === "loading";

  if (loading) {
    return (
      <article
        className={`${styles.loadingCard} ${styles[tone]}`}
        aria-live={index === 0 ? "polite" : undefined}
        aria-label="در حال دریافت آگهی‌ها"
      >
        <span className={styles.loadingMedia} aria-hidden="true" />
        <div className={styles.loadingBody} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </article>
    );
  }

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
