"use client";

import { useEffect, useMemo, useState } from "react";
import ListingCard, { type ListingCardData } from "./ListingCard";
import CatalogFilterPanel from "../ads/[segment]/CatalogFilterPanel";

const API_URL = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";
const PAGE_SIZE = 12;

type Listing = ListingCardData & {
  brand: string;
  model: string;
  title: string;
  city: string;
  province: string;
  neighborhood: string;
  category_code: string;
  category_name: string;
  created_at: string;
  views_count: number;
  market_segment?: "luxury" | "freezone" | "economic" | "regular" | null;
};

type ApiResponse = {
  success?: boolean;
  data?: Listing[];
};

type Props = {
  segment: "luxury" | "freezone" | "economic";
  badge: string;
  query: string;
  city: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  page: number;
};

const luxuryBrands = [
  "porsche", "پورشه", "mercedesbenz", "مرسدسبنز", "bmw", "بیامو",
  "audi", "آئودی", "lexus", "لکسوس", "landrover", "لندرور",
  "rangerover", "رنجروور", "jaguar", "جگوار", "volvo", "ولوو",
  "maserati", "مازراتی", "ferrari", "فراری", "lamborghini", "لامبورگینی",
  "bentley", "بنتلی", "rollsroyce", "رولزرویس", "astonmartin", "استونمارتین",
  "mclaren", "مکلارن", "maybach", "مایباخ", "tesla", "تسلا",
  "genesis", "جنسیس", "infiniti", "اینفینیتی", "cadillac", "کادیلاک",
  "hongqi", "هونگچی", "tank", "تانک", "fownix", "فونیکس",
  "extreme", "اکستریم", "lucano", "لوکانو",
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
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function includesAny(value: string, needles: string[]) {
  const normalizedValue = normalizeText(value);
  return needles.some((needle) => normalizedValue.includes(normalizeText(needle)));
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
      "freezone", "منطقه آزاد", "کیش", "قشم", "اروند", "انزلی",
      "ارس", "ماکو", "چابهار",
    ])
  );
}

function isLuxury(listing: Listing) {
  const combined = `${listing.brand} ${listing.model} ${listing.title}`;
  return (
    !isFreezone(listing) &&
    (listing.market_segment === "luxury" ||
      listing.category_code === "luxury" ||
      includesAny(combined, luxuryBrands) ||
      Number(listing.price_toman || 0) >= 2_000_000_000)
  );
}

function isEconomic(listing: Listing) {
  const price = Number(listing.price_toman || 0);
  return (
    listing.market_segment === "economic" ||
    (price > 0 && price <= 1_500_000_000 && !isFreezone(listing) && !isLuxury(listing))
  );
}

function parseNumber(value: string) {
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : 0;
}

function buildPageHref(props: Props, nextPage: number) {
  const params = new URLSearchParams();
  for (const [key, value] of [
    ["q", props.query],
    ["city", props.city],
    ["brand", props.brand],
    ["min_price", props.minPrice],
    ["max_price", props.maxPrice],
    ["sort", props.sort],
  ]) {
    if (value) params.set(key, value);
  }
  params.set("page", String(nextPage));
  return `/ads/${props.segment}?${params.toString()}`;
}

export default function CatalogListingsClient(props: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setStatus("loading");
        const response = await fetch(API_URL, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as ApiResponse;
        if (!payload.success || !Array.isArray(payload.data)) {
          throw new Error("Invalid API response");
        }
        setListings(payload.data);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const result = useMemo(() => {
    const segmentListings = listings.filter((listing) => {
      if (props.segment === "luxury") return isLuxury(listing);
      if (props.segment === "freezone") return isFreezone(listing);
      return isEconomic(listing);
    });

    const cities = Array.from(
      new Set(segmentListings.map((listing) => listing.city).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "fa"));
    const brands = Array.from(
      new Set(segmentListings.map((listing) => listing.brand).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "fa"));

    const minPrice = parseNumber(props.minPrice);
    const maxPrice = parseNumber(props.maxPrice);
    const filtered = segmentListings.filter((listing) => {
      const searchText = normalizeText(
        [listing.title, listing.brand, listing.model, listing.city, listing.dealer_name || ""].join(" "),
      );
      const price = Number(listing.price_toman || 0);

      if (props.query && !searchText.includes(normalizeText(props.query))) return false;
      if (props.city && listing.city !== props.city) return false;
      if (props.brand && listing.brand !== props.brand) return false;
      if (minPrice && price < minPrice) return false;
      if (maxPrice && price > maxPrice) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (props.sort === "cheap") return Number(a.price_toman || Infinity) - Number(b.price_toman || Infinity);
      if (props.sort === "expensive") return Number(b.price_toman || 0) - Number(a.price_toman || 0);
      if (props.sort === "popular") return Number(b.views_count || 0) - Number(a.views_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, props.page), totalPages);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return { cities, brands, filtered, totalPages, safePage, visible };
  }, [listings, props]);

  return (
    <>
      <CatalogFilterPanel
        segment={props.segment}
        resultCount={status === "ready" ? result.filtered.length : 0}
        query={props.query}
        city={props.city}
        brand={props.brand}
        minPrice={props.minPrice}
        maxPrice={props.maxPrice}
        sort={props.sort}
        cities={result.cities}
        brands={result.brands}
      />

      <section className="catalogResults" aria-live="polite">
        {status === "loading" ? (
          <div className="catalogEmpty">
            <span>◌</span>
            <strong>در حال دریافت آگهی‌ها</strong>
            <p>اطلاعات مستقیم از بازار چاکود بارگذاری می‌شود.</p>
          </div>
        ) : status === "error" ? (
          <div className="catalogEmpty">
            <span>!</span>
            <strong>ارتباط با فهرست آگهی‌ها برقرار نشد</strong>
            <p>اتصال اینترنت یا دسترسی مرورگر به API را بررسی کن.</p>
            <button type="button" onClick={() => window.location.reload()}>
              تلاش دوباره
            </button>
          </div>
        ) : result.visible.length === 0 ? (
          <div className="catalogEmpty">
            <span>⌕</span>
            <strong>آگهی مطابق فیلترها پیدا نشد</strong>
            <p>فیلترها را تغییر بده یا بدون فیلتر در چاکود بگرد.</p>
            <a href={`/ads/${props.segment}`}>نمایش همه آگهی‌های این بخش</a>
          </div>
        ) : (
          <div className="catalogGrid">
            {result.visible.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                tone={props.segment}
                badge={props.badge}
                variant="grid"
              />
            ))}
          </div>
        )}

        {status === "ready" && result.totalPages > 1 ? (
          <nav className="catalogPagination" aria-label="صفحه‌بندی آگهی‌ها">
            {result.safePage > 1 ? (
              <a href={buildPageHref(props, result.safePage - 1)}>صفحه قبل</a>
            ) : <span />}
            <strong>
              صفحه {new Intl.NumberFormat("fa-IR").format(result.safePage)} از {new Intl.NumberFormat("fa-IR").format(result.totalPages)}
            </strong>
            {result.safePage < result.totalPages ? (
              <a href={buildPageHref(props, result.safePage + 1)}>صفحه بعد</a>
            ) : <span />}
          </nav>
        ) : null}
      </section>
    </>
  );
}
