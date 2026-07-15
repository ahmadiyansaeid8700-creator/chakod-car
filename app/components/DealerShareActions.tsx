"use client";

import { useState } from "react";

type DealerShareActionsProps = {
  dealerName: string;
  city: string;
  href: string;
};

export default function DealerShareActions({
  dealerName,
  city,
  href,
}: DealerShareActionsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const absoluteUrl = `https://www.chakod.com${href}`;
  const title = `${dealerName} در چاکود`;
  const shareText = `${dealerName}${city ? ` در ${city}` : ""}؛ ویترین خودروهای این نمایشگاه را در چاکود ببینید.`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${shareText}\n${absoluteUrl}`,
  )}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    absoluteUrl,
  )}&text=${encodeURIComponent(shareText)}`;

  async function shareDealer() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: absoluteUrl,
        });
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
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("لینک نمایشگاه را کپی کنید:", absoluteUrl);
    }
  }

  return (
    <div className="dealerShareActions">
      <button
        type="button"
        className="dealerShareTrigger"
        onClick={shareDealer}
        aria-expanded={open}
        aria-label={`اشتراک‌گذاری ${dealerName}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 15 5c0 .18.02.35.05.52L8.9 9.07a3 3 0 1 0 0 5.86l6.15 3.55A3 3 0 0 0 15 19a3 3 0 1 0 1-2.24l-6.15-3.55a3.12 3.12 0 0 0 0-2.42L16 7.24A3 3 0 0 0 18 8Z" />
        </svg>
        <span>اشتراک</span>
      </button>

      {open ? (
        <div className="dealerShareMenu" role="menu">
          <a href={whatsappUrl} target="_blank" rel="noreferrer" role="menuitem">
            واتساپ
          </a>
          <a href={telegramUrl} target="_blank" rel="noreferrer" role="menuitem">
            تلگرام
          </a>
          <button type="button" onClick={copyLink} role="menuitem">
            {copied ? "کپی شد" : "کپی لینک"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
