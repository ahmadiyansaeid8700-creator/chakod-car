"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./ListingCard.module.css";

type ListingCardActionsProps = {
  listingId: number | string;
  title: string;
  href: string;
};

const PUBLIC_SITE_URL = "https://www.chakod.com";

export default function ListingCardActions({
  listingId,
  title,
  href,
}: ListingCardActionsProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const absoluteUrl = `${PUBLIC_SITE_URL}${href}`;

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(absoluteUrl, {
      width: 128,
      margin: 0,
      errorCorrectionLevel: "M",
      color: {
        dark: "#28143f",
        light: "#ffffff",
      },
    }).then((value) => {
      if (active) setQrDataUrl(value);
    });

    return () => {
      active = false;
    };
  }, [absoluteUrl]);

  async function shareListing() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${title} در چاکود`,
          text: `آگهی ${title} را در چاکود ببینید.`,
          url: absoluteUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1600);
    } catch {
      window.prompt("لینک آگهی را کپی کنید:", absoluteUrl);
    }
  }

  return (
    <div className={styles.cardActions}>
      <Link
        href={href}
        prefetch={false}
        className={styles.viewQrAction}
        aria-label={`نمایش آگهی ${title} و کد QR آن`}
      >
        <span className={styles.viewQrCopy}>
          <strong>نمایش</strong>
          <small>آگهی شماره {new Intl.NumberFormat("fa-IR").format(Number(listingId) || 0)}</small>
        </span>
        <span className={styles.qrThumb} aria-hidden="true">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" />
          ) : (
            <i />
          )}
        </span>
      </Link>

      <button
        type="button"
        className={styles.shareAction}
        onClick={shareListing}
        aria-label={`اشتراک‌گذاری آگهی ${title}`}
        title={shareState === "copied" ? "لینک کپی شد" : "اشتراک‌گذاری"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="18" cy="5" r="2.6" />
          <circle cx="6" cy="12" r="2.6" />
          <circle cx="18" cy="19" r="2.6" />
          <path d="m8.4 10.7 7.2-4.2M8.4 13.3l7.2 4.2" />
        </svg>
        <span>{shareState === "copied" ? "کپی شد" : "اشتراک"}</span>
      </button>
    </div>
  );
}
