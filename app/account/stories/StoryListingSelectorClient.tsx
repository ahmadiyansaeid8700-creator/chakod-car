"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import Header from "../../components/layout/Header";
import MobileBackButton from "../../components/MobileBackButton";
import MobileBottomNav from "../../components/MobileBottomNav";
import { eligibleStoryListings } from "./story-listing-eligibility";
import styles from "./page.module.css";

type ListingItem = {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  status?: { code?: string };
  cover_image?: { image_url: string } | null;
};

type ListingsResponse = {
  success?: boolean;
  message?: string;
  data?: ListingItem[];
  pagination?: { page?: number; total_pages?: number; has_next?: boolean };
};
type ActiveStoriesResponse = { success?: boolean; data?: Array<{ listing_id: number }> };

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function formatPrice(value: string | number | null | undefined) {
  const price = Number(value || 0);
  if (!Number.isFinite(price) || price <= 0) return "توافقی";
  return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
}

function listingTitle(listing: ListingItem) {
  return listing.title || [listing.brand, listing.model, listing.year].filter(Boolean).join(" ");
}

export default function StoryListingSelectorClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [listings, setListings] = useState<ListingItem[]>([]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(false);

    async function requestListings(owner: "personal" | "dealer") {
      const result: ListingItem[] = [];
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const params = new URLSearchParams({ page: String(page), per_page: "100", status: "active", owner });
        const response = await fetch(`/api/auth/dashboard-listings?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const payload = (await response.json().catch(() => null)) as ListingsResponse | null;
        if (!response.ok || !payload?.success) throw new Error(payload?.message || "listings_failed");
        result.push(...(payload.data || []));
        hasNext = Boolean(payload.pagination?.has_next);
        page += 1;
      }

      return result;
    }

    try {
      const [personal, dealer, storiesResponse] = await Promise.all([
        requestListings("personal"),
        requestListings("dealer"),
        fetch("/api/stories/active", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        }),
      ]);
      const storiesPayload = (await storiesResponse.json().catch(() => null)) as ActiveStoriesResponse | null;
      if (!storiesResponse.ok || !storiesPayload?.success) throw new Error("stories_failed");

      const seen = new Set<number>();
      const uniqueListings = [...personal, ...dealer].filter((listing) => {
        const id = Number(listing.id);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setListings(eligibleStoryListings(uniqueListings, storiesPayload.data || []));
    } catch {
      setListings([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadListings(); }, [loadListings]);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.desktopHeader}><Header /></div>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
          <MobileBackButton fallbackHref="/" />
        </header>

        <div className={styles.heading}><h1>انتخاب آگهی</h1></div>

        {loading ? (
          <section className={styles.grid} aria-label="در حال دریافت آگهی‌ها">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeleton} />)}
          </section>
        ) : error ? (
          <section className={styles.state}>
            <strong>دریافت آگهی‌ها انجام نشد</strong>
            <button type="button" onClick={() => void loadListings()}>تلاش دوباره</button>
          </section>
        ) : listings.length === 0 ? (
          <section className={styles.state}>
            <strong>آگهی واجد شرایطی ندارید</strong>
            <Link href="/account/listings/new">ثبت آگهی</Link>
          </section>
        ) : (
          <section className={styles.grid} aria-label="آگهی‌های قابل انتخاب برای استوری">
            {listings.map((listing) => (
              <article className={styles.card} key={listing.id}>
                <Link href={`/cars/${listing.id}`} className={styles.imageWrap} aria-label={listingTitle(listing)}>
                  {listing.cover_image?.image_url ? (
                    <img src={listing.cover_image.image_url} alt={listingTitle(listing)} />
                  ) : (
                    <span className={styles.placeholder} aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M4 16.5V8.8c0-.9.7-1.6 1.6-1.6h1.7l1.2-2h7l1.2 2h1.7c.9 0 1.6.7 1.6 1.6v7.7c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6Z"/><circle cx="12" cy="12.5" r="3.2"/></svg>
                    </span>
                  )}
                </Link>
                <div className={styles.cardBody}>
                  <h2>{listingTitle(listing)}</h2>
                  <p>{formatPrice(listing.price_toman)}</p>
                  <Link className={styles.selectButton} href={`/account/payments/checkout?type=promotion&service_key=listing_story&listing_id=${listing.id}`}>
                    انتخاب برای استوری
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
