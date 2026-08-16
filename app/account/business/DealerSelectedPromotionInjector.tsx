"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";

import styles from "./dealer-selected-promotion.module.css";

export default function DealerSelectedPromotionInjector() {
  const searchParams = useSearchParams();
  const dealerId = Math.max(0, Math.round(Number(searchParams.get("dealer_id") || 0)));
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let currentMount: HTMLElement | null = null;

    function ensureMount() {
      const stats = document.querySelector<HTMLElement>('section[aria-label="آمار نمایشگاه"]');
      if (!stats) {
        if (currentMount?.isConnected) currentMount.remove();
        currentMount = null;
        setMount(null);
        return;
      }

      if (currentMount?.isConnected && currentMount.previousElementSibling === stats) return;

      if (currentMount?.isConnected) currentMount.remove();
      currentMount = document.createElement("div");
      currentMount.dataset.dealerSelectedPromotion = "true";
      stats.insertAdjacentElement("afterend", currentMount);
      setMount(currentMount);
    }

    ensureMount();
    const observer = new MutationObserver(ensureMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      currentMount?.remove();
      setMount(null);
    };
  }, [searchParams]);

  if (!mount) return null;

  const href = dealerId
    ? `/account/selected?placement=showroom&dealer_id=${dealerId}`
    : "/account/selected";

  return createPortal(
    <section className={styles.promoteCard} aria-label="جایگاه ویژه نمایشگاه">
      <div className={styles.promoteIcon} aria-hidden="true">✦</div>
      <div className={styles.promoteCopy}>
        <span>جایگاه ویژه</span>
        <h2>تبلیغ این نمایشگاه</h2>
        <p>نمایشگاه را با ویترین منتخب و خودروهای انتخابی در صفحه اول چاکود برجسته کن.</p>
      </div>
      <Link href={href} className={styles.promoteButton}>جایگاه ویژه نمایشگاه</Link>
    </section>,
    mount,
  );
}
