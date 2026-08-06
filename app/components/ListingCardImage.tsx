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
          width: 58,
          height: 68,
          objectFit: "contain",
          opacity: 0.92,
          filter: "drop-shadow(0 10px 18px rgba(15, 8, 26, 0.28))",
        }}
      />
      <strong style={{ fontSize: 12, color: "#fff" }}>چاکود</strong>
      <span>تصویر برای این آگهی ثبت نشده</span>
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
