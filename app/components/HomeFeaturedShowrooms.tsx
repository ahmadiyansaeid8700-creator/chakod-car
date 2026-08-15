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

const FALLBACK_CARDS = [
  {
    title: "نمایشگاه‌های منتخب چاکود",
    description: "ویترین نمایشگاه‌های حرفه‌ای و خودروهای فعال هر مجموعه",
    label: "مشاهده نمایشگاه‌ها",
    href: "/dealerships",
  },
  {
    title: "خودروهای موجود نمایشگاه‌ها",
    description: "پیش‌نمایش خودروها داخل کارت منتخب هر نمایشگاه",
    label: "ورود به ویترین‌ها",
    href: "/dealerships",
  },
  {
    title: "ثبت نمایشگاه در چاکود",
    description: "ساخت ویترین حرفه‌ای برای معرفی مجموعه و خودروهای موجود",
    label: "ثبت نمایشگاه",
    href: "/account/business/new",
  },
] as const;

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
      featured: true,
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
    const placementOrder = new Map<number, number>();
    const placementMap = new Map<number, FeaturedPlacement>();
    placements.forEach((item, index) => {
      const dealerId = Number(item.dealer_id);
      placementOrder.set(dealerId, index);
      placementMap.set(dealerId, item);
    });

    const dealerMap = new Map<number, DealerPreview>();
    buildDealers(listings).forEach((dealer) => {
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

    return Array.from(dealerMap.values())
      .filter((dealer) => matchesQuery(dealer, query))
      .sort(
        (a, b) =>
          (placementOrder.get(dealerIdFromKey(a.key)) ?? Number.MAX_SAFE_INTEGER) -
          (placementOrder.get(dealerIdFromKey(b.key)) ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, 8);
  }, [listings, placements, query]);

  const showFallback = status !== "ready" || dealers.length === 0;

  return (
    <section className={styles.dealerSection} id="showrooms">
      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.eyebrow}>نمایشگاه‌های چاکود</span>
          <h2>نمایشگاه‌های منتخب</h2>
          <p className="featuredShowroomLocation">{location.label}</p>
        </div>

        <div className={styles.sectionActions}>
          <Link href="/dealerships">
            مشاهده همه
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </div>

      {showFallback ? (
        <div
          className="featuredShowroomFallbackRail"
          aria-live={status === "loading" ? "polite" : undefined}
        >
          {FALLBACK_CARDS.map((card, index) => (
            <Link className="featuredShowroomFallbackCard" href={card.href} key={card.title}>
              <span className="featuredShowroomFallbackVisual">
                <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
                <i>{String(index + 1).padStart(2, "0")}</i>
              </span>
              <span className="featuredShowroomFallbackCopy">
                <strong>{card.title}</strong>
                <small>{card.description}</small>
                <b>
                  {card.label}
                  <span aria-hidden="true">←</span>
                </b>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.dealerRail}>
          {dealers.map((dealer) => (
            <ShowroomCard key={dealer.key} showroom={dealer} />
          ))}
        </div>
      )}

      <style>{`
        .featuredShowroomLocation {
          margin: 5px 0 0;
          color: #6d28d9;
          font-size: 9px;
          font-weight: 900;
        }
        .featuredShowroomFallbackRail {
          min-width: 0;
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(300px, calc((100% - 32px) / 3));
          gap: 16px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 2px 1px 24px;
          scroll-snap-type: inline mandatory;
          scrollbar-width: thin;
          scrollbar-color: #d7cce8 transparent;
        }
        .featuredShowroomFallbackCard {
          min-height: 230px;
          padding: 22px;
          border: 1px solid #e4d8f1;
          border-radius: 24px;
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          align-items: center;
          gap: 18px;
          color: #21152f;
          background:
            radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.12), transparent 14rem),
            linear-gradient(145deg, #ffffff, #faf7ff);
          box-shadow: 0 16px 42px rgba(42, 26, 68, 0.075);
          scroll-snap-align: start;
        }
        .featuredShowroomFallbackVisual {
          position: relative;
          width: 92px;
          height: 118px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          background: linear-gradient(155deg, #f2eaff, #ffffff);
        }
        .featuredShowroomFallbackVisual img { width: 52px; height: 64px; object-fit: contain; }
        .featuredShowroomFallbackVisual i {
          position: absolute;
          left: 8px;
          bottom: 7px;
          color: #8b5cf6;
          font-size: 9px;
          font-style: normal;
          font-weight: 900;
        }
        .featuredShowroomFallbackCopy,
        .featuredShowroomFallbackCopy strong,
        .featuredShowroomFallbackCopy small { display: block; }
        .featuredShowroomFallbackCopy strong { font-size: 15px; line-height: 1.7; }
        .featuredShowroomFallbackCopy small { margin-top: 8px; color: #786d82; font-size: 10px; line-height: 1.9; }
        .featuredShowroomFallbackCopy b {
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #6d28d9;
          font-size: 9px;
          font-weight: 900;
        }
        @media (max-width: 900px) {
          .featuredShowroomFallbackRail { grid-auto-columns: min(340px, 82vw); }
        }
        @media (max-width: 560px) {
          .featuredShowroomFallbackRail { grid-auto-columns: min(300px, 84vw); gap: 11px; }
          .featuredShowroomFallbackCard {
            min-height: 128px;
            padding: 14px;
            grid-template-columns: 70px minmax(0, 1fr);
            gap: 12px;
            border-radius: 19px;
          }
          .featuredShowroomFallbackVisual { width: 70px; height: 92px; border-radius: 17px; }
          .featuredShowroomFallbackVisual img { width: 40px; height: 50px; }
          .featuredShowroomFallbackCopy strong { font-size: 13px; }
          .featuredShowroomFallbackCopy small { font-size: 8px; }
          .featuredShowroomFallbackCopy b { margin-top: 10px; font-size: 8px; }
        }
      `}</style>
    </section>
  );
}
