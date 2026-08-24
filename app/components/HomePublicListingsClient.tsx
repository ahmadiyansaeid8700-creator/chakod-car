// CHAKOD_HOME_LOCATION_MULTI_REGION_V5
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  getHomeLocationScopes,
  loadHomeLocation,
  type HomeLocationSelection,
} from "./home-location";
import HomeHorizontalRail from "./HomeHorizontalRail";
import HomeVehicleCard, {
  HomeVehicleCardFallback,
} from "./HomeVehicleCard";
import ListingCard, { type ListingCardData } from "./ListingCard";

const API_BASE_URL = "https://api.chakod.com/api/listings.php";

type Listing = ListingCardData & {
  brand: string;
  model: string;
  title: string;
  province: string;
  city: string;
  neighborhood: string;
  category_code: string;
  category_name: string;
  created_at: string;
  priority_level?: number;
  is_highlighted?: boolean | number;
  plan_code?: string;
  market_segment?: "luxury" | "freezone" | "economic" | "regular" | null;
  dealer_id?: number | string | null;
  dealer_logo_url?: string | null;
  dealer_logo?: string | null;
  logo_url?: string | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  dealer_is_verified?: boolean | number | null;
};

type ApiResponse = { success?: boolean; data?: Listing[] };
type Tone = "luxury" | "freezone";
type LoadStatus = "loading" | "ready" | "error";

type SelectedPlacement = {
  placement_key: string;
  listing_id?: number | null;
};

type SelectedResponse = {
  success?: boolean;
  data?: SelectedPlacement[];
};

function normalizeText(value: string) {
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

function byNewest(a: Listing, b: Listing) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function selectedOrder(placements: SelectedPlacement[], key: "luxury" | "freezone") {
  const order = new Map<string, number>();
  placements
    .filter((item) => item.placement_key === key && Number(item.listing_id || 0) > 0)
    .forEach((item, index) => {
      const id = String(item.listing_id);
      if (!order.has(id)) order.set(id, index);
    });
  return order;
}

function bySelectedThenNewest(order: Map<string, number>) {
  return (a: Listing, b: Listing) => {
    const aRank = order.get(String(a.id));
    const bRank = order.get(String(b.id));
    if (aRank !== undefined || bRank !== undefined) {
      if (aRank === undefined) return 1;
      if (bRank === undefined) return -1;
      if (aRank !== bRank) return aRank - bRank;
    }
    return byNewest(a, b);
  };
}

function matchesQuery(listing: Listing, query: string) {
  const text = [
    listing.title,
    listing.brand,
    listing.model,
    listing.trim_name || "",
    listing.province,
    listing.city,
    listing.neighborhood,
    listing.dealer_name || "",
    listing.category_name,
  ].join(" ");

  return normalizeText(text).includes(normalizeText(query));
}

function listingMatchesLocation(
  listing: Listing,
  location: HomeLocationSelection,
) {
  if (location.mode === "all") return true;

  const listingProvince = normalizeText(listing.province);
  const listingCity = normalizeText(listing.city);
  const listingNeighborhood = normalizeText(listing.neighborhood);

  return getHomeLocationScopes(location).some((scope) => {
    if (normalizeText(scope.province) !== listingProvince) return false;
    if (scope.allCities) return true;

    if (scope.cities.some((city) => normalizeText(city) === listingCity)) {
      return true;
    }

    return (scope.areas || []).some((area) => {
      if (normalizeText(area.city) !== listingCity) return false;
      if (area.allNeighborhoods) return true;
      return area.neighborhoods.some(
        (neighborhood) => normalizeText(neighborhood) === listingNeighborhood,
      );
    });
  });
}

function buildListingsApiUrls(location: HomeLocationSelection) {
  const scopes = getHomeLocationScopes(location);
  const nationwideUrl = `${API_BASE_URL}?${new URLSearchParams({ limit: "100", sort: "vip" }).toString()}`;

  if (location.mode === "all" || scopes.length === 0) {
    return [nationwideUrl];
  }

  return [nationwideUrl, ...Array.from(new Set(scopes.map((scope) => scope.province))).map(
    (province) => {
      const params = new URLSearchParams({
        limit: "100",
        sort: "vip",
        province,
      });
      return `${API_BASE_URL}?${params.toString()}`;
    },
  )];
}

function buildCatalogApiUrls(
  segment: "luxury" | "freezone",
  location: HomeLocationSelection,
) {
  const provinces = location.mode === "all"
    ? []
    : Array.from(new Set(getHomeLocationScopes(location).map((scope) => scope.province)));
  const scopes = provinces.length ? ["", ...provinces] : [""];

  return scopes.map((province) => {
    const params = new URLSearchParams({ segment, limit: "100", sort: "vip" });
    if (province) params.set("province", province);
    return `/api/catalog?${params.toString()}`;
  });
}

async function fetchListingPayloads(urls: string[], signal: AbortSignal) {
  return Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as ApiResponse;
    }),
  );
}

function mergeListings(payloads: ApiResponse[]) {
  const merged = new Map<number | string, Listing>();
  payloads.forEach((payload) => {
    if (!payload.success || !Array.isArray(payload.data)) return;
    payload.data.forEach((listing) => {
      merged.set(listing.id, listing);
    });
  });
  return Array.from(merged.values());
}

function resolveListingsForLocation(listings: Listing[], location: HomeLocationSelection) {
  if (location.mode === "all") {
    return { localItems: listings, nationwideItems: [], label: "سراسر ایران" };
  }

  const localItems = listings.filter((item) => listingMatchesLocation(item, location));
  const nationwideItems = localItems.length < 9
    ? listings.filter((item) => !listingMatchesLocation(item, location))
    : [];

  return { localItems, nationwideItems, label: location.label };
}

function ShowcaseSection({
  id,
  kicker,
  title,
  description,
  listings,
  nationwideListings,
  badge,
  tone,
  allHref,
  status,
  locationLabel,
}: {
  id: string;
  kicker: string;
  title: string;
  description: string;
  listings: Listing[];
  nationwideListings: Listing[];
  badge: string;
  tone: Tone;
  allHref: string;
  status: LoadStatus;
  locationLabel: string;
}) {
  const hasListings = listings.length > 0;
  const hasNationwideFallback = nationwideListings.length > 0;
  const showEmptyState = status !== "loading" && !hasListings;

  return (
    <section
      className={`masterSection masterSection--${tone} masterSectionWithAll`}
      id={id}
    >
      <div className="masterSectionHeader">
        <div className="masterSectionTitleBlock">
          <div className="masterSectionTitleRow">
            <span>{kicker}</span>
            <Link
              className="masterShowAllLink"
              href={allHref}
              aria-label={`نمایش همه ${title}`}
            >
              نمایش همه <span aria-hidden="true">←</span>
            </Link>
          </div>
        </div>

        <div className="masterSectionHeaderSide">
          <p>
            {description} <b>{locationLabel}</b>
          </p>
        </div>
      </div>

      <HomeHorizontalRail
        ariaLabel={title}
        className={`homeRailShell--${tone}`}
        showControls={hasListings && listings.length + nationwideListings.length > 3}
      >
        {status === "loading"
          ? [0, 1, 2].map((index) => (
              <HomeVehicleCardFallback
                key={`${tone}-${index}`}
                tone={tone}
                href={allHref}
                status={status}
                locationLabel={locationLabel}
                index={index}
              />
            ))
          : listings.map((listing) => (
              <HomeVehicleCard
                key={listing.id}
                listing={listing}
                badge={badge}
                tone={tone}
              />
            ))}
        {showEmptyState || hasNationwideFallback ? (
          <aside
            className={`homeLocationBoundary homeLocationBoundary--${tone}`}
            aria-label="مرز آگهی‌های محدوده و سراسر ایران"
          >
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M19 12H5m5-5-5 5 5 5" />
              </svg>
            </i>
            <strong>
              {showEmptyState
                ? "بدون آگهی محلی"
                : "پایان محدوده"}
            </strong>
            {hasNationwideFallback ? <span>ادامه سراسری</span> : null}
          </aside>
        ) : null}
        {nationwideListings.map((listing) => (
          <HomeVehicleCard
            key={`nationwide-${listing.id}`}
            listing={listing}
            badge={badge}
            tone={tone}
          />
        ))}
      </HomeHorizontalRail>
    </section>
  );
}

export default function HomePublicListingsClient({ query }: { query: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [luxuryListings, setLuxuryListings] = useState<Listing[]>([]);
  const [freezoneListings, setFreezoneListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<SelectedPlacement[]>([]);
  const [location, setLocation] = useState<HomeLocationSelection>(
    DEFAULT_HOME_LOCATION,
  );
  const [locationReady, setLocationReady] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    setLocation(loadHomeLocation());
    setLocationReady(true);

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    return () =>
      window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
  }, []);

  useEffect(() => {
    if (!locationReady) return;

    const controller = new AbortController();

    async function load() {
      setListings([]);
      setLuxuryListings([]);
      setFreezoneListings([]);
      setSelected([]);
      setStatus("loading");

      try {
        const [payloads, luxuryPayloads, freezonePayloads, selectedResponse] = await Promise.all([
          fetchListingPayloads(buildListingsApiUrls(location), controller.signal).catch(() => []),
          fetchListingPayloads(buildCatalogApiUrls("luxury", location), controller.signal).catch(() => []),
          fetchListingPayloads(buildCatalogApiUrls("freezone", location), controller.signal).catch(() => []),
          fetch("/api/selected/active", {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }).catch(() => null),
        ]);

        if (selectedResponse?.ok) {
          const selectedPayload = (await selectedResponse.json()) as SelectedResponse;
          if (selectedPayload.success && Array.isArray(selectedPayload.data)) {
            setSelected(selectedPayload.data);
          }
        }

        setListings(mergeListings(payloads));
        setLuxuryListings(mergeListings(luxuryPayloads));
        setFreezoneListings(mergeListings(freezonePayloads));
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setListings([]);
          setLuxuryListings([]);
          setFreezoneListings([]);
          setSelected([]);
          setStatus("error");
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [location, locationReady]);

  const data = useMemo(() => {
    const sorted = [...listings].sort(byNewest);
    const luxuryOrder = selectedOrder(selected, "luxury");
    const freezoneOrder = selectedOrder(selected, "freezone");
    const luxuryResolved = resolveListingsForLocation(luxuryListings, location);
    const freezoneResolved = resolveListingsForLocation(freezoneListings, location);

    return {
      luxury: [...luxuryResolved.localItems].sort(bySelectedThenNewest(luxuryOrder)),
      luxuryNationwide: [...luxuryResolved.nationwideItems].sort(bySelectedThenNewest(luxuryOrder)),
      luxuryLabel: luxuryResolved.label,
      freezone: [...freezoneResolved.localItems].sort(bySelectedThenNewest(freezoneOrder)),
      freezoneNationwide: [...freezoneResolved.nationwideItems].sort(bySelectedThenNewest(freezoneOrder)),
      freezoneLabel: freezoneResolved.label,
      searchResults: query
        ? sorted.filter((item) => matchesQuery(item, query)).slice(0, 12)
        : [],
    };
  }, [freezoneListings, listings, location, luxuryListings, query, selected]);

  return (
    <>
      {query ? (
        <section className="masterSection masterSearchResults">
          <div className="masterSectionHeader">
            <div>
              <span>نتیجه جست‌وجو</span>
              <h2>نتایج برای «{query}»</h2>
            </div>
            <Link className="masterClearSearch" href="/">
              پاک‌کردن جست‌وجو
            </Link>
          </div>

          {status === "loading" ? (
            <div className="masterEmptyShowcase">
              <strong>در حال دریافت نتایج…</strong>
            </div>
          ) : data.searchResults.length === 0 ? (
            <div className="masterEmptyShowcase">
              <span>⌕</span>
              <strong>نتیجه‌ای پیدا نشد</strong>
              <p>
                نام برند، مدل، شهر یا نمایشگاه را با عبارت دیگری جست‌وجو کن.
              </p>
            </div>
          ) : (
            <div className="masterListingGrid">
              {data.searchResults.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  badge="نتیجه جست‌وجو"
                  tone="neutral"
                  variant="grid"
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <ShowcaseSection
            id="luxury"
            kicker="خودروهای لوکس"
            title="خودروهای لوکس منتخب"
            description="خودروهای ممتاز بر اساس برند، قیمت و کیفیت آگهی در اولویت نمایش قرار می‌گیرند."
            listings={data.luxury}
            nationwideListings={data.luxuryNationwide}
            badge="لوکس"
            tone="luxury"
            allHref="/cars/luxury"
            status={status}
            locationLabel={data.luxuryLabel}
          />

          <ShowcaseSection
            id="freezone"
            kicker="خودروهای منطقه آزاد"
            title="خودروهای منطقه آزاد"
            description="ویترین اختصاصی خودروهای مناطق آزاد با امکان بررسی سریع آگهی‌ها."
            listings={data.freezone}
            nationwideListings={data.freezoneNationwide}
            badge="منطقه آزاد"
            tone="freezone"
            allHref="/cars/free-zone"
            status={status}
            locationLabel={data.freezoneLabel}
          />
        </>
      )}
    </>
  );
}
