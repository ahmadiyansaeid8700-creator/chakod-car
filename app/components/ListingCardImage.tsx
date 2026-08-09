"use client";

import { useState } from "react";
import styles from "./ListingCard.module.css";

type Props = {
  src: string;
  alt: string;
};

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
