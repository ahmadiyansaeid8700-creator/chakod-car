"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DealerShareActions from "./DealerShareActions";
import styles from "./ShowroomCard.module.css";

const API_BASE = "https://api.chakod.com";
const SITE_BASE = "https://chakod.com";

export type ShowroomCardData = {
  key: string;
  name: string;
  city: string;
  province?: string;
  listingCount: number;
  logoUrl?: string | null;
  coverImage?: string | null;
  verified?: boolean;
};

type ShowroomCardProps = {
  showroom: ShowroomCardData;
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
  const clean = name.trim();
  return clean ? clean.slice(0, 1) : "چ";
}

export default function ShowroomCard({ showroom }: ShowroomCardProps) {
  const href = `/showrooms/${encodeURIComponent(showroom.name)}`;
  const logoUrl = getImageUrl(showroom.logoUrl);
  const coverUrl = getImageUrl(showroom.coverImage);
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [coverUrl]);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  const location = [showroom.city, showroom.province]
    .filter(Boolean)
    .filter((item, index, values) => values.indexOf(item) === index)
    .join("، ");

  const showCover = Boolean(coverUrl) && !coverFailed;
  const showLogo = Boolean(logoUrl) && !logoFailed;
  const formattedCount = new Intl.NumberFormat("fa-IR").format(showroom.listingCount);

  return (
    <article className={styles.card}>
      <Link
        className={styles.cover}
        href={href}
        aria-label={`مشاهده ویترین نمایشگاه ${showroom.name}`}
      >
        {showCover ? (
          <img
            className={styles.coverImage}
            src={coverUrl}
            alt={`یکی از خودروهای ${showroom.name}`}
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className={styles.coverPlaceholder} aria-hidden="true">
            <span className={styles.placeholderGlow} />
            <svg viewBox="0 0 220 110">
              <path d="M38 72h145l-12-29c-3-8-11-13-20-13H79c-10 0-18 5-22 13L38 72Z" />
              <path d="M25 72h173v14H25z" />
              <path d="M71 43h79" />
              <circle cx="70" cy="86" r="13" />
              <circle cx="158" cy="86" r="13" />
            </svg>
          </div>
        )}

        <span className={styles.coverEyebrow}>ویترین خودرو</span>
        <span
          className={`${styles.status} ${
            showroom.verified ? styles.verified : styles.active
          }`}
        >
          <i aria-hidden="true" />
          {showroom.verified ? "تأییدشده چاکود" : "فعال در چاکود"}
        </span>
      </Link>

      <div className={styles.body}>
        <div className={styles.identity}>
          <span className={styles.logo} aria-hidden={!showLogo}>
            {showLogo ? (
              <img
                src={logoUrl}
                alt={`لوگوی ${showroom.name}`}
                loading="lazy"
                decoding="async"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              getInitial(showroom.name)
            )}
          </span>

          <div className={styles.nameBlock}>
            <Link href={href}>{showroom.name}</Link>
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
                <circle cx="12" cy="9" r="2.4" />
              </svg>
              {location || "موقعیت ثبت نشده"}
            </span>
          </div>
        </div>

        <p className={styles.description}>
          خودروهای فعال این نمایشگاه را در ویترین عمومی چاکود ببینید و مقایسه کنید.
        </p>

        <div className={styles.meta}>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 15.5 6.2 9a3 3 0 0 1 2.8-2h6a3 3 0 0 1 2.8 2l2.2 6.5" />
              <path d="M3 15.5h18V19H3z" />
              <circle cx="7" cy="19" r="2" />
              <circle cx="17" cy="19" r="2" />
            </svg>
            <b>{formattedCount}</b>
            خودروی فعال
          </span>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4h14v16H5z" />
              <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
            ویترین عمومی
          </span>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={href}>
            مشاهده نمایشگاه
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <DealerShareActions
            dealerName={showroom.name}
            city={showroom.city}
            href={href}
          />
        </div>
      </div>
    </article>
  );
}
