"use client";

import { useState } from "react";
import styles from "./ListingCard.module.css";

type Props = {
  src: string;
  alt: string;
};

const API_ORIGIN = "https://api.chakod.com";

function normalizeImageSrc(value: string) {
  const src = String(value || "").trim();
  if (!src) return "";

  if (/^https?:\/\/(?:www\.)?chakod\.com\/uploads\//i.test(src)) {
    return src.replace(
      /^https?:\/\/(?:www\.)?chakod\.com\/uploads\//i,
      `${API_ORIGIN}/uploads/`,
    );
  }

  if (src.startsWith("/uploads/")) return `${API_ORIGIN}${src}`;
  if (src.startsWith("uploads/")) return `${API_ORIGIN}/${src}`;
  return src;
}

function Placeholder() {
  return (
    <div className={styles.placeholder} aria-label="تصویر برای این آگهی ثبت نشده است">
      <img
        src="/brand/chakod-symbol.png"
        alt=""
        aria-hidden="true"
        style={{
          width: 48,
          height: 56,
          objectFit: "contain",
          opacity: 0.82,
          filter: "drop-shadow(0 8px 14px rgba(15, 8, 26, 0.22))",
        }}
      />
      <span style={{ fontSize: 9, color: "rgba(255,255,255,.78)" }}>
        بدون تصویر
      </span>
    </div>
  );
}

export default function ListingCardImage({ src, alt }: Props) {
  const [failed, setFailed] = useState(false);
  const normalizedSrc = normalizeImageSrc(src);

  if (!normalizedSrc || failed) return <Placeholder />;

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
