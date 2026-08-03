"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./BusinessCardActions.module.css";

type BusinessCardActionsProps = {
  href: string;
  title: string;
  className?: string;
};

const PUBLIC_SITE_URL = "https://chakod.com";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5m6-6-6 6 6 6" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4" />
    </svg>
  );
}

export default function BusinessCardActions({
  href,
  title,
  className = "",
}: BusinessCardActionsProps) {
  const absoluteUrl = `${PUBLIC_SITE_URL}${href}`;
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(absoluteUrl, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#21152d",
        light: "#ffffff",
      },
    }).then((dataUrl) => {
      if (active) setQrDataUrl(dataUrl);
    });

    return () => {
      active = false;
    };
  }, [absoluteUrl]);

  useEffect(() => {
    if (!qrOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setQrOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [qrOpen]);

  async function shareBusiness() {
    const text = `${title} را در چاکود ببینید`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("لینک را کپی کنید:", absoluteUrl);
    }
  }

  return (
    <div className={`${styles.actions} ${className}`.trim()}>
      <div className={styles.viewQrBox}>
        <Link
          href={href}
          prefetch={false}
          className={styles.viewButton}
          aria-label={`نمایش ${title}`}
        >
          <span>نمایش</span>
          <ArrowIcon />
        </Link>
        <button
          type="button"
          className={styles.qrButton}
          onClick={() => setQrOpen(true)}
          aria-label={`نمایش کد QR ${title}`}
          title="نمایش کد QR"
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" aria-hidden="true" />
          ) : (
            <span className={styles.qrPlaceholder} aria-hidden="true" />
          )}
        </button>
      </div>

      <button
        type="button"
        className={styles.shareButton}
        onClick={shareBusiness}
        aria-label={`اشتراک‌گذاری ${title}`}
        title={copied ? "لینک کپی شد" : "اشتراک‌گذاری"}
      >
        <ShareIcon />
        <span className={styles.shareStatus} aria-live="polite">
          {copied ? "کپی شد" : ""}
        </span>
      </button>

      {qrOpen ? (
        <div className={styles.modalLayer}>
          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setQrOpen(false)}
            aria-label="بستن کد QR"
          />
          <section
            className={styles.qrDialog}
            role="dialog"
            aria-modal="true"
            aria-label={`کد QR ${title}`}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setQrOpen(false)}
              aria-label="بستن"
            >
              ×
            </button>
            <span>کد اختصاصی کسب‌وکار</span>
            <strong>{title}</strong>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`کد QR ${title}`} />
            ) : (
              <div className={styles.dialogLoading}>در حال ساخت کد QR…</div>
            )}
            <p>برای بازکردن مستقیم صفحه، کد را با دوربین موبایل اسکن کنید.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
