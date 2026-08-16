"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";

import styles from "./dealer-selected-promotion.module.css";

export default function DealerSelectedPromotionInjector() {
  const searchParams = useSearchParams();
  const dealerId = Math.max(0, Math.round(Number(searchParams.get("dealer_id") || 0)));
  const activeTab = searchParams.get("tab") || "overview";
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let currentMount: HTMLElement | null = null;

    function ensureLayout() {
      const backLink = document.querySelector<HTMLAnchorElement>(
        'a[aria-label="بازگشت به حساب"], a[data-dealer-home-link="true"]',
      );
      const main = backLink?.closest("main") as HTMLElement | null;

      if (!main) {
        if (currentMount?.isConnected) currentMount.remove();
        currentMount = null;
        setMount(null);
        return;
      }

      main.dataset.dealerCommandCenter = "true";

      if (backLink) {
        backLink.href = "/";
        backLink.dataset.dealerHomeLink = "true";
        backLink.setAttribute("aria-label", "صفحه اصلی");
        backLink.setAttribute("title", "صفحه اصلی");
      }

      const hero = main.querySelector<HTMLElement>("header");
      if (hero) hero.dataset.dealerHero = "true";

      main.querySelectorAll<HTMLElement>('[data-dealer-desktop-create-action="true"]').forEach((node) => {
        delete node.dataset.dealerDesktopCreateAction;
      });

      if (activeTab === "overview") {
        const createLink = Array.from(main.querySelectorAll<HTMLAnchorElement>('a[href^="/account/listings/new?dealer_id="]'))
          .find((link) => link.textContent?.includes("ثبت آگهی جدید"));
        const createSection = createLink?.closest("section") as HTMLElement | null;
        if (createSection) createSection.dataset.dealerDesktopCreateAction = "true";
      }

      main.querySelectorAll<HTMLElement>('[data-dealer-listing-card="true"]').forEach((node) => {
        delete node.dataset.dealerListingCard;
      });
      main.querySelectorAll<HTMLElement>('[data-dealer-listing-grid="true"]').forEach((node) => {
        delete node.dataset.dealerListingGrid;
      });

      const listingLinks = Array.from(main.querySelectorAll<HTMLAnchorElement>('a[href^="/account/listings/"]'))
        .filter((link) => /^\/account\/listings\/\d+(?:[?#].*)?$/.test(link.getAttribute("href") || ""));
      if (listingLinks.length) {
        const grid = listingLinks[0]?.parentElement;
        if (grid) grid.dataset.dealerListingGrid = "true";
        listingLinks.forEach((link) => { link.dataset.dealerListingCard = "true"; });
      }

      if (activeTab !== "overview" || !hero) {
        if (currentMount?.isConnected) currentMount.remove();
        currentMount = null;
        setMount(null);
        return;
      }

      if (currentMount?.isConnected && currentMount.previousElementSibling === hero) return;

      if (currentMount?.isConnected) currentMount.remove();
      currentMount = document.createElement("div");
      currentMount.dataset.dealerSelectedPromotion = "true";
      hero.insertAdjacentElement("afterend", currentMount);
      setMount(currentMount);
    }

    ensureLayout();
    const observer = new MutationObserver(ensureLayout);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      currentMount?.remove();
      setMount(null);
    };
  }, [activeTab, dealerId]);

  const href = dealerId
    ? `/account/selected?placement=showroom&dealer_id=${dealerId}`
    : "/account/selected";

  const promotion = mount
    ? createPortal(
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
      )
    : null;

  return (
    <>
      {promotion}
      <style jsx global>{`
        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] {
          grid-template-columns: minmax(0, 1fr) 58px !important;
          gap: 9px !important;
          padding: 12px 14px !important;
          border-radius: 18px !important;
        }

        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] > a {
          width: 58px !important;
          height: 58px !important;
          border-radius: 16px !important;
          font-size: 18px !important;
        }

        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] > div:first-child > span {
          min-height: 22px !important;
          padding: 0 8px !important;
          font-size: 10px !important;
        }

        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] h1 {
          margin: 4px 0 1px !important;
          font-size: 20px !important;
        }

        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] p,
        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] > div:first-child > div {
          font-size: 11px !important;
          line-height: 1.55 !important;
        }

        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] > div:nth-of-type(2) {
          gap: 5px !important;
        }

        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] > div:nth-of-type(2) span {
          min-height: 25px !important;
          padding: 0 8px !important;
          font-size: 9px !important;
        }

        main[data-dealer-command-center="true"] header[data-dealer-hero="true"] > select {
          min-height: 36px !important;
          font-size: 11px !important;
        }

        main[data-dealer-command-center="true"] [data-dealer-listing-grid="true"] {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] {
          aspect-ratio: 1 / 1 !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: space-between !important;
          gap: 8px !important;
          padding: 12px !important;
          border-radius: 16px !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] > span:first-child {
          width: 48px !important;
          height: 48px !important;
          flex: 0 0 48px !important;
          align-self: flex-start !important;
          border-radius: 14px !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] > span:nth-child(2) {
          width: 100% !important;
          min-width: 0 !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] strong,
        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] small {
          white-space: normal !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] strong {
          -webkit-line-clamp: 2 !important;
          font-size: 13px !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] small {
          -webkit-line-clamp: 2 !important;
          font-size: 9px !important;
          line-height: 1.7 !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] em {
          align-self: flex-start !important;
          padding: 5px 7px !important;
          font-size: 9px !important;
        }

        main[data-dealer-command-center="true"] a[data-dealer-listing-card="true"] > svg {
          display: none !important;
        }

        @media (max-width: 620px) {
          main[data-dealer-command-center="true"] [data-dealer-desktop-create-action="true"] {
            display: none !important;
          }
        }

        @media (max-width: 560px) {
          main[data-dealer-command-center="true"] header[data-dealer-hero="true"] {
            grid-template-columns: minmax(0, 1fr) 50px !important;
            gap: 8px !important;
            padding: 10px 12px !important;
            border-radius: 16px !important;
          }

          main[data-dealer-command-center="true"] header[data-dealer-hero="true"] > a {
            width: 50px !important;
            height: 50px !important;
            border-radius: 14px !important;
            font-size: 15px !important;
          }

          main[data-dealer-command-center="true"] header[data-dealer-hero="true"] h1 {
            font-size: 18px !important;
          }
        }

        @media (min-width: 720px) {
          main[data-dealer-command-center="true"] [data-dealer-listing-grid="true"] {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </>
  );
}
