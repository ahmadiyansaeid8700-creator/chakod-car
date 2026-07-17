import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import ListingCard from "../../components/ListingCard";
import CatalogListingsClient from "../../components/CatalogListingsClient";
import CatalogFilterPanel from "./CatalogFilterPanel";

const API_BASE = "https://api.chakod.com";
const PAGE_SIZE = 12;

type Listing = {
  id: number;
  title: string;
  brand: string;
  model: string;
  trim_name: string | null;
  production_year: number | null;
  mileage_km: number | null;
  price_toman: number | null;
  province: string;
  city: string;
  neighborhood: string;
  body_status: string;
  transmission: string;
  seller_type: string;
  views_count: number;
  created_at: string;
  category_code: string;
  category_name: string;
  dealer_name: string | null;
  cover_image: string | null;
  market_segment?: "luxury" | "freezone" | "economic" | "regular" | null;
};

type ListingsResponse = {
  success: boolean;
  data: Listing[];
};

type SearchParams = Record<string, string | string[] | undefined>;

type SegmentConfig = {
  title: string;
  kicker: string;
  description: string;
  badge: string;
  accent: string;
  soft: string;
};

const segmentConfig: Record<string, SegmentConfig> = {
  luxury: {
    title: "خودروهای لوکس چاکود",
    kicker: "CHAKOD LUXURY",
    description: "فهرست کامل خودروهای ممتاز با امکان جست‌وجو، فیلتر و مرتب‌سازی.",
    badge: "منتخب لوکس",
    accent: "#6d28d9",
    soft: "#f3edff",
  },
  freezone: {
    title: "خودروهای منطقه آزاد",
    kicker: "FREE ZONE",
    description: "آگهی‌های ویژه مناطق آزاد در یک فهرست عمودی و قابل بررسی.",
    badge: "منطقه آزاد",
    accent: "#0f766e",
    soft: "#e8fbf8",
  },
  economic: {
    title: "خودروهای اقتصادی",
    kicker: "SMART VALUE",
    description: "گزینه‌های ارزشمند بازار با تمرکز بر قیمت، سال و کیفیت آگهی.",
    badge: "ارزش خرید",
    accent: "#a16207",
    soft: "#fff8df",
  },
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
  return value
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

function isLuxury(listing: Listing) {
  const combined = `${listing.brand} ${listing.model} ${listing.title}`;
  return (
    listing.market_segment === "luxury" ||
    listing.category_code === "luxury" ||
    includesAny(combined, luxuryBrands) ||
    Number(listing.price_toman || 0) >= 2_000_000_000
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
      "freezone", "منطقه آزاد", "کیش", "قشم", "اروند", "انزلی",
      "ارس", "ماکو", "چابهار",
    ])
  );
}

function isEconomic(listing: Listing) {
  const price = Number(listing.price_toman || 0);
  return (
    listing.market_segment === "economic" ||
    (price > 0 && price <= 1_500_000_000 && !isFreezone(listing) && !isLuxury(listing))
  );
}

async function getListings() {
  try {
    const response = await fetch(`${API_BASE}/api/listings.php?limit=100&sort=vip`, {
      cache: "no-store",
    });

    if (!response.ok) return [];
    const json: ListingsResponse = await response.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

function readParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function parseNumber(value: string) {
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : 0;
}

function buildPageHref(
  segment: string,
  params: SearchParams,
  nextPage: number,
) {
  const query = new URLSearchParams();
  for (const key of ["q", "city", "brand", "min_price", "max_price", "sort"]) {
    const value = readParam(params, key);
    if (value) query.set(key, value);
  }
  query.set("page", String(nextPage));
  return `/ads/${segment}?${query.toString()}`;
}

export default async function SegmentCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ segment: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { segment } = await params;
  const config = segmentConfig[segment];
  if (!config) notFound();

  const filters = (await searchParams) || {};
  const query = readParam(filters, "q");
  const city = readParam(filters, "city");
  const brand = readParam(filters, "brand");
  const sort = readParam(filters, "sort") || "newest";
  const minPriceRaw = readParam(filters, "min_price");
  const maxPriceRaw = readParam(filters, "max_price");
  const minPrice = parseNumber(minPriceRaw);
  const maxPrice = parseNumber(maxPriceRaw);
  const page = Math.max(1, parseNumber(readParam(filters, "page")) || 1);

  const allListings = await getListings();
  const segmentListings = allListings.filter((listing) => {
    if (segment === "luxury") return isLuxury(listing);
    if (segment === "freezone") return isFreezone(listing);
    return isEconomic(listing);
  });

  const cities = Array.from(
    new Set(segmentListings.map((listing) => listing.city).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "fa"));
  const brands = Array.from(
    new Set(segmentListings.map((listing) => listing.brand).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "fa"));

  const filtered = segmentListings.filter((listing) => {
    const searchText = normalizeText(
      [listing.title, listing.brand, listing.model, listing.city, listing.dealer_name || ""].join(" "),
    );
    const price = Number(listing.price_toman || 0);

    if (query && !searchText.includes(normalizeText(query))) return false;
    if (city && listing.city !== city) return false;
    if (brand && listing.brand !== brand) return false;
    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === "cheap") return Number(a.price_toman || Infinity) - Number(b.price_toman || Infinity);
    if (sort === "expensive") return Number(b.price_toman || 0) - Number(a.price_toman || 0);
    if (sort === "popular") return Number(b.views_count || 0) - Number(a.views_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleListings = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <main
      className="catalogPage"
      dir="rtl"
      style={{ "--accent": config.accent, "--soft": config.soft } as CSSProperties}
    >
      <header className="catalogHeader">
        <Link className="catalogBrand" href="/">
          <span>چ</span>
          <strong>چاکود</strong>
        </Link>
        <div className="catalogHeaderLinks">
          <Link href="/">خانه</Link>
          <Link href="/showrooms">نمایشگاه‌ها</Link>
          <a className="catalogSubmit" href="/submit">ثبت آگهی</a>
        </div>
      </header>

      <section className="catalogHero">
        <div>
          <span>{config.kicker}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <strong>{allListings.length === 0 ? "در حال دریافت آگهی‌ها" : `${new Intl.NumberFormat("fa-IR").format(filtered.length)} آگهی`}</strong>
      </section>

      <section className="catalogBrowseShell">
        {allListings.length === 0 ? (
          <CatalogListingsClient
            segment={segment as "luxury" | "freezone" | "economic"}
            badge={config.badge}
            query={query}
            city={city}
            brand={brand}
            minPrice={minPriceRaw}
            maxPrice={maxPriceRaw}
            sort={sort}
            page={page}
          />
        ) : (
          <>
            <CatalogFilterPanel
              segment={segment}
              resultCount={filtered.length}
              query={query}
              city={city}
              brand={brand}
              minPrice={minPriceRaw}
              maxPrice={maxPriceRaw}
              sort={sort}
              cities={cities}
              brands={brands}
            />

            <section className="catalogResults" aria-label={config.title}>
              {visibleListings.length === 0 ? (
                <div className="catalogEmpty">
                  <span>⌕</span>
                  <strong>آگهی مطابق فیلترها پیدا نشد</strong>
                  <p>فیلترها را تغییر بده یا بدون فیلتر در چاکود بگرد.</p>
                  <a href={`/ads/${segment}`}>نمایش همه آگهی‌های این بخش</a>
                </div>
              ) : (
                <div className="catalogGrid">
                  {visibleListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      tone={segment as "luxury" | "freezone" | "economic"}
                      badge={config.badge}
                      variant="grid"
                    />
                  ))}
                </div>
              )}

              {totalPages > 1 ? (
                <nav className="catalogPagination" aria-label="صفحه‌بندی آگهی‌ها">
                  {safePage > 1 ? <a href={buildPageHref(segment, filters, safePage - 1)}>صفحه قبل</a> : <span />}
                  <strong>صفحه {new Intl.NumberFormat("fa-IR").format(safePage)} از {new Intl.NumberFormat("fa-IR").format(totalPages)}</strong>
                  {safePage < totalPages ? <a href={buildPageHref(segment, filters, safePage + 1)}>صفحه بعد</a> : <span />}
                </nav>
              ) : null}
            </section>
          </>
        )}
      </section>

      <style>{`
        .catalogPage {
          min-height: 100vh;
          overflow-x: clip;
          color: #191120;
          font-family: Tahoma, Arial, sans-serif;
          background:
            radial-gradient(circle at 90% 8%, var(--soft), transparent 28rem),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 52%, #ffffff 100%);
        }

        .catalogPage * { box-sizing: border-box; }
        .catalogPage a { color: inherit; text-decoration: none; }
        .catalogPage button,
        .catalogPage input,
        .catalogPage select { font: inherit; }

        .catalogHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          min-height: 72px;
          padding: 12px max(20px, calc((100vw - 1220px) / 2));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border-bottom: 1px solid #eee6f7;
          background: rgba(255, 255, 255, 0.93);
          backdrop-filter: blur(16px);
        }

        .catalogBrand {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 15px;
          font-weight: 900;
        }

        .catalogBrand > span {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          color: #ffffff;
          border-radius: 13px;
          background: linear-gradient(135deg, #2f1741, var(--accent));
        }

        .catalogHeaderLinks {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .catalogHeaderLinks > a {
          min-height: 39px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          border-radius: 12px;
        }

        .catalogSubmit { color: #ffffff !important; background: var(--accent); }

        .catalogHero {
          width: min(1220px, calc(100% - 32px));
          margin: 28px auto 16px;
          padding: 26px 28px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--accent) 18%, #ffffff);
          border-radius: 28px;
          background:
            radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--accent) 16%, #ffffff), transparent 34%),
            linear-gradient(145deg, #ffffff, color-mix(in srgb, var(--soft) 72%, #ffffff));
          box-shadow: 0 20px 60px rgba(44, 24, 68, 0.08);
        }

        .catalogHero span {
          color: var(--accent);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .catalogHero h1 { margin: 7px 0 5px; font-size: 32px; line-height: 1.45; }
        .catalogHero p { margin: 0; color: #766b80; font-size: 12px; line-height: 2; }

        .catalogHero > strong {
          flex: 0 0 auto;
          padding: 10px 13px;
          color: var(--accent);
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(44, 24, 68, 0.08);
          font-size: 11px;
        }

        .catalogBrowseShell {
          width: min(1220px, calc(100% - 32px));
          margin: 0 auto 60px;
        }

        .catalogDiscoveryBar {
          position: sticky;
          top: 82px;
          z-index: 35;
          margin-bottom: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid rgba(225, 214, 237, 0.92);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 15px 42px rgba(44, 24, 68, 0.08);
          backdrop-filter: blur(16px);
        }

        .catalogDiscoveryCopy { min-width: 0; display: grid; gap: 3px; }
        .catalogDiscoveryCopy strong { font-size: 12px; }
        .catalogDiscoveryCopy span { color: #7b7085; font-size: 9px; }

        .catalogDiscoveryActions {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .catalogSortPill {
          min-height: 40px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          border-radius: 12px;
          color: #6f6478;
          background: #f8f5fa;
          font-size: 9px;
          font-weight: 800;
        }

        .catalogFilterOpen {
          min-height: 42px;
          padding: 0 14px;
          border: 0;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #ffffff;
          background: linear-gradient(135deg, #2f1741, var(--accent));
          box-shadow: 0 11px 28px color-mix(in srgb, var(--accent) 24%, transparent);
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
        }

        .catalogFilterOpen > span { font-size: 15px; }
        .catalogFilterOpen > b {
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: var(--accent);
          background: #ffffff;
          font-size: 8px;
        }

        .catalogActiveFilters {
          margin: 0 0 14px;
          display: flex;
          gap: 7px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .catalogActiveFilters::-webkit-scrollbar { display: none; }

        .catalogActiveFilters a {
          min-height: 34px;
          flex: 0 0 auto;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid color-mix(in srgb, var(--accent) 20%, #e9def5);
          border-radius: 999px;
          color: var(--accent);
          background: var(--soft);
          font-size: 8px;
          font-weight: 900;
        }

        .catalogActiveFilters a > span { font-size: 14px; line-height: 1; }
        .catalogActiveFilters .catalogClearAllChip { color: #74687d; background: #ffffff; }

        .catalogFilterToggle {
          position: fixed;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .catalogFilterLayer {
          position: fixed;
          inset: 0;
          z-index: 120;
          visibility: hidden;
          opacity: 0;
          transition: opacity 0.22s ease, visibility 0.22s ease;
          pointer-events: none;
        }

        .catalogFilterToggle:checked + .catalogFilterLayer {
          visibility: visible;
          opacity: 1;
          pointer-events: auto;
        }

        .catalogFilterBackdrop {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: rgba(17, 10, 25, 0.46);
          backdrop-filter: blur(4px);
          cursor: pointer;
        }

        .catalogFilterDrawer {
          position: absolute;
          top: 0;
          right: 0;
          width: min(430px, 100%);
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 28px 0 0 28px;
          background: #ffffff;
          box-shadow: -28px 0 80px rgba(20, 10, 31, 0.24);
          transform: translateX(105%);
          transition: transform 0.26s ease;
        }

        .catalogFilterToggle:checked + .catalogFilterLayer .catalogFilterDrawer { transform: translateX(0); }

        .catalogFilterDrawerHeader {
          min-height: 78px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid #eee7f4;
          background: linear-gradient(135deg, #ffffff, var(--soft));
        }

        .catalogFilterDrawerHeader > div { display: grid; gap: 3px; }
        .catalogFilterDrawerHeader span { color: var(--accent); font-size: 8px; font-weight: 900; }
        .catalogFilterDrawerHeader strong { font-size: 17px; }

        .catalogFilterDrawerHeader > .catalogFilterClose {
          width: 40px;
          height: 40px;
          border: 1px solid #e4d9ec;
          border-radius: 13px;
          color: #34253e;
          background: #ffffff;
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
        }

        .catalogFilterClose {
          display: grid;
          place-items: center;
        }

        .catalogFilterForm { min-height: 0; flex: 1; display: flex; flex-direction: column; }

        .catalogFilterFields {
          min-height: 0;
          flex: 1;
          padding: 18px;
          display: grid;
          align-content: start;
          gap: 14px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .catalogFilterFields label { display: grid; gap: 7px; }
        .catalogFilterFields label > span { color: #74687d; font-size: 9px; font-weight: 900; }

        .catalogFilterFields input,
        .catalogFilterFields select {
          width: 100%;
          min-height: 48px;
          padding: 0 12px;
          border: 1px solid #e4d9ec;
          border-radius: 14px;
          outline: none;
          color: #24192d;
          background: #ffffff;
          font-size: 10px;
        }

        .catalogFilterFields input:focus,
        .catalogFilterFields select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--soft);
        }

        .catalogPriceRow { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }

        .catalogFilterFooter {
          padding: 12px 16px max(12px, env(safe-area-inset-bottom));
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 9px;
          border-top: 1px solid #eee7f4;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 -12px 35px rgba(35, 21, 55, 0.08);
        }

        .catalogFilterFooter > a,
        .catalogFilterFooter > button {
          min-height: 48px;
          padding: 0 14px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
        }

        .catalogFilterFooter > a { color: #6f6478; border: 1px solid #e4d9ec; background: #ffffff; }
        .catalogFilterFooter > button { border: 0; color: #ffffff; background: var(--accent); cursor: pointer; }

        .catalogResults { min-width: 0; }
        .catalogGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; }

        .catalogCard {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #e9def5;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 18px 50px rgba(44, 24, 68, 0.07);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .catalogCard:hover { transform: translateY(-3px); box-shadow: 0 23px 58px rgba(44, 24, 68, 0.11); }
        .catalogImage { position: relative; height: 210px; overflow: hidden; background: linear-gradient(135deg, #21142c, var(--accent)); }
        .catalogImage img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform 0.25s ease; }
        .catalogCard:hover .catalogImage img { transform: scale(1.025); }

        .catalogImage > span {
          position: absolute;
          right: 12px;
          top: 12px;
          padding: 6px 9px;
          color: #ffffff;
          border-radius: 999px;
          background: rgba(20, 11, 28, 0.65);
          backdrop-filter: blur(9px);
          font-size: 8px;
          font-weight: 900;
        }

        .catalogSave { position: absolute !important; left: 12px; bottom: 12px; z-index: 4; }
        .catalogCardBody { padding: 15px; }
        .catalogMainLink { display: block; }
        .catalogCardTitle { display: flex; align-items: start; justify-content: space-between; gap: 10px; }
        .catalogCardTitle h2 { min-width: 0; margin: 0; font-size: 15px; line-height: 1.8; }

        .catalogCardTitle > span {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 9px;
          color: var(--accent);
          background: var(--soft);
          font-size: 9px;
          font-weight: 900;
        }

        .catalogMeta,
        .catalogFacts { margin-top: 9px; display: flex; flex-wrap: wrap; gap: 6px; }

        .catalogMeta span,
        .catalogFacts span {
          padding: 5px 7px;
          border-radius: 8px;
          color: #665b70;
          background: #f8f5fa;
          font-size: 8px;
        }

        .catalogLocation { margin-top: 11px; color: #7c7086; font-size: 9px; }
        .catalogPrice { display: block; margin-top: 12px; color: var(--accent); font-size: 16px; }

        .catalogCardFooter {
          margin-top: 14px;
          padding-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid #f0e9f5;
          font-size: 9px;
        }

        .catalogCardFooter > span { min-width: 0; overflow: hidden; color: #675c70; text-overflow: ellipsis; white-space: nowrap; }
        .catalogCardFooter > a { flex: 0 0 auto; color: var(--accent); font-weight: 900; }

        .catalogEmpty {
          min-height: 360px;
          padding: 30px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          text-align: center;
          border: 1px dashed #d7c8e7;
          border-radius: 24px;
          background: #ffffff;
        }

        .catalogEmpty > span { font-size: 35px; color: var(--accent); }
        .catalogEmpty strong { font-size: 17px; }
        .catalogEmpty p { margin: 0; color: #766b80; font-size: 11px; }
        .catalogEmpty a { margin-top: 8px; padding: 10px 13px; color: #ffffff; border-radius: 11px; background: var(--accent); font-size: 9px; font-weight: 900; }

        .catalogPagination {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
        }

        .catalogPagination a {
          width: max-content;
          min-height: 40px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          border: 1px solid #e6dced;
          border-radius: 12px;
          color: var(--accent);
          background: #ffffff;
          font-size: 9px;
          font-weight: 900;
        }

        .catalogPagination a:last-child { justify-self: end; }
        .catalogPagination strong { color: #6f6479; font-size: 9px; }

        @media (max-width: 1040px) {
          .catalogGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 900px) {
          .catalogHeader { min-height: 60px; padding: 9px 12px; }
          .catalogHeaderLinks > a:not(.catalogSubmit) { display: none; }
          .catalogHero { width: calc(100% - 20px); margin-top: 14px; padding: 19px 15px; border-radius: 21px; align-items: flex-start; }
          .catalogHero h1 { font-size: 23px; }
          .catalogHero p { font-size: 9px; }
          .catalogHero > strong { font-size: 8px; }
          .catalogBrowseShell { width: calc(100% - 20px); }
          .catalogDiscoveryBar { top: 68px; }
        }

        @media (max-width: 680px) {
          .catalogHero { display: grid; gap: 12px; }
          .catalogHero > strong { width: max-content; }

          .catalogDiscoveryBar {
            padding: 10px;
            align-items: stretch;
            flex-direction: column;
            gap: 9px;
          }

          .catalogDiscoveryCopy { padding-inline: 2px; }
          .catalogDiscoveryCopy strong { font-size: 11px; }
          .catalogDiscoveryCopy span { font-size: 8px; }
          .catalogDiscoveryActions { width: 100%; }
          .catalogSortPill { min-width: 0; flex: 1; padding-inline: 9px; font-size: 8px; }
          .catalogFilterOpen { min-width: 0; flex: 1.15; padding-inline: 9px; font-size: 9px; }
          .catalogGrid { grid-template-columns: 1fr; gap: 12px; }
          .catalogImage { height: 215px; }

          .catalogFilterDrawer {
            width: 100%;
            border-radius: 0;
            box-shadow: none;
          }

          .catalogFilterDrawerHeader { min-height: 68px; padding: 12px 14px; }
          .catalogFilterFields { padding: 14px; }
          .catalogFilterFooter { grid-template-columns: 0.85fr 1.4fr; padding-inline: 12px; }
        }

        @media (max-width: 430px) {
          .catalogPriceRow { grid-template-columns: 1fr; }
          .catalogCard { border-radius: 19px; }
          .catalogImage { height: 196px; }
          .catalogCardBody { padding: 13px; }
          .catalogCardTitle h2 { font-size: 13px; }
          .catalogPrice { font-size: 14px; }
          .catalogActiveFilters { margin-inline: -1px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .catalogFilterLayer,
          .catalogFilterDrawer,
          .catalogCard,
          .catalogImage img { transition: none !important; }
        }
      `}</style>
    </main>
  );
}
