"use client";

import { useState } from "react";
import styles from "./page.module.css";

type ShareListingButtonProps = {
  title: string;
  url: string;
  compact?: boolean;
};

function ShareIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="18"
        cy="5"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="6"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="18"
        cy="19"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ShareListingButton({
  title,
  url,
  compact = false,
}: ShareListingButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `${title} را در چاکود ببینید`;

  async function handleMainShare() {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });

        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    setOpen((current) => !current);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1600);
    } catch {
      window.prompt("لینک آگهی را کپی کنید:", url);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${shareText}\n${url}`
  )}`;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className={styles.shareWrapper}>
      <button
        type="button"
        onClick={handleMainShare}
        className={
          compact
            ? styles.compactShareButton
            : styles.shareButton
        }
        aria-label="اشتراک‌گذاری آگهی"
        title="اشتراک‌گذاری آگهی"
      >
        <ShareIcon />

        {!compact ? <span>اشتراک‌گذاری</span> : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className={styles.shareBackdrop}
            onClick={() => setOpen(false)}
            aria-label="بستن منوی اشتراک‌گذاری"
          />

          <div className={styles.shareMenu}>
            <strong>اشتراک‌گذاری از چاکود</strong>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              واتساپ
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
            >
              تلگرام
            </a>

            <button type="button" onClick={copyLink}>
              {copied ? "لینک کپی شد ✓" : "کپی لینک"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}