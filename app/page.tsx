import Link from "next/link";
import "./home.css";
import AuthStatus from "./components/AuthStatus";
import HomeStories from "./components/HomeStories";
import HomeFeaturedShowrooms from "./components/HomeFeaturedShowrooms";
import HomeLocationSelector from "./components/HomeLocationSelector";
import HomeMarketSearch from "./components/HomeMarketSearch";
import HomeBannerSlot from "./components/HomeBannerSlot";
import ListingCard from "./components/ListingCard";
import HomeHorizontalRail from "./components/HomeHorizontalRail";
import HomePublicListingsClient from "./components/HomePublicListingsClient";
import HomeBusinessLinks from "./components/HomeBusinessLinks";
import HomeNearbyBusinesses from "./components/HomeNearbyBusinesses";
import HomeGuides from "./components/HomeGuides";
import MobileBottomNav from "./components/MobileBottomNav";

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
  color: string;
  body_status: string;
  transmission: string;
  fuel_type: string;
  seller_type: string;
  show_seller_name: boolean | number;
  views_count: number;
  favorite_count: number;
  created_at: string;
  category_code: string;
  category_name: string;
  plan_code: string;
  plan_name: string;
  priority_level: number;
  is_highlighted: boolean | number;
  show_on_home: boolean | number;
  dealer_name: string | null;
  cover_image: string | null;
  dealer_id?: number | string | null;
  dealer_logo_url?: string | null;
  dealer_logo?: string | null;
  logo_url?: string | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  dealer_is_verified?: boolean | number | null;

  // Optional future AI fields. The page works even when the API does not return them.
  market_segment?: "luxury" | "freezone" | "economic" | "regular" | null;
  luxury_score?: number | null;
  homepage_score?: number | null;
  ai_homepage_recommended?: boolean | number | null;
};

type ListingsResponse = {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  data: Listing[];
};

type SearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ShowcaseListing = Listing & {
  computedScore: number;
};


const API_BASE = "https://api.chakod.com";

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
  "acura",
  "آکورا",
  "dsautomobiles",
  "دیاس",
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

async function getListings(): Promise<Listing[]> {
  try {
    const response = await fetch(
      `${API_BASE}/api/listings.php?limit=60&sort=vip`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return [];
    }

    const json: ListingsResponse = await response.json();

    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }

    return json.data;
  } catch {
    return [];
  }
}

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

function isLuxuryBrand(listing: Listing) {
  return includesAny(
    `${listing.brand} ${listing.model} ${listing.title}`,
    luxuryBrands,
  );
}

function isFreezoneListing(listing: Listing) {
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
      "منطقهآزاد",
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

function getLuxuryScore(listing: Listing) {
  let score = Number(listing.luxury_score || 0);

  if (listing.market_segment === "luxury") score += 80;
  if (listing.ai_homepage_recommended) score += 28;
  if (isLuxuryBrand(listing)) score += 48;
  if ((listing.price_toman || 0) >= 2_000_000_000) score += 36;
  if ((listing.price_toman || 0) >= 5_000_000_000) score += 18;
  if (listing.category_code === "luxury") score += 50;
  if (listing.category_code === "ace") score += 22;
  if (listing.is_highlighted) score += 16;
  if ((listing.priority_level || 0) >= 2) score += 12;
  if (["vip", "premium", "featured"].includes(listing.plan_code)) score += 14;
  if ((listing.production_year || 0) >= 2020) score += 8;
  score += Number(listing.homepage_score || 0) * 0.35;

  return Math.round(score);
}

function getFreezoneScore(listing: Listing) {
  let score = Number(listing.homepage_score || 0) * 0.45;

  if (isFreezoneListing(listing)) score += 100;
  if (listing.market_segment === "freezone") score += 40;
  if (listing.is_highlighted) score += 14;
  if ((listing.priority_level || 0) >= 2) score += 10;
  if ((listing.price_toman || 0) >= 2_000_000_000) score += 10;
  if ((listing.production_year || 0) >= 2020) score += 8;

  return Math.round(score);
}

function sortShowcase(
  listings: Listing[],
  scoreGetter: (listing: Listing) => number,
) {
  return listings
    .map((listing) => ({
      ...listing,
      computedScore: scoreGetter(listing),
    }))
    .sort((a, b) => {
      if (b.computedScore !== a.computedScore) {
        return b.computedScore - a.computedScore;
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
}

function buildShowcases(allListings: Listing[]) {
  const freezone = sortShowcase(
    allListings.filter(isFreezoneListing),
    getFreezoneScore,
  ).slice(0, 6);

  let luxury = sortShowcase(
    allListings.filter(
      (listing) =>
        !isFreezoneListing(listing) &&
        (listing.market_segment === "luxury" ||
          isLuxuryBrand(listing) ||
          (listing.price_toman || 0) >= 2_000_000_000 ||
          getLuxuryScore(listing) >= 65),
    ),
    getLuxuryScore,
  ).slice(0, 9);

  if (luxury.length < 3) {
    const existingIds = new Set(luxury.map((listing) => listing.id));

    const fallbackLuxury = sortShowcase(
      allListings.filter(
        (listing) => !existingIds.has(listing.id) && !isFreezoneListing(listing),
      ),
      getLuxuryScore,
    ).slice(0, 6 - luxury.length);

    luxury = [...luxury, ...fallbackLuxury];
  }

  return {
    luxury,
    freezone,
  };
}

function listingMatchesQuery(listing: Listing, query: string) {
  if (!query) {
    return true;
  }

  const searchableText = [
    listing.title,
    listing.brand,
    listing.model,
    listing.trim_name || "",
    listing.province,
    listing.city,
    listing.neighborhood,
    listing.dealer_name || "",
    listing.category_name,
  ]
    .map((value) => normalizeText(String(value || "")))
    .join(" ");

  return searchableText.includes(normalizeText(query));
}


function ShowcaseCard({
  listing,
  badge,
  tone,
}: {
  listing: ShowcaseListing;
  badge: string;
  tone: "luxury" | "freezone";
}) {
  return (
    <ListingCard
      listing={listing}
      badge={badge}
      tone={tone}
      variant="rail"
    />
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
  listings: ShowcaseListing[];
  badge: string;
  tone: "luxury" | "freezone";
  allHref: string;
}) {
  if (listings.length === 0) {
    return null;
  }

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
              نمایش همه
              <span aria-hidden="true">←</span>
            </Link>

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
          <ShowcaseCard
            key={listing.id}
            listing={listing}
            badge={badge}
            tone={tone}
          />
        ))}
      </HomeHorizontalRail>
    </section>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const rawQuery = resolvedSearchParams.q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] || "" : rawQuery || "";

  const allListings = await getListings();

  const { luxury, freezone } = buildShowcases(allListings);
  const searchResults = query
    ? allListings.filter((listing) => listingMatchesQuery(listing, query))
    : [];

  return (
    <main className="chakodMasterHome" dir="rtl">
      <header className="masterHeader">
        <nav className="masterNav" aria-label="ناوبری اصلی">
          <Link className="masterBrand" href="/" aria-label="صفحه اصلی چاکود">
            <img
              className="masterBrandLogo masterBrandLogoDesktop"
              src="/brand/chakod-logo-horizontal.png"
              alt="چاکود"
            />
            <img
              className="masterBrandLogo masterBrandLogoMobile"
              src="/brand/chakod-symbol.png"
              alt=""
              aria-hidden="true"
            />
            <span className="masterSrOnly">چاکود؛ پلتفرم رشد کسب‌وکار</span>
          </Link>

          <div className="masterNavLinks">
            <Link href="/ads">خودروها</Link>
            <Link href="/showrooms">نمایشگاه‌ها</Link>
            <Link href="/businesses">کسب‌وکارها</Link>
          </div>

          <div className="masterNavActions">
            <Link
              className="masterSavedLink"
              href="/account/saved"
              aria-label="آگهی‌های نشان‌شده"
            >
              <span aria-hidden="true">♡</span>
              <b>نشان</b>
            </Link>

            <AuthStatus />

            <Link className="masterSubmitButton" href="/submit">
              <span aria-hidden="true">＋</span>
              <b>ثبت آگهی</b>
            </Link>
          </div>
        </nav>


        <div className="masterHeaderToolsWrap" id="market-search">
          <div className="masterHeaderTools">
            <div className="masterLocationControl">
              <HomeLocationSelector />
            </div>
            <HomeMarketSearch initialQuery={query} />
          </div>
        </div>
      </header>

      <div className="masterStoriesWrap">
        <HomeStories />
      </div>

      <HomeFeaturedShowrooms location="همه شهرها" query={query} />

      <HomeBannerSlot />

      {allListings.length === 0 ? (
        <HomePublicListingsClient query={query} />
      ) : (
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

              {searchResults.length === 0 ? (
                <div className="masterEmptyShowcase">
                  <span>⌕</span>
                  <strong>نتیجه‌ای پیدا نشد</strong>
                  <p>نام برند، مدل، شهر یا نمایشگاه را با عبارت دیگری جست‌وجو کن.</p>
                </div>
              ) : (
                <div className="masterListingGrid">
                  {searchResults.slice(0, 12).map((listing) => (
                    <ShowcaseCard
                      key={listing.id}
                      listing={{
                        ...listing,
                        computedScore: Number(listing.homepage_score || 0),
                      }}
                      badge="نتیجه جست‌وجو"
                      tone="luxury"
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
                description="خودروهای ممتاز بر اساس برند، قیمت، کیفیت آگهی و امتیاز هوشمند در اولویت نمایش قرار می‌گیرند."
                listings={luxury}
                badge="منتخب لوکس"
                tone="luxury"
                allHref="/ads/luxury"
              />

              <ShowcaseSection
                id="freezone"
                kicker="FREE ZONE"
                title="تازه‌های منطقه آزاد"
                description="ویترین اختصاصی خودروهای منطقه آزاد؛ جدا از بازار عمومی و با اولویت بالا در صفحه اصلی."
                listings={freezone}
                badge="منطقه آزاد"
                tone="freezone"
                allHref="/ads/freezone"
              />
            </>
          )}
        </>
      )}

      <HomeBusinessLinks />
      <HomeNearbyBusinesses />
      <HomeGuides />

      <footer className="masterFooter">
        <div className="masterFooterMain">
          <Link className="masterBrand masterFooterBrand" href="/" aria-label="صفحه اصلی چاکود">
            <img
              className="masterFooterLogo"
              src="/brand/chakod-logo-full-light.png"
              alt="چاکود؛ پلتفرم رشد کسب‌وکار"
            />
          </Link>

          <p>
            ویترین خودروهای لوکس و منطقه آزاد، نمایشگاه‌های منتخب و خدمات خودرویی.
          </p>

          <div>
            <Link href="/ads/luxury">خودروهای لوکس</Link>
            <Link href="/ads/freezone">منطقه آزاد</Link>
            <Link href="/showrooms">نمایشگاه‌ها</Link>
            <Link href="/businesses">خدمات خودرو</Link>
            <Link href="/rules">قوانین</Link>
          </div>
        </div>

        <div className="masterFooterBottom">
          <span>© چاکود؛ پلتفرم رشد کسب‌وکار</span>
          <span>لوکس، منطقه آزاد، نمایشگاه و خدمات خودرو</span>
        </div>
      </footer>

      <MobileBottomNav />


    </main>
  );
}