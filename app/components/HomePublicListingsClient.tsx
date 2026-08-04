// CHAKOD_HOME_LOCATION_MULTI_REGION_V3
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

function normalizeLocationValue(value: string) {
  return normalizeText(String(value || ""));
}

function listingMatchesLocation(
  listing: Listing,
  location: HomeLocationSelection,
) {
  if (location.mode === "all") return true;

  const scopes = getHomeLocationScopes(location);
  const listingProvince = normalizeLocationValue(listing.province);
  const listingCity = normalizeLocationValue(listing.city);

  return scopes.some((scope) => {
    if (normalizeLocationValue(scope.province) !== listingProvince) return false;
    if (scope.allCities) return true;

    return scope.cities.some(
      (city) => normalizeLocationValue(city) === listingCity,
    );
  });
}

function buildListingsApiUrls(location: HomeLocationSelection) {
  const scopes = getHomeLocationScopes(location);

  if (location.mode === "all" || scopes.length === 0) {
    return [
      `${API_BASE_URL}?${new URLSearchParams({
        limit: "50",
        sort: "vip",
      }).toString()}`,
    ];
  }

  return Array.from(new Set(scopes.map((scope) => scope.province))).map(
    (province) => {
      const params = new URLSearchParams({
        limit: "50",
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
}: {
  id: string;
  kicker: string;
  title: string;
  description: string;
  listings: Listing[];
  badge: string;
  tone: Tone;
  allHref: string;
}) {
  if (listings.length === 0) return null;
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
            <a
              className="masterShowAllLink"
              href={allHref}
              aria-label={`نمایش همه ${title}`}
            >
              نمایش همه <span aria-hidden="true">←</span>
            </a>
          </div>
        </div>
        <div className="masterSectionHeaderSide">
          <p>{description}</p>
        </div>
      </div>
      <HomeHorizontalRail
        ariaLabel={title}
        className={`homeRailShell--${tone}`}
        showControls={listings.length > 3}
      >
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            badge={badge}
            tone={tone}
            variant="rail"
          />
        ))}
      </HomeHorizontalRail>
    </section>
  );
}

export default function HomePublicListingsClient({ query }: { query: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [location, setLocation] = useState<HomeLocationSelection>(
    DEFAULT_HOME_LOCATION,
  );
  const [locationReady, setLocationReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    setLocation(loadHomeLocation());
    setLocationReady(true);

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);

    return () => {
      window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    };
  }, []);

  useEffect(() => {
    if (!locationReady) return;

    const controller = new AbortController();

    async function load() {
      setStatus("loading");

      try {
        const payloads = await Promise.all(
          buildListingsApiUrls(location).map(async (url) => {
            const response = await fetch(url, {
              cache: "no-store",
              headers: { Accept: "application/json" },
              signal: controller.signal,
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return (await response.json()) as ApiResponse;
          }),
        );

        const merged = new Map<number | string, Listing>();

        for (const payload of payloads) {
          if (!payload.success || !Array.isArray(payload.data)) continue;

          for (const listing of payload.data) {
            if (listingMatchesLocation(listing, location)) {
              merged.set(listing.id, listing);
            }
          }
        }

        setListings(Array.from(merged.values()));
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }

    void load();

    return () => controller.abort();
  }, [location, locationReady]);

  const data = useMemo(() => {
    const sorted = [...listings].sort(byNewest);
    const freezone = sorted.filter(isFreezone).slice(0, 9);
    const luxury = sorted.filter(isLuxury).slice(0, 9);
    const searchResults = query
      ? sorted.filter((item) => matchesQuery(item, query)).slice(0, 12)
      : [];
    return {
      freezone,
      luxury,
      searchResults,
    };
  }, [listings, query]);

  if (status === "loading") {
    return (
      <div className="masterHomeDataLoading" aria-live="polite">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (status === "error" || listings.length === 0) {
    return null;
  }

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
          {data.searchResults.length === 0 ? (
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
            kicker="CHAKOD LUXURY"
            title="منتخب خودروهای لوکس"
            description="خودروهای ممتاز بر اساس برند، قیمت و کیفیت آگهی در اولویت نمایش قرار می‌گیرند."
            listings={data.luxury}
            badge="منتخب لوکس"
            tone="luxury"
            allHref="/cars/luxury"
          />
          <ShowcaseSection
            id="freezone"
            kicker="FREE ZONE"
            title="تازه‌های منطقه آزاد"
            description="ویترین اختصاصی خودروهای منطقه آزاد؛ جدا از بازار عمومی و قابل بررسی سریع."
            listings={data.freezone}
            badge="منطقه آزاد"
            tone="freezone"
            allHref="/cars/free-zone"
          />
        </>
      )}
    </>
  );
}
