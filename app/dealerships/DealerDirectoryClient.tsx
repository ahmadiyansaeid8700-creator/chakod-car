"use client";

import { useDeferredValue, useEffect, useState } from "react";

import MobileBottomNav from "../components/MobileBottomNav";
import MobileBackButton from "../components/MobileBackButton";
import ShowroomCard, { type ShowroomListingPreview } from "../components/ShowroomCard";
import { PRELAUNCH_FIXTURES_ENABLED, PRELAUNCH_LISTINGS } from "../../lib/prelaunch-fixtures";
import styles from "./page.module.css";

type PublicBusiness = {
  id: number;
  slug: string;
  name: string;
  province: string;
  city: string;
  neighborhood: string;
  logo_url: string;
  cover_url: string;
  is_verified: boolean;
};

type BusinessesResponse = {
  success?: boolean;
  message?: string;
  items?: PublicBusiness[];
};

type FeaturedPlacement = {
  dealer_id?: number;
  dealer_name?: string;
  province?: string;
  desktop_banner_url?: string;
  mobile_banner_url?: string;
  listing_ids?: number[];
};

type FeaturedResponse = {
  success?: boolean;
  data?: FeaturedPlacement[];
};

type ListingDetail = {
  id?: number | string;
  title?: string;
  cover_image?: string | null;
};

type ListingDetailResponse = {
  success?: boolean;
  data?: ListingDetail | null;
};

type SelectedShowroom = {
  dealerId: number;
  name: string;
  province: string;
  city: string;
  logoUrl: string;
  fallbackCover: string;
  desktopBanner: string;
  mobileBanner: string;
  listingIds: number[];
  latestListings: ShowroomListingPreview[];
  profileHref: string;
};

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function safeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Math.round(Number(item || 0)))
        .filter((item) => Number.isSafeInteger(item) && item > 0),
    ),
  ).slice(0, 3);
}

function fallbackPreview(id: number): ShowroomListingPreview {
  return { id, title: `خودرو ${id}`, image: null };
}

function fixturePreview(id: number): ShowroomListingPreview | null {
  if (!PRELAUNCH_FIXTURES_ENABLED) return null;
  const listing = PRELAUNCH_LISTINGS.find((item) => Number(item.id) === id);
  if (!listing) return null;
  return {
    id: listing.id,
    title: listing.title,
    image: listing.cover_image || null,
  };
}

async function fetchSelectedListingPreviews(ids: number[], signal: AbortSignal) {
  const previews = await Promise.all(
    ids.map(async (id): Promise<ShowroomListingPreview> => {
      const fixture = fixturePreview(id);
      if (fixture) return fixture;

      try {
        const response = await fetch(
          `https://api.chakod.com/api/listing-detail.php?id=${encodeURIComponent(id)}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal,
          },
        );
        if (!response.ok) return fallbackPreview(id);
        const payload = (await response.json().catch(() => null)) as ListingDetailResponse | null;
        const listing = payload?.success && payload.data ? payload.data : null;
        if (!listing) return fallbackPreview(id);
        return {
          id: listing.id || id,
          title: listing.title?.trim() || `خودرو ${id}`,
          image: listing.cover_image || null,
        };
      } catch (error: unknown) {
        if ((error as Error).name === "AbortError") throw error;
        return fallbackPreview(id);
      }
    }),
  );

  return new Map(previews.map((preview) => [Number(preview.id), preview]));
}

export default function DealerDirectoryClient() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [selected, setSelected] = useState<SelectedShowroom[]>([]);
  const [ordinary, setOrdinary] = useState<PublicBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "24", type: "dealer" });
    if (deferredQuery) params.set("q", deferredQuery);

    setLoading(true);
    setError("");

    Promise.all([
      fetch(`/api/businesses?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      fetch("/api/featured-showrooms", {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
    ])
      .then(async ([businessResponse, featuredResponse]) => {
        const businessesPayload = (await businessResponse.json().catch(() => null)) as BusinessesResponse | null;
        const featuredPayload = (await featuredResponse.json().catch(() => null)) as FeaturedResponse | null;

        if (!businessResponse.ok || !businessesPayload?.success) {
          throw new Error(businessesPayload?.message || "دریافت نمایشگاه‌ها انجام نشد.");
        }

        const base = Array.isArray(businessesPayload.items) ? businessesPayload.items : [];
        const placements = featuredResponse.ok && featuredPayload?.success && Array.isArray(featuredPayload.data)
          ? featuredPayload.data
          : [];
        const selectedListingIds = Array.from(new Set(placements.flatMap((placement) => safeIds(placement.listing_ids))));
        const listingPreviewsById = await fetchSelectedListingPreviews(selectedListingIds, controller.signal);

        const byId = new Map<number, PublicBusiness>();
        const byName = new Map<string, PublicBusiness>();
        base.forEach((business) => {
          const businessId = Math.round(Number(business.id || 0));
          if (Number.isSafeInteger(businessId) && businessId > 0 && !byId.has(businessId)) {
            byId.set(businessId, business);
          }
          const key = normalizeText(business.name);
          if (key && !byName.has(key)) byName.set(key, business);
        });

        const usedBusinessIds = new Set<number>();
        const seenDealers = new Set<number>();
        const queryKey = normalizeText(deferredQuery);
        const featuredItems: SelectedShowroom[] = [];

        placements.forEach((placement) => {
          const dealerId = Math.round(Number(placement.dealer_id || 0));
          if (!Number.isSafeInteger(dealerId) || dealerId <= 0 || seenDealers.has(dealerId)) return;
          seenDealers.add(dealerId);

          const name = String(placement.dealer_name || "").trim() || `نمایشگاه ${dealerId}`;
          const matched = byId.get(dealerId) || byName.get(normalizeText(name));
          const province = String(placement.province || matched?.province || "").trim();
          const city = String(matched?.city || "").trim();
          const searchable = normalizeText(`${name} ${province} ${city}`);
          if (queryKey && !searchable.includes(queryKey)) return;

          const listingIds = safeIds(placement.listing_ids);
          const latestListings = listingIds.map((id) => listingPreviewsById.get(id) || fallbackPreview(id));
          if (matched) usedBusinessIds.add(Number(matched.id));
          featuredItems.push({
            dealerId,
            name,
            province,
            city,
            logoUrl: String(matched?.logo_url || ""),
            fallbackCover: String(matched?.cover_url || ""),
            desktopBanner: String(placement.desktop_banner_url || ""),
            mobileBanner: String(placement.mobile_banner_url || ""),
            listingIds,
            latestListings,
            profileHref: matched?.slug
              ? `/businesses/${encodeURIComponent(matched.slug)}`
              : `/showrooms/${dealerId}`,
          });
        });

        setSelected(featuredItems);
        setOrdinary(base.filter((business) => !usedBusinessIds.has(Number(business.id))));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSelected([]);
        setOrdinary([]);
        setError(reason instanceof Error ? reason.message : "دریافت نمایشگاه‌ها انجام نشد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [deferredQuery]);

  const total = selected.length + ordinary.length;

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.desktopHeader}>
        <a href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></a>
        <nav>
          <button type="button" onClick={() => window.history.back()}>بازگشت</button>
          <a href="/">صفحه اصلی</a>
          <a href="/account">حساب من</a>
        </nav>
      </header>

      <header className={styles.mobileHeader}>
        <MobileBackButton />
        <strong>نمایشگاه‌ها</strong>
        <a href="/" aria-label="صفحه اصلی"><img src="/brand/chakod-symbol.png" alt="" /></a>
      </header>

      <div className={styles.searchBar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجو"
          aria-label="جستجوی نمایشگاه"
        />
      </div>

      <section className={styles.content}>
        <div className={styles.resultMeta}>{loading ? "در حال دریافت…" : `${total.toLocaleString("fa-IR")} نمایشگاه`}</div>

        {error ? <div className={styles.stateError}>{error}</div> : null}

        {!loading && !error && selected.length ? (
          <div className={styles.showroomGrid}>
            {selected.map((showroom) => (
              <ShowroomCard
                density="compact"
                key={showroom.dealerId}
                showroom={{
                  key: `id:${showroom.dealerId}`,
                  href: showroom.profileHref,
                  slug: showroom.profileHref.startsWith("/businesses/")
                    ? decodeURIComponent(showroom.profileHref.slice("/businesses/".length))
                    : null,
                  name: showroom.name,
                  city: showroom.city,
                  province: showroom.province,
                  listingCount: showroom.listingIds.length,
                  logoUrl: showroom.logoUrl,
                  coverImage: showroom.fallbackCover,
                  coverImageDesktop: showroom.desktopBanner,
                  coverImageMobile: showroom.mobileBanner,
                  featured: true,
                  latestListings: showroom.latestListings,
                }}
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && ordinary.length ? (
          <div className={styles.showroomGrid}>
            {ordinary.map((business) => (
              <ShowroomCard
                density="compact"
                key={business.id}
                showroom={{
                  key: `business:${business.id}`,
                  slug: business.slug,
                  name: business.name,
                  city: business.city,
                  province: business.province,
                  listingCount: 0,
                  logoUrl: business.logo_url,
                  coverImage: business.cover_url,
                  verified: business.is_verified,
                  featured: false,
                  latestListings: [],
                }}
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && total === 0 ? <div className={styles.empty}>نمایشگاهی پیدا نشد.</div> : null}
      </section>

      <MobileBottomNav />
    </main>
  );
}
