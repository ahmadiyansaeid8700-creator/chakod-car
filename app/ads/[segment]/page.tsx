import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import SaveListingButton from "../../components/SaveListingButton";

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

function formatPrice(price: number | null) {
  if (!price) return "قیمت توافقی";
  return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
}

function formatMileage(mileage: number | null) {
  if (mileage === null || mileage === undefined) return "کارکرد نامشخص";
  return `${new Intl.NumberFormat("fa-IR").format(mileage)} کیلومتر`;
}

function getImageUrl(path: string | null) {
  if (!path) return "https://placehold.co/1200x800/17111f/f4eaff?text=CHAKOD";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
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
  const minPrice = parseNumber(readParam(filters, "min_price"));
  const maxPrice = parseNumber(readParam(filters, "max_price"));
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
        <a className="catalogBrand" href="/">
          <span>چ</span>
          <strong>چاکود</strong>
        </a>
        <div className="catalogHeaderLinks">
          <a href="/">خانه</a>
          <a href="/showrooms">نمایشگاه‌ها</a>
          <a className="catalogSubmit" href="/submit">ثبت آگهی</a>
        </div>
      </header>

      <section className="catalogHero">
        <div>
          <span>{config.kicker}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <strong>{new Intl.NumberFormat("fa-IR").format(filtered.length)} آگهی</strong>
      </section>

      <section className="catalogLayout">
        <aside className="catalogFilters" id="filters">
          <div className="catalogFilterTitle">
            <strong>فیلتر آگهی‌ها</strong>
            <a href={`/ads/${segment}`}>پاک‌کردن</a>
          </div>

          <form method="get" action={`/ads/${segment}`}>
            <label>
              <span>جست‌وجو</span>
              <input name="q" defaultValue={query} placeholder="برند، مدل یا نمایشگاه" />
            </label>

            <label>
              <span>شهر</span>
              <select name="city" defaultValue={city}>
                <option value="">همه شهرها</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label>
              <span>برند</span>
              <select name="brand" defaultValue={brand}>
                <option value="">همه برندها</option>
                {brands.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <div className="catalogPriceRow">
              <label>
                <span>حداقل قیمت</span>
                <input name="min_price" inputMode="numeric" defaultValue={readParam(filters, "min_price")} />
              </label>
              <label>
                <span>حداکثر قیمت</span>
                <input name="max_price" inputMode="numeric" defaultValue={readParam(filters, "max_price")} />
              </label>
            </div>

            <label>
              <span>مرتب‌سازی</span>
              <select name="sort" defaultValue={sort}>
                <option value="newest">جدیدترین</option>
                <option value="cheap">ارزان‌ترین</option>
                <option value="expensive">گران‌ترین</option>
                <option value="popular">پربازدیدترین</option>
              </select>
            </label>

            <button type="submit">اعمال فیلترها</button>
          </form>
        </aside>

        <section className="catalogResults" aria-label={config.title}>
          <div className="catalogMobileSummary">
            <span>{new Intl.NumberFormat("fa-IR").format(filtered.length)} نتیجه</span>
            <a href="#filters">فیلتر و مرتب‌سازی</a>
          </div>

          {visibleListings.length === 0 ? (
            <div className="catalogEmpty">
              <span>⌕</span>
              <strong>آگهی مطابق فیلترها پیدا نشد</strong>
              <p>فیلترها را تغییر بده یا دوباره به صفحه اصلی برگرد.</p>
              <a href={`/ads/${segment}`}>نمایش همه آگهی‌های این بخش</a>
            </div>
          ) : (
            <div className="catalogGrid">
              {visibleListings.map((listing) => (
                <article className="catalogCard" key={listing.id}>
                  <div className="catalogImage">
                    <a href={`/listing/${listing.id}`}>
                      <img src={getImageUrl(listing.cover_image)} alt={listing.title} loading="lazy" />
                    </a>
                    <span>{config.badge}</span>
                    <SaveListingButton listingId={listing.id} compact className="catalogSave" />
                  </div>

                  <div className="catalogCardBody">
                    <a className="catalogMainLink" href={`/listing/${listing.id}`}>
                      <div className="catalogCardTitle">
                        <h2>{listing.title}</h2>
                        <span>{listing.production_year || "—"}</span>
                      </div>
                      <div className="catalogMeta">
                        <span>{listing.brand}</span>
                        <span>{listing.model}</span>
                        {listing.transmission ? <span>{listing.transmission}</span> : null}
                      </div>
                      <div className="catalogFacts">
                        <span>{formatMileage(listing.mileage_km)}</span>
                        <span>{listing.body_status || "وضعیت بدنه نامشخص"}</span>
                      </div>
                      <div className="catalogLocation">⌖ {listing.city || "موقعیت نامشخص"}</div>
                      <strong className="catalogPrice">{formatPrice(listing.price_toman)}</strong>
                    </a>
                    <div className="catalogCardFooter">
                      <span>{listing.dealer_name || "فروشنده شخصی"}</span>
                      <a href={`/listing/${listing.id}`}>مشاهده آگهی</a>
                    </div>
                  </div>
                </article>
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
      </section>

      <style>{`
        .catalogPage { min-height: 100vh; overflow-x: clip; color: #191120; font-family: Tahoma, Arial, sans-serif; background: linear-gradient(180deg,#fff 0%,#faf7ff 48%,#fff 100%); }
        .catalogPage * { box-sizing: border-box; }
        .catalogPage a { color: inherit; text-decoration: none; }
        .catalogHeader { position: sticky; top: 0; z-index: 50; min-height: 72px; padding: 12px max(20px,calc((100vw - 1220px)/2)); display:flex; align-items:center; justify-content:space-between; gap:18px; border-bottom:1px solid #eee6f7; background:rgba(255,255,255,.93); backdrop-filter:blur(16px); }
        .catalogBrand { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:900; }
        .catalogBrand > span { width:39px; height:39px; display:grid; place-items:center; color:#fff; border-radius:13px; background:linear-gradient(135deg,#2f1741,var(--accent)); }
        .catalogHeaderLinks { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:900; }
        .catalogHeaderLinks > a { min-height:39px; padding:0 12px; display:inline-flex; align-items:center; border-radius:12px; }
        .catalogSubmit { color:#fff !important; background:var(--accent); }
        .catalogHero { width:min(1220px,calc(100% - 32px)); margin:28px auto 18px; padding:28px; display:flex; align-items:flex-end; justify-content:space-between; gap:20px; border:1px solid #e9def5; border-radius:28px; background:radial-gradient(circle at 12% 0%,var(--soft),transparent 38%),#fff; box-shadow:0 20px 60px rgba(44,24,68,.08); }
        .catalogHero span { color:var(--accent); font-size:10px; font-weight:900; letter-spacing:.08em; }
        .catalogHero h1 { margin:7px 0 5px; font-size:32px; line-height:1.45; }
        .catalogHero p { margin:0; color:#766b80; font-size:12px; line-height:2; }
        .catalogHero > strong { flex:0 0 auto; padding:10px 13px; color:var(--accent); border-radius:999px; background:var(--soft); font-size:11px; }
        .catalogLayout { width:min(1220px,calc(100% - 32px)); margin:0 auto 60px; display:grid; grid-template-columns:280px minmax(0,1fr); gap:18px; align-items:start; }
        .catalogFilters { position:sticky; top:90px; padding:18px; border:1px solid #e9def5; border-radius:22px; background:#fff; box-shadow:0 16px 48px rgba(44,24,68,.06); }
        .catalogFilterTitle { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:15px; }
        .catalogFilterTitle strong { font-size:14px; }
        .catalogFilterTitle a { color:var(--accent); font-size:9px; font-weight:900; }
        .catalogFilters form { display:grid; gap:12px; }
        .catalogFilters label { display:grid; gap:6px; }
        .catalogFilters label > span { color:#74687d; font-size:9px; font-weight:900; }
        .catalogFilters input,.catalogFilters select { width:100%; min-height:44px; padding:0 11px; border:1px solid #e6dced; border-radius:12px; outline:none; color:#24192d; background:#fff; font:inherit; font-size:10px; }
        .catalogFilters input:focus,.catalogFilters select:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--soft); }
        .catalogPriceRow { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .catalogFilters button { min-height:45px; border:0; border-radius:13px; color:#fff; background:var(--accent); font:inherit; font-size:10px; font-weight:900; cursor:pointer; }
        .catalogResults { min-width:0; }
        .catalogMobileSummary { display:none; }
        .catalogGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; }
        .catalogCard { min-width:0; overflow:hidden; border:1px solid #e9def5; border-radius:22px; background:#fff; box-shadow:0 18px 50px rgba(44,24,68,.07); }
        .catalogImage { position:relative; height:230px; overflow:hidden; background:linear-gradient(135deg,#21142c,var(--accent)); }
        .catalogImage img { width:100%; height:100%; display:block; object-fit:cover; }
        .catalogImage > span { position:absolute; right:12px; top:12px; padding:6px 9px; color:#fff; border-radius:999px; background:rgba(20,11,28,.65); backdrop-filter:blur(9px); font-size:8px; font-weight:900; }
        .catalogSave { position:absolute !important; left:12px; bottom:12px; z-index:4; }
        .catalogCardBody { padding:15px; }
        .catalogMainLink { display:block; }
        .catalogCardTitle { display:flex; align-items:start; justify-content:space-between; gap:10px; }
        .catalogCardTitle h2 { min-width:0; margin:0; font-size:15px; line-height:1.8; }
        .catalogCardTitle > span { flex:0 0 auto; padding:5px 8px; border-radius:9px; color:var(--accent); background:var(--soft); font-size:9px; font-weight:900; }
        .catalogMeta,.catalogFacts { margin-top:9px; display:flex; flex-wrap:wrap; gap:6px; }
        .catalogMeta span,.catalogFacts span { padding:5px 7px; border-radius:8px; color:#665b70; background:#f8f5fa; font-size:8px; }
        .catalogLocation { margin-top:11px; color:#7c7086; font-size:9px; }
        .catalogPrice { display:block; margin-top:12px; color:var(--accent); font-size:16px; }
        .catalogCardFooter { margin-top:14px; padding-top:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; border-top:1px solid #f0e9f5; font-size:9px; }
        .catalogCardFooter > span { min-width:0; overflow:hidden; color:#675c70; text-overflow:ellipsis; white-space:nowrap; }
        .catalogCardFooter > a { flex:0 0 auto; color:var(--accent); font-weight:900; }
        .catalogEmpty { min-height:360px; padding:30px; display:grid; place-items:center; align-content:center; gap:9px; text-align:center; border:1px dashed #d7c8e7; border-radius:24px; background:#fff; }
        .catalogEmpty > span { font-size:35px; color:var(--accent); }
        .catalogEmpty strong { font-size:17px; }
        .catalogEmpty p { margin:0; color:#766b80; font-size:11px; }
        .catalogEmpty a { margin-top:8px; padding:10px 13px; color:#fff; border-radius:11px; background:var(--accent); font-size:9px; font-weight:900; }
        .catalogPagination { margin-top:22px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:12px; }
        .catalogPagination a { width:max-content; min-height:40px; padding:0 13px; display:inline-flex; align-items:center; border:1px solid #e6dced; border-radius:12px; color:var(--accent); background:#fff; font-size:9px; font-weight:900; }
        .catalogPagination a:last-child { justify-self:end; }
        .catalogPagination strong { color:#6f6479; font-size:9px; }
        @media (max-width:900px) {
          .catalogHeader { min-height:60px; padding:9px 12px; }
          .catalogHeaderLinks > a:not(.catalogSubmit) { display:none; }
          .catalogHero { width:calc(100% - 20px); margin-top:14px; padding:19px 15px; border-radius:21px; align-items:flex-start; }
          .catalogHero h1 { font-size:23px; }
          .catalogHero p { font-size:9px; }
          .catalogHero > strong { font-size:8px; }
          .catalogLayout { width:calc(100% - 20px); grid-template-columns:1fr; }
          .catalogFilters { position:static; scroll-margin-top:74px; }
          .catalogGrid { grid-template-columns:1fr; gap:12px; }
          .catalogImage { height:210px; }
          .catalogMobileSummary { margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; color:#74687d; font-size:9px; }
          .catalogMobileSummary a { color:var(--accent); font-weight:900; }
        }
        @media (max-width:520px) {
          .catalogFilters { padding:14px; border-radius:18px; }
          .catalogPriceRow { grid-template-columns:1fr; }
          .catalogCard { border-radius:19px; }
          .catalogImage { height:196px; }
          .catalogCardBody { padding:13px; }
          .catalogCardTitle h2 { font-size:13px; }
          .catalogPrice { font-size:14px; }
        }
      `}</style>
    </main>
  );
}
