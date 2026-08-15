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

const luxuryBrands = [
  "porsche",
  "پورشه",
  "mercedesbenz",
  "مرسدسبنز",
  "bmw",
  "بیامو",
  "audi",
  "آئودی",
  "lexus",
  "لکسوس",
  "landrover",
  "لندرور",
  "rangerover",
  "رنجروور",
  "jaguar",
  "جگوار",
  "volvo",
  "ولوو",
  "maserati",
  "مازراتی",
  "ferrari",
  "فراری",
  "lamborghini",
  "لامبورگینی",
  "bentley",
  "بنتلی",
  "rollsroyce",
  "رولزرویس",
  "astonmartin",
  "استونمارتین",
  "mclaren",
  "مکلارن",
  "maybach",
  "مایباخ",
  "tesla",
  "تسلا",
  "genesis",
  "جنسیس",
  "infiniti",
  "اینفینیتی",
  "cadillac",
  "کادیلاک",
  "hongqi",
  "هونگچی",
  "tank",
  "تانک",
  "fownix",
  "فونیکس",
  "extreme",
  "اکستریم",
  "lucano",
  "لوکانو",
];

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

function includesAny(value: string, needles: string[]) {
  const normalizedValue = normalizeText(value);
  return needles.some((needle) =>
    normalizedValue.includes(normalizeText(needle)),
  );
}

function isFreezone(listing: Listing) {
  const text = [
    listing.market_segment || "",
    listing.category_code,
    listing.category_name,
    listing.title,
    listing.province,
    listing.city,
  ].join(" ");

  return (
    listing.market_segment === "freezone" ||
    includesAny(text, [
      "freezone",
      "منطقه آزاد",
      "کیش",
      "قشم",
      "اروند",
      "انزلی",
      "ارس",
      "ماکو",
      "چابهار",
    ])
  );
}

function isLuxury(listing: Listing) {
  return (
    !isFreezone(listing) &&
    (listing.market_segment === "luxury" ||
      listing.category_code === "luxury" ||
      includesAny(
        `${listing.brand} ${listing.model} ${listing.title}`,
        luxuryBrands,
      ) ||
      Number(listing.price_toman || 0) >= 2_000_000_000)
  );
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

  if (location.mode === "all" || scopes.length === 0) {
    return [
      `${API_BASE_URL}?${new URLSearchParams({
        limit: "100",
        sort: "vip",
      }).toString()}`,
    ];
  }

  return Array.from(new Set(scopes.map((scope) => scope.province))).map(
    (province) => {
      const params = new URLSearchParams({
        limit: "100",
        sort: "vip",
        province,
      });
      return `${API_BASE_URL}?${params.toString()}`;
    },
  );
}

function ShowcaseSection({
  id,
  kicker,
  title,
  description,
  listings,
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
  badge: string;
  tone: Tone;
  allHref: string;
  status: LoadStatus;
  locationLabel: string;
}) {
  const hasListings = listings.length > 0;

  return (
    <section
      className={`masterSection masterSection--${tone} masterSectionWithAll`}
      id={id}
    >
      <div className="masterSectionHeader">
        <div className="masterSectionTitleBlock">
          <span>{kicker}</span>
          <div className="masterSectionTitleRow">
            <h2>{title}</h2>
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
        showControls={hasListings && listings.length > 3}
      >
        {hasListings
          ? listings.map((listing) => (
              <HomeVehicleCard
                key={listing.id}
                listing={listing}
                badge={badge}
                tone={tone}
              />
            ))
          : [0, 1, 2].map((index) => (
              <HomeVehicleCardFallback
                key={`${tone}-${index}`}
                tone={tone}
                href={allHref}
                status={status}
                locationLabel={locationLabel}
                index={index}
              />
            ))}
      </HomeHorizontalRail>
    </section>
  );
}

export default function HomePublicListingsClient({ query }: { query: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
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
      setSelected([]);
      setStatus("loading");

      try {
        const [payloads, selectedResponse] = await Promise.all([
          Promise.all(
            buildListingsApiUrls(location).map(async (url) => {
              const response = await fetch(url, {
                cache: "no-store",
                headers: { Accept: "application/json" },
                signal: controller.signal,
              });

              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return (await response.json()) as ApiResponse;
            }),
          ),
          fetch("/api/selected/active", {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }).catch(() => null),
        ]);

        const merged = new Map<number | string, Listing>();

        for (const payload of payloads) {
          if (!payload.success || !Array.isArray(payload.data)) continue;

          for (const listing of payload.data) {
            if (listingMatchesLocation(listing, location)) {
              merged.set(listing.id, listing);
            }
          }
        }

        if (selectedResponse?.ok) {
          const selectedPayload = (await selectedResponse.json()) as SelectedResponse;
          if (selectedPayload.success && Array.isArray(selectedPayload.data)) {
            setSelected(selectedPayload.data);
          }
        }

        setListings(Array.from(merged.values()));
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setListings([]);
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

    return {
      luxury: sorted.filter(isLuxury).sort(bySelectedThenNewest(luxuryOrder)).slice(0, 9),
      freezone: sorted.filter(isFreezone).sort(bySelectedThenNewest(freezoneOrder)).slice(0, 9),
      searchResults: query
        ? sorted.filter((item) => matchesQuery(item, query)).slice(0, 12)
        : [],
    };
  }, [listings, query, selected]);

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
            badge="منتخب لوکس"
            tone="luxury"
            allHref="/cars/luxury"
            status={status}
            locationLabel={location.label || "سراسر ایران"}
          />

          <ShowcaseSection
            id="freezone"
            kicker="خودروهای منطقه آزاد"
            title="خودروهای منطقه آزاد"
            description="ویترین اختصاصی خودروهای مناطق آزاد با امکان بررسی سریع آگهی‌ها."
            listings={data.freezone}
            badge="منطقه آزاد"
            tone="freezone"
            allHref="/cars/free-zone"
            status={status}
            locationLabel={location.label || "سراسر ایران"}
          />
        </>
      )}
    </>
  );
}
