// CHAKOD_MARKET_FILTER_V1
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import AuthStatus from "../../components/AuthStatus";
import CatalogListingsClient from "../../components/CatalogListingsClient";
import MobileBottomNav from "../../components/MobileBottomNav";
import { carMarketPath, legacyAdsRedirect } from "../../../lib/car-routes";
import type {
  CatalogFilters,
  CatalogResponse,
  CatalogSegment,
} from "./catalog-types";
import styles from "./CatalogPage.module.css";
import chrome from "./CatalogChrome.module.css";

const API_URL = "https://api.chakod.com/api/listings.php";

type SearchParams = Record<string, string | string[] | undefined>;

type SegmentConfig = {
  title: string;
  shortTitle: string;
  kicker: string;
  description: string;
  badge: string;
  accent: string;
  accentDark: string;
  soft: string;
};

const segmentConfig: Record<CatalogSegment, SegmentConfig> = {
  all: {
    title: "بازار خودرو چاکود",
    shortTitle: "همه خودروها",
    kicker: "بازار خودرو",
    description:
      "جست‌وجوی دقیق میان آگهی‌های تأییدشده؛ از برند و مدل تا قیمت، سال، کارکرد و موقعیت.",
    badge: "بازار چاکود",
    accent: "#6d28d9",
    accentDark: "#35134f",
    soft: "#f4effd",
  },
  luxury: {
    title: "خودروهای لوکس چاکود",
    shortTitle: "لوکس",
    kicker: "خودروهای لوکس",
    description:
      "خودروهای ممتاز، برندهای لوکس و آگهی‌های ارزشمند بازار در یک فهرست حرفه‌ای.",
    badge: "منتخب لوکس",
    accent: "#7c3aed",
    accentDark: "#321052",
    soft: "#f4edff",
  },
  freezone: {
    title: "خودروهای منطقه آزاد",
    shortTitle: "منطقه آزاد",
    kicker: "منطقه آزاد",
    description:
      "آگهی‌های مرتبط با مناطق آزاد، پلاک‌های ویژه و فروشندگان تخصصی این بازار.",
    badge: "منطقه آزاد",
    accent: "#0f8f83",
    accentDark: "#07554f",
    soft: "#e9fbf8",
  },
  economic: {
    title: "خودروهای اقتصادی",
    shortTitle: "اقتصادی",
    kicker: "خودروهای اقتصادی",
    description:
      "گزینه‌های اقتصادی و کاربردی بازار با امکان مقایسه سریع قیمت، سال و کارکرد.",
    badge: "ارزش خرید",
    accent: "#d97706",
    accentDark: "#7a3d04",
    soft: "#fff5dc",
  },
};

const filterKeys: Array<keyof Omit<CatalogFilters, "page">> = [
  "q",
  "province",
  "city",
  "category",
  "brand",
  "model",
  "minPrice",
  "maxPrice",
  "minYear",
  "maxYear",
  "minMileage",
  "maxMileage",
  "bodyStatus",
  "transmission",
  "fuelType",
  "sellerType",
  "sort",
];

const apiParamNames: Record<(typeof filterKeys)[number], string> = {
  q: "q",
  province: "province",
  city: "city",
  category: "category",
  brand: "brand",
  model: "model",
  minPrice: "min_price",
  maxPrice: "max_price",
  minYear: "min_year",
  maxYear: "max_year",
  minMileage: "min_mileage",
  maxMileage: "max_mileage",
  bodyStatus: "body_status",
  transmission: "transmission",
  fuelType: "fuel_type",
  sellerType: "seller_type",
  sort: "sort",
};

function readParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function normalizeNumber(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
}

function readFilters(params: SearchParams): CatalogFilters {
  const sort = readParam(params, "sort");

  return {
    q: readParam(params, "q"),
    province: readParam(params, "province"),
    city: readParam(params, "city"),
    category: readParam(params, "category"),
    brand: readParam(params, "brand"),
    model: readParam(params, "model"),
    minPrice: readParam(params, "min_price"),
    maxPrice: readParam(params, "max_price"),
    minYear: readParam(params, "min_year"),
    maxYear: readParam(params, "max_year"),
    minMileage: readParam(params, "min_mileage"),
    maxMileage: readParam(params, "max_mileage"),
    bodyStatus: readParam(params, "body_status"),
    transmission: readParam(params, "transmission"),
    fuelType: readParam(params, "fuel_type"),
    sellerType: readParam(params, "seller_type"),
    sort: sort || "vip",
    page: Math.max(1, Number(normalizeNumber(readParam(params, "page"))) || 1),
  };
}

function buildApiUrl(segment: CatalogSegment, filters: CatalogFilters) {
  const url = new URL(API_URL);
  url.searchParams.set("segment", segment);
  url.searchParams.set("limit", "12");
  url.searchParams.set("page", String(filters.page));

  filterKeys.forEach((key) => {
    const value = filters[key];
    if (value) url.searchParams.set(apiParamNames[key], String(value));
  });

  return url.toString();
}

async function fetchCatalog(apiUrl: string): Promise<CatalogResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4200);

  try {
    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as CatalogResponse;

    if (!payload?.success || !Array.isArray(payload.data)) return null;
    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  const config = segmentConfig[segment as CatalogSegment];

  if (!config) return {};

  return {
    title: config.title,
    description: config.description,
  };
}

export default async function SegmentCatalogPage({
  params,
  searchParams,
  canonical = false,
}: {
  params: Promise<{ segment: string }>;
  searchParams?: Promise<SearchParams>;
  canonical?: boolean;
}) {
  const { segment: rawSegment } = await params;
  const segment = rawSegment as CatalogSegment;
  const config = segmentConfig[segment];

  if (!config) notFound();

  const resolvedSearchParams = (await searchParams) || {};

  if (!canonical) {
    permanentRedirect(legacyAdsRedirect(segment, resolvedSearchParams));
  }

  const filters = readFilters(resolvedSearchParams);
  const apiUrl = buildApiUrl(segment, filters);
  const clientApiUrl = `/api/catalog?${new URL(apiUrl).searchParams.toString()}`;
  const initialResponse = await fetchCatalog(apiUrl);

  const cssVars = {
    "--accent": config.accent,
    "--accent-dark": config.accentDark,
    "--soft": config.soft,
  } as CSSProperties;

  return (
    <main className={styles.page} dir="rtl" style={cssVars}>
      <header className={chrome.header}>
        <div className={chrome.headerInner}>
          <Link className={chrome.brand} href="/" aria-label="صفحه اصلی چاکود">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={chrome.logo}
              src="/brand/chakod-logo-horizontal.png"
              alt="چاکود"
            />
          </Link>

          <nav className={chrome.primaryNav} aria-label="ناوبری اصلی چاکود">
            <Link className={chrome.activeNav} href="/cars">
              خودروها
            </Link>
            <Link href="/dealerships">نمایشگاه‌ها</Link>
            <Link href="/businesses">کسب‌وکارها</Link>
          </nav>

          <div className={chrome.actions}>
            <Link className={chrome.savedLink} href="/account/saved">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.25 4.75A1.75 1.75 0 0 1 9 3h6a1.75 1.75 0 0 1 1.75 1.75v15L12 16.6l-4.75 3.15v-15Z" />
              </svg>
              <b>نشان</b>
            </Link>
            <div className={chrome.accountStatus}>
              <AuthStatus />
            </div>
          </div>
        </div>
      </header>

      <section className={chrome.hero}>
        <span className={chrome.kicker}>{config.kicker}</span>
        <h1>{config.title}</h1>
        <p>{config.description}</p>
      </section>

      <nav className={chrome.segmentNav} aria-label="بخش‌های بازار خودرو">
        {(Object.keys(segmentConfig) as CatalogSegment[]).map((key) => (
          <Link
            key={key}
            className={key === segment ? chrome.segmentActive : undefined}
            href={carMarketPath(key)}
          >
            {segmentConfig[key].shortTitle}
          </Link>
        ))}
      </nav>

      <section className={chrome.browser} aria-label={config.title}>
        <CatalogListingsClient
          key={apiUrl}
          clientApiUrl={clientApiUrl}
          segment={segment}
          badge={config.badge}
          filters={filters}
          initialResponse={initialResponse}
        />
      </section>
      <MobileBottomNav />
    </main>
  );
}
