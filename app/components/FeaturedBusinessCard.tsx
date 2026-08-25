"use client";

import Link from "next/link";

import styles from "./FeaturedBusinessCard.module.css";

export type FeaturedBusinessType = "car_service" | "parts_store" | "repair_shop";

export type FeaturedBusinessCardData = {
  id: number;
  name: string;
  businessType: FeaturedBusinessType;
  businessTypeTitle?: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  logoUrl?: string;
  coverUrl?: string;
  categoryLabels?: string[];
  services?: string[];
  mobileService?: boolean;
  priceRangeText?: string;
  verified?: boolean;
};

const kickerByType: Record<FeaturedBusinessType, string> = {
  repair_shop: "تعمیرکاران",
  parts_store: "لوازم یدکی",
  car_service: "خدمات خودرویی",
};

export default function FeaturedBusinessCard({
  business,
  href,
}: {
  business: FeaturedBusinessCardData;
  href: string;
}) {
  const kicker = business.businessTypeTitle || kickerByType[business.businessType];
  const tags = Array.from(new Set([...(business.categoryLabels || []), ...(business.services || [])].filter(Boolean)));
  const primaryService = tags[0] || "تخصصی";
  const specs = [
    { label: business.businessType === "parts_store" ? "نوع قطعات" : "تخصص اصلی", value: primaryService },
    { label: business.businessType === "parts_store" ? "ارسال" : "خدمات در محل", value: business.mobileService ? "دارد" : "حضوری" },
    { label: "محدوده قیمت", value: business.priceRangeText || "استعلام" },
  ];
  const location = [business.neighborhood, business.city, business.province].filter(Boolean).join("، ");

  return (
    <Link className={`${styles.card} ${styles[business.businessType]}`} href={href}>
      <span className={styles.media}>
        <span className={styles.coverFallback} aria-hidden="true">{business.name.slice(0, 1)}</span>
        {business.coverUrl ? <img src={business.coverUrl} alt="" loading="lazy" decoding="async" /> : null}
        <span className={styles.type}>{kicker}</span>
        {business.verified ? <em>تأیید چاکود</em> : null}
      </span>
      <span className={styles.copy}>
        <span className={styles.heading}>
          <span className={styles.identity}>
            <b>{business.name.slice(0, 1)}</b>
            {business.logoUrl ? <img src={business.logoUrl} alt="" loading="lazy" decoding="async" /> : null}
          </span>
          <span>
            <strong>{business.name}</strong>
            <small>{kicker}{business.verified ? " · تأییدشده چاکود" : ""}</small>
          </span>
        </span>
        <small className={styles.address}><span aria-hidden="true">⌖</span>{location || "موقعیت ثبت نشده"}</small>
        <span className={styles.specs} aria-label="مشخصات اصلی کسب‌وکار">
          {specs.map((spec) => <span key={spec.label}><small>{spec.label}</small><strong>{spec.value}</strong></span>)}
        </span>
        <b className={styles.cta}>مشاهده پروفایل <span aria-hidden="true">←</span></b>
      </span>
    </Link>
  );
}
