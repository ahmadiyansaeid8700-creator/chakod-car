"use client";

import { useEffect, useState } from "react";
import styles from "./ListingActionButton.module.css";

type ShareListingButtonProps = {
  title: string;
  url: string;
  compact?: boolean;
};

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
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

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function handleMainShare() {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
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
      }, 1400);
    } catch {
      window.prompt("لینک آگهی را کپی کنید:", url);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${shareText}\n${url}`,
  )}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    url,
  )}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        onClick={handleMainShare}
        className={compact ? styles.compactButton : styles.button}
        aria-label="اشتراک‌گذاری آگهی"
        aria-expanded={open}
        title="اشتراک‌گذاری آگهی"
      >
        <ShareIcon />
        {!compact ? <span>اشتراک‌گذاری</span> : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setOpen(false)}
            aria-label="بستن منوی اشتراک‌گذاری"
          />

          <div className={styles.menu} role="menu">
            <strong>اشتراک‌گذاری آگهی</strong>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" role="menuitem">
              واتساپ
            </a>
            <a href={telegramUrl} target="_blank" rel="noreferrer" role="menuitem">
              تلگرام
            </a>
            <button type="button" onClick={copyLink} role="menuitem">
              {copied ? "لینک کپی شد ✓" : "کپی لینک"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
