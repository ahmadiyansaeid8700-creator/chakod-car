"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./HomeFeaturedShowrooms.module.css";
import ShowroomCard, {
  type ShowroomCardData,
  type ShowroomListingPreview,
} from "./ShowroomCard";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  getHomeLocationScopes,
  loadHomeLocation,
  type HomeLocationSelection,
} from "./home-location";

const API_BASE_URL = "https://api.chakod.com/api/listings.php";

type ApiListing = {
  id: number | string;
  title: string;
  city?: string | null;
  province?: string | null;
  dealer_name?: string | null;
  dealer_id?: number | string | null;
  dealer_slug?: string | null;
  dealer_logo_url?: string | null;
  dealer_logo?: string | null;
  logo_url?: string | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  dealer_is_verified?: boolean | number | null;
  cover_image?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  success?: boolean;
  data?: ApiListing[];
};

type FeaturedPlacement = {
  id: number;
  dealer_id: number;
  dealer_name?: string;
  province?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  desktop_banner_url?: string;
  mobile_banner_url?: string;
  listing_ids?: number[];
  creative_status?: string;
};

type FeaturedResponse = {
  success?: boolean;
  data?: FeaturedPlacement[];
};

type DealerPreview = ShowroomCardData & {
  latestAt: number;
};

type Props = {
  query: string;
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

function listingTime(listing: ApiListing) {
  return new Date(listing.created_at || 0).getTime() || 0;
}

function listingPreview(listing: ApiListing): ShowroomListingPreview {
  return {
    id: listing.id,
    title: listing.title || "آگهی خودرو",
    image: listing.cover_image || null,
  };
}

function buildListingUrls(location: HomeLocationSelection) {
  const scopes = getHomeLocationScopes(location);

  if (location.mode === "all" || scopes.length === 0) {
    return [
      `${API_BASE_URL}?${new URLSearchParams({
        limit: "100",
        sort: "vip",
      }).toString()}`,
    ];
  }

  return scopes.map((scope) => {
    const params = new URLSearchParams({
      limit: "100",
      sort: "vip",
      province: scope.province,
    });
    return `${API_BASE_URL}?${params.toString()}`;
  });
}

function buildDealerListingUrls(placements: FeaturedPlacement[]) {
  return Array.from(
    new Set(
      placements
        .map((placement) => Number(placement.dealer_id || 0))
        .filter((dealerId) => Number.isSafeInteger(dealerId) && dealerId > 0),
    ),
  ).map((dealerId) => {
    const params = new URLSearchParams({
      limit: "100",
      sort: "vip",
      dealer_id: String(dealerId),
    });
    return `${API_BASE_URL}?${params.toString()}`;
  });
}

function buildFeaturedUrls(location: HomeLocationSelection) {
  const scopes = getHomeLocationScopes(location);
  if (location.mode === "all" || scopes.length === 0) {
    return ["/api/featured-showrooms"];
  }

  return Array.from(new Set(scopes.map((scope) => scope.province))).map(
    (province) => `/api/featured-showrooms?province=${encodeURIComponent(province)}`,
  );
}

async function fetchListings(urls: string[], signal: AbortSignal) {
  return Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, {
        cache: "no-store",
        signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as ApiResponse;
      return payload.success && Array.isArray(payload.data) ? payload.data : [];
    }),
  );
}

function buildDealers(listings: ApiListing[]): DealerPreview[] {
  const dealers = new Map<string, DealerPreview>();
  const ordered = [...listings].sort((a, b) => listingTime(b) - listingTime(a));

  for (const listing of ordered) {
    const name = listing.dealer_name?.trim();
    if (!name) continue;

    const key = listing.dealer_id
      ? `id:${listing.dealer_id}`
      : `name:${normalizeText(name)}`;
    const verified = Boolean(
      listing.dealer_verified ||
        listing.is_dealer_verified ||
        listing.dealer_is_verified,
    );
    const logoUrl = listing.dealer_logo_url || listing.dealer_logo || listing.logo_url || null;
    const current = dealers.get(key);

    if (current) {
      current.listingCount += 1;
      current.verified = current.verified || verified;
      current.latestAt = Math.max(current.latestAt, listingTime(listing));
      if (!current.slug && listing.dealer_slug) current.slug = listing.dealer_slug;
      if (!current.logoUrl && logoUrl) current.logoUrl = logoUrl;
      if (!current.coverImage && listing.cover_image) current.coverImage = listing.cover_image;
      if (
        (current.latestListings?.length || 0) < 20 &&
        !current.latestListings?.some((item) => String(item.id) === String(listing.id))
      ) {
        current.latestListings = [...(current.latestListings || []), listingPreview(listing)];
      }
      continue;
    }

    dealers.set(key, {
      key,
      slug: listing.dealer_slug || null,
      name,
      city: listing.city || "شهر نامشخص",
      province: listing.province || "",
      listingCount: 1,
      logoUrl,
      coverImage: listing.cover_image || null,
      verified,
      featured: false,
      latestAt: listingTime(listing),
      latestListings: [listingPreview(listing)],
    });
  }

  return Array.from(dealers.values());
}

function dealerIdFromKey(key: string) {
  const match = /^id:(\d+)$/.exec(key);
  return match ? Number(match[1]) : 0;
}

function matchesQuery(dealer: DealerPreview, query: string) {
  if (!query.trim()) return true;
  const listingTitles = (dealer.latestListings || []).map((listing) => listing.title).join(" ");
  return normalizeText(
    `${dealer.name} ${dealer.city} ${dealer.province || ""} ${listingTitles}`,
  ).includes(normalizeText(query));
}

function applyPlacement(dealer: DealerPreview, placement: FeaturedPlacement) {
  const selectedIds = Array.isArray(placement.listing_ids)
    ? placement.listing_ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 6)
    : [];
  const previews = dealer.latestListings || [];
  const byId = new Map(previews.map((item) => [Number(item.id), item]));
  const selectedPreviews = selectedIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });

  return {
    ...dealer,
    name: placement.dealer_name?.trim() || dealer.name,
    province: placement.province || dealer.province,
    featured: true,
    coverImageDesktop: placement.desktop_banner_url || dealer.coverImage || null,
    coverImageMobile:
      placement.mobile_banner_url || placement.desktop_banner_url || dealer.coverImage || null,
    latestListings: (selectedIds.length ? selectedPreviews : previews).slice(0, 3),
  } satisfies DealerPreview;
}

export default function HomeFeaturedShowrooms({ query }: Props) {
  const [location, setLocation] = useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [locationReady, setLocationReady] = useState(false);
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [placements, setPlacements] = useState<FeaturedPlacement[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setLocation(loadHomeLocation());
    setLocationReady(true);

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
  }, []);

  useEffect(() => {
    if (!locationReady) return;

    const controller = new AbortController();
    setStatus("loading");
    setListings([]);
    setPlacements([]);

    async function load() {
      try {
        const placementResponses = await Promise.all(
          buildFeaturedUrls(location).map(async (url) => {
            const response = await fetch(url, {
              cache: "no-store",
              signal: controller.signal,
              headers: { Accept: "application/json" },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = (await response.json()) as FeaturedResponse;
            return payload.success && Array.isArray(payload.data) ? payload.data : [];
          }),
        );

        const mergedPlacements = new Map<number, FeaturedPlacement>();
        placementResponses.flat().forEach((item) => {
          const dealerId = Number(item.dealer_id || 0);
          if (dealerId > 0 && !mergedPlacements.has(dealerId)) mergedPlacements.set(dealerId, item);
        });
        const nextPlacements = Array.from(mergedPlacements.values());

        const urls = Array.from(
          new Set([...buildListingUrls(location), ...buildDealerListingUrls(nextPlacements)]),
        );
        const listingResponses = await fetchListings(urls, controller.signal);
        const mergedListings = new Map<number | string, ApiListing>();
        listingResponses.flat().forEach((item) => mergedListings.set(item.id, item));

        setListings(Array.from(mergedListings.values()));
        setPlacements(nextPlacements);
        setStatus("ready");
      } catch (error: unknown) {
        if ((error as Error).name !== "AbortError") {
          setListings([]);
          setPlacements([]);
          setStatus("error");
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [location, locationReady]);

  const dealers = useMemo(() => {
    const listingDealers = buildDealers(listings);
    const placementOrder = new Map<number, number>();
    const placementMap = new Map<number, FeaturedPlacement>();
    placements.forEach((item, index) => {
      const dealerId = Number(item.dealer_id);
      placementOrder.set(dealerId, index);
      placementMap.set(dealerId, item);
    });

    const dealerMap = new Map<number, DealerPreview>();
    listingDealers.forEach((dealer) => {
      const dealerId = dealerIdFromKey(dealer.key);
      if (!dealerId || !placementMap.has(dealerId)) return;
      dealerMap.set(dealerId, applyPlacement(dealer, placementMap.get(dealerId)!));
    });

    placements.forEach((placement) => {
      const dealerId = Number(placement.dealer_id);
      if (!dealerId || dealerMap.has(dealerId)) return;
      dealerMap.set(dealerId, {
        key: `id:${dealerId}`,
        slug: null,
        name: placement.dealer_name?.trim() || `نمایشگاه ${dealerId}`,
        city: "",
        province: placement.province || "",
        listingCount: 0,
        logoUrl: null,
        coverImage: placement.desktop_banner_url || placement.mobile_banner_url || null,
        coverImageDesktop: placement.desktop_banner_url || null,
        coverImageMobile: placement.mobile_banner_url || placement.desktop_banner_url || null,
        verified: false,
        featured: true,
        latestAt: 0,
        latestListings: [],
      });
    });

    const placedDealers = Array.from(dealerMap.values()).sort(
      (a, b) =>
        (placementOrder.get(dealerIdFromKey(a.key)) ?? Number.MAX_SAFE_INTEGER) -
        (placementOrder.get(dealerIdFromKey(b.key)) ?? Number.MAX_SAFE_INTEGER),
    );
    const placedIds = new Set(placedDealers.map((dealer) => dealerIdFromKey(dealer.key)));
    const organicDealers = listingDealers
      .filter((dealer) => {
        const dealerId = dealerIdFromKey(dealer.key);
        return !dealerId || !placedIds.has(dealerId);
      })
      .sort(
        (a, b) =>
          Number(Boolean(b.verified)) - Number(Boolean(a.verified)) ||
          b.listingCount - a.listingCount ||
          b.latestAt - a.latestAt ||
          a.name.localeCompare(b.name, "fa"),
      );

    return [...placedDealers, ...organicDealers]
      .filter((dealer) => matchesQuery(dealer, query))
      .slice(0, 8);
  }, [listings, placements, query]);

  return (
    <section className={styles.dealerSection} id="showrooms">
      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.eyebrow}>ویترین نمایشگاه‌ها</span>
          <h2>نمایشگاه‌های منتخب چاکود</h2>
          <p className={styles.locationLabel}>{location.label}</p>
        </div>

        <div className={styles.sectionActions}>
          <Link href="/dealerships">
            مشاهده همه
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </div>

      {status === "loading" ? (
        <div className={styles.skeletonRail} aria-label="در حال دریافت نمایشگاه‌ها" aria-live="polite">
          {[0, 1, 2].map((item) => (
            <span className={styles.skeletonCard} key={item} aria-hidden="true">
              <span className={styles.skeletonCover} />
              <span className={styles.skeletonLogo} />
              <span className={styles.skeletonTitle} />
              <span className={styles.skeletonMeta} />
              <span className={styles.skeletonProducts} />
              <span className={styles.skeletonButton} />
            </span>
          ))}
        </div>
      ) : dealers.length > 0 ? (
        <div className={styles.dealerRail}>
          {dealers.map((dealer) => (
            <ShowroomCard key={dealer.key} showroom={dealer} />
          ))}
        </div>
      ) : (
        <div className={styles.compactEmpty} role="status">
          <strong>{status === "error" ? "دریافت نمایشگاه‌ها انجام نشد" : "نمایشگاهی در این محدوده پیدا نشد"}</strong>
          <span>
            {status === "error"
              ? "اتصال اینترنت را بررسی و صفحه را دوباره بارگذاری کنید."
              : "محدوده نمایش را تغییر دهید یا همه نمایشگاه‌ها را ببینید."}
          </span>
          <Link href="/dealerships">مشاهده همه نمایشگاه‌ها</Link>
        </div>
      )}
    </section>
  );
}
