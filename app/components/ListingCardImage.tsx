"use client";

import { useState } from "react";
import styles from "./ListingCard.module.css";

type Props = {
  src: string;
  alt: string;
};

function Placeholder() {
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

export default function ListingCardImage({ src, alt }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <Placeholder />;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
