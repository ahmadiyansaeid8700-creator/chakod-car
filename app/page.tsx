import Link from "next/link";
import AuthStatus from "./components/AuthStatus";
import HomeStories from "./components/HomeStories";
import HomeLocationSelector from "./components/HomeLocationSelector";
import HomeBannerSlot from "./components/HomeBannerSlot";
import ListingCard from "./components/ListingCard";
import HomeHorizontalRail from "./components/HomeHorizontalRail";
import HomePublicListingsClient from "./components/HomePublicListingsClient";
import ShowroomCard, { type ShowroomCardData } from "./components/ShowroomCard";

type Category = {
  id: number;
  code: string;
  name: string;
  description: string;
  sort_order: number;
};

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

type CategoriesResponse = {
  success: boolean;
  data: Category[];
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

type DealerPreview = ShowroomCardData;

const API_BASE = "https://api.chakod.com";

const fallbackCategories: Category[] = [
  {
    id: 1,
    code: "luxury",
    name: "خودروهای لوکس",
    description: "خودروهای خاص، ممتاز و برندهای پریمیوم",
    sort_order: 1,
  },
  {
    id: 2,
    code: "freezone",
    name: "منطقه آزاد",
    description: "خودروهای ویژه مناطق آزاد کشور",
    sort_order: 2,
  },
  {
    id: 3,
    code: "zero",
    name: "صفر و آماده تحویل",
    description: "خودروهای صفر کیلومتر و آماده فروش",
    sort_order: 3,
  },
  {
    id: 4,
    code: "used",
    name: "کارکرده و کم‌کارکرد",
    description: "خودروهای شخصی و نمایشگاهی",
    sort_order: 4,
  },
  {
    id: 5,
    code: "classic",
    name: "کلاسیک و کلکسیونی",
    description: "خودروهای خاص، کمیاب و کلکسیونی",
    sort_order: 5,
  },
];

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

async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_BASE}/api/categories.php`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackCategories;
    }

    const json: CategoriesResponse = await response.json();

    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      return fallbackCategories;
    }

    return [...json.data].sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.name.localeCompare(b.name, "fa"),
    );
  } catch {
    return fallbackCategories;
  }
}

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

function getEconomicScore(listing: Listing) {
  const price = Number(listing.price_toman || 0);
  let score = Number(listing.homepage_score || 0) * 0.3;

  if (listing.market_segment === "economic") score += 80;
  if (price > 0 && price <= 1_500_000_000) score += 42;
  if (price > 0 && price <= 900_000_000) score += 18;
  if ((listing.production_year || 0) >= 2018) score += 12;
  if ((listing.mileage_km || 0) <= 100_000) score += 10;
  if (listing.is_highlighted) score += 8;

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

  const usedIds = new Set([
    ...luxury.map((listing) => listing.id),
    ...freezone.map((listing) => listing.id),
  ]);

  const economic = sortShowcase(
    allListings.filter(
      (listing) =>
        !usedIds.has(listing.id) &&
        !isFreezoneListing(listing) &&
        !isLuxuryBrand(listing) &&
        (listing.price_toman || 0) > 0 &&
        (listing.price_toman || 0) <= 1_500_000_000,
    ),
    getEconomicScore,
  ).slice(0, 6);

  return {
    luxury,
    freezone,
    economic,
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


function getDealerPreviews(listings: Listing[]): DealerPreview[] {
  const dealers = new Map<string, DealerPreview & { latestAt: number }>();

  for (const listing of listings) {
    const dealerName = listing.dealer_name?.trim();
    if (!dealerName) continue;

    const stableKey = listing.dealer_id
      ? `id:${listing.dealer_id}`
      : `name:${normalizeText(dealerName)}`;
    const verified = Boolean(
      listing.dealer_verified ||
        listing.is_dealer_verified ||
        listing.dealer_is_verified,
    );
    const logoUrl =
      listing.dealer_logo_url || listing.dealer_logo || listing.logo_url || null;
    const latestAt = new Date(listing.created_at).getTime() || 0;
    const currentDealer = dealers.get(stableKey);

    if (currentDealer) {
      currentDealer.listingCount += 1;
      currentDealer.verified = currentDealer.verified || verified;
      currentDealer.latestAt = Math.max(currentDealer.latestAt, latestAt);
      if (!currentDealer.logoUrl && logoUrl) currentDealer.logoUrl = logoUrl;
      if (!currentDealer.coverImage && listing.cover_image) {
        currentDealer.coverImage = listing.cover_image;
      }
      if (
        (!currentDealer.city || currentDealer.city === "شهر نامشخص") &&
        listing.city
      ) {
        currentDealer.city = listing.city;
      }
      if (!currentDealer.province && listing.province) {
        currentDealer.province = listing.province;
      }
      continue;
    }

    dealers.set(stableKey, {
      key: stableKey,
      name: dealerName,
      city: listing.city || "شهر نامشخص",
      province: listing.province || "",
      listingCount: 1,
      logoUrl,
      coverImage: listing.cover_image,
      verified,
      latestAt,
    });
  }

  return Array.from(dealers.values())
    .sort(
      (a, b) =>
        Number(Boolean(b.verified)) - Number(Boolean(a.verified)) ||
        b.listingCount - a.listingCount ||
        b.latestAt - a.latestAt ||
        a.name.localeCompare(b.name, "fa"),
    )
    .slice(0, 8)
    .map((dealer) => ({
      key: dealer.key,
      name: dealer.name,
      city: dealer.city,
      province: dealer.province,
      listingCount: dealer.listingCount,
      logoUrl: dealer.logoUrl,
      coverImage: dealer.coverImage,
      verified: dealer.verified,
    }));
}

function getCategoryIcon(code: string) {
  const icons: Record<string, string> = {
    luxury: "◆",
    freezone: "◈",
    zero: "○",
    used: "●",
    preorder: "⌁",
    classic: "✦",
    ace: "◇",
  };

  return icons[code] || "○";
}

function getQuickCategoryHref(category: Category) {
  const routeByCode: Record<string, string> = {
    luxury: "/ads/luxury",
    freezone: "/ads/freezone",
    economic: "/ads/economic",
    zero: "/?q=%D8%B5%D9%81%D8%B1",
    used: "/?q=%DA%A9%D8%A7%D8%B1%DA%A9%D8%B1%D8%AF%D9%87",
    classic: "/?q=%DA%A9%D9%84%D8%A7%D8%B3%DB%8C%DA%A9",
  };

  return routeByCode[category.code] || `/?q=${encodeURIComponent(category.name)}`;
}

function ShowcaseCard({
  listing,
  badge,
  tone,
}: {
  listing: ShowcaseListing;
  badge: string;
  tone: "luxury" | "freezone" | "economic";
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
  tone: "luxury" | "freezone" | "economic";
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

            <a

              className="masterShowAllLink"

              href={allHref}

              aria-label={`نمایش همه ${title}`}

            >

              نمایش همه

              <span aria-hidden="true">←</span>

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

  const [categories, allListings] = await Promise.all([
    getCategories(),
    getListings(),
  ]);

  const { luxury, freezone, economic } = buildShowcases(allListings);
  const searchResults = query
    ? allListings.filter((listing) => listingMatchesQuery(listing, query))
    : [];
  const dealers = getDealerPreviews(allListings);

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
            <Link href="/ads/luxury">خودروهای لوکس</Link>
            <Link href="/ads/freezone">منطقه آزاد</Link>
            <Link href="/ads/economic">اقتصادی</Link>
            <Link href="/showrooms">نمایشگاه‌ها</Link>
          </div>

          <div className="masterNavActions">
            <a
              className="masterSavedLink"
              href="/account/saved"
              aria-label="آگهی‌های نشان‌شده"
            >
              <span aria-hidden="true">♡</span>
              <b>نشان‌شده‌ها</b>
            </a>

            <AuthStatus />

            <a className="masterSubmitButton" href="/submit">
              <span aria-hidden="true">＋</span>
              <b>ثبت آگهی</b>
            </a>
          </div>
        </nav>

        <div className="masterHeaderToolsWrap">
          <div className="masterHeaderTools">
            <Link
              className="masterHeaderToolsBrand"
              href="/"
              aria-label="صفحه اصلی چاکود"
            >
              <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
            </Link>

            <div className="masterLocationControl">
              <HomeLocationSelector />
            </div>

            <form
              className="masterSearch masterHeaderSearch"
              action="/"
              method="get"
              role="search"
            >
              <label className="masterSrOnly" htmlFor="master-search">
                جست‌وجوی خودرو
              </label>

              <span className="masterSearchLeadingIcon" aria-hidden="true">
                ⌕
              </span>

              <input
                id="master-search"
                name="q"
                defaultValue={query}
                placeholder="برند، مدل، شهر یا نمایشگاه..."
                autoComplete="off"
                enterKeyHint="search"
              />

              <button type="submit" aria-label="جست‌وجو">
                <span className="masterSearchButtonText">جست‌وجو</span>
                <span className="masterSearchButtonIcon" aria-hidden="true">
                  ⌕
                </span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="masterQuickAccess" aria-label="دسترسی سریع به بازار خودرو">
        <div className="masterQuickTrack">
          {categories.slice(0, 5).map((category) => (
            <a
              className="masterQuickItem"
              href={getQuickCategoryHref(category)}
              key={category.id}
            >
              <span aria-hidden="true">{getCategoryIcon(category.code)}</span>
              <strong>{category.name}</strong>
            </a>
          ))}

          <Link className="masterQuickItem masterQuickItem--showrooms" href="/showrooms">
            <span aria-hidden="true">▣</span>
            <strong>نمایشگاه‌ها</strong>
          </Link>
        </div>
      </section>

      <div className="masterStoriesWrap">
        <HomeStories />
      </div>

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

              <ShowcaseSection
                id="economic"
                kicker="SMART VALUE"
                title="انتخاب‌های اقتصادی چاکود"
                description="تعداد محدودی خودروی اقتصادی و ارزشمند که از نظر قیمت، سال و کیفیت آگهی انتخاب شده‌اند."
                listings={economic}
                badge="ارزش خرید"
                tone="economic"
                allHref="/ads/economic"
              />
            </>
          )}

          {dealers.length > 0 ? (
            <section className="masterSection masterDealerSection" id="dealers">
              <div className="masterSectionHeader masterDealerHeader">
                <div className="masterSectionTitleBlock">
                  <span>SHOWROOMS OF CHAKOD</span>
                  <div className="masterSectionTitleRow">
                    <h2>نمایشگاه‌های منتخب</h2>
                    <Link
                      className="masterShowAllLink masterDealerShowAll"
                      href="/showrooms"
                      aria-label="نمایش همه نمایشگاه‌ها"
                    >
                      نمایش همه
                      <span aria-hidden="true">←</span>
                    </Link>
                  </div>
                </div>

                <div className="masterSectionHeaderSide">
                  <p>
                    نمایشگاه‌های فعال با موجودی واقعی؛ برای دیدن خودروها و ویترین
                    عمومی، کارت نمایشگاه را باز کن.
                  </p>
                </div>
              </div>

              <HomeHorizontalRail
                ariaLabel="نمایشگاه‌های منتخب چاکود"
                className="homeRailShell--dealers"
                showControls={dealers.length > 2}
              >
                {dealers.map((dealer) => (
                  <ShowroomCard key={dealer.key} showroom={dealer} />
                ))}
              </HomeHorizontalRail>
            </section>
          ) : null}
        </>
      )}

      <section className="masterSection masterTrustSection">
        <div className="masterSectionHeader masterCenteredHeader">
          <div>
            <span>اعتماد چاکود</span>
            <h2>ساخته‌شده برای خودروهای ارزشمند و فروشندگان حرفه‌ای</h2>
          </div>
        </div>

        <div className="masterTrustGrid">
          <article>
            <span>01</span>
            <h3>آگهی ساختاریافته</h3>
            <p>اطلاعات خودرو منظم، قابل مقایسه و بدون عنوان‌های بی‌قاعده است.</p>
          </article>

          <article>
            <span>02</span>
            <h3>بررسی هوشمند</h3>
            <p>کیفیت محتوا، ریسک آگهی و تناسب آن با صفحه اصلی ارزیابی می‌شود.</p>
          </article>

          <article>
            <span>03</span>
            <h3>هویت فروشنده</h3>
            <p>نام شخص یا نمایشگاه به‌صورت روشن کنار خودرو دیده می‌شود.</p>
          </article>

          <article>
            <span>04</span>
            <h3>ویترین قابل اشتراک</h3>
            <p>صفحه‌ای حرفه‌ای برای ارسال به مشتری و انتشار در شبکه‌های اجتماعی.</p>
          </article>
        </div>
      </section>

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
            ویترین تخصصی خودروهای ارزشمند، منطقه آزاد و فروشندگان حرفه‌ای.
          </p>

          <div>
            <Link href="/ads/luxury">لوکس</Link>
            <Link href="/ads/freezone">منطقه آزاد</Link>
            <Link href="/ads/economic">اقتصادی</Link>
            <Link href="/rules">قوانین</Link>
          </div>
        </div>

        <div className="masterFooterBottom">
          <span>© چاکود؛ پلتفرم رشد کسب‌وکار</span>
          <span>لوکس، منطقه آزاد، حرفه‌ای</span>
        </div>
      </footer>

      <style>{`
        .chakodMasterHome {
          --ink: #17111f;
          --ink-soft: #2a2034;
          --muted: #786f82;
          --purple: #6d28d9;
          --purple-dark: #4c1d95;
          --purple-soft: #f4efff;
          --gold: #b78a42;
          --gold-soft: #f6eddd;
          --border: #e8dff4;
          --surface: #ffffff;
          --shadow: 0 18px 52px rgba(35, 21, 55, 0.08);
          --shadow-strong: 0 28px 80px rgba(35, 21, 55, 0.14);
          min-height: 100vh;
          overflow-x: clip;
          color: var(--ink);
          font-family: Tahoma, Arial, sans-serif;
          background:
            radial-gradient(circle at 92% 0%, rgba(109, 40, 217, 0.1), transparent 24rem),
            linear-gradient(180deg, #ffffff 0%, #fbf9ff 45%, #ffffff 100%);
        }

        .chakodMasterHome *,
        .chakodMasterHome *::before,
        .chakodMasterHome *::after {
          box-sizing: border-box;
        }

        .chakodMasterHome a {
          color: inherit;
          text-decoration: none;
        }

        .chakodMasterHome img {
          max-width: 100%;
        }

        .masterSrOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
        }

        .masterHeader {
          position: sticky;
          top: 0;
          z-index: 70;
          border-bottom: 1px solid rgba(232, 223, 244, 0.96);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 10px 30px rgba(42, 26, 68, 0.06);
          backdrop-filter: blur(18px);
        }

        .masterNav {
          width: min(1240px, calc(100% - 32px));
          min-height: 64px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .masterHeaderToolsWrap {
          border-top: 1px solid rgba(238, 231, 247, 0.88);
        }

        .masterHeaderTools {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 8px 0 10px;
          display: grid;
          grid-template-columns: minmax(190px, 250px) minmax(0, 1fr);
          align-items: center;
          gap: 10px;
        }

        .masterHeaderToolsBrand {
          display: none;
        }

        .masterBrand {
          display: inline-flex;
          align-items: center;
          min-width: max-content;
        }

        .masterBrandLogo {
          display: block;
          width: auto;
          object-fit: contain;
        }

        .masterBrandLogoDesktop {
          height: 39px;
        }

        .masterBrandLogoMobile {
          display: none;
          width: 34px;
          height: 40px;
        }

        .masterNavLinks {
          flex: 1;
          display: flex;
          justify-content: center;
          gap: 24px;
          color: #5c5364;
          font-size: 12px;
          font-weight: 700;
        }

        .masterNavLinks a:hover {
          color: var(--purple);
        }

        .masterNavActions {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .masterLocationControl {
          width: 100%;
          min-width: 0;
        }

        .masterLocationControl .homeLocationTrigger {
          width: 100%;
          max-width: none;
        }

        .masterSavedLink,
        .masterSubmitButton {
          min-height: 42px;
          padding: 0 12px;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 900;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .masterSavedLink span,
        .masterSubmitButton span {
          font-size: 16px;
          line-height: 1;
        }

        .masterSavedLink b,
        .masterSubmitButton b {
          font: inherit;
        }

        .masterSavedLink {
          color: var(--purple-dark);
          border: 1px solid var(--border);
          background: #ffffff;
        }

        .masterSavedLink:hover {
          border-color: #c4b5fd;
          transform: translateY(-1px);
        }

        .masterSubmitButton {
          color: #ffffff;
          background: linear-gradient(135deg, #4c1d95, #7c3aed);
          box-shadow: 0 12px 26px rgba(76, 29, 149, 0.18);
        }

        .masterSubmitButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 15px 30px rgba(76, 29, 149, 0.24);
        }

        .chakodMasterHome .authStatusShell {
          min-width: 0;
        }

        .chakodMasterHome .authStatus {
          min-width: 148px;
          min-height: 42px;
          padding: 5px 7px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--ink);
          border: 1px solid var(--border);
          background: #ffffff;
          text-decoration: none;
        }

        .chakodMasterHome .authAvatar {
          width: 33px;
          height: 33px;
          flex: 0 0 auto;
          border-radius: 11px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #4c1d95, #8b5cf6);
          font-weight: 900;
        }

        .chakodMasterHome .authStatus strong,
        .chakodMasterHome .authStatus span {
          display: block;
          white-space: nowrap;
        }

        .chakodMasterHome .authStatus strong {
          font-size: 10px;
        }

        .chakodMasterHome .authStatus span {
          margin-top: 2px;
          color: var(--muted);
          font-size: 9px;
        }

        .chakodMasterHome .authStatusGuest .authAvatar {
          color: var(--purple);
          background: var(--purple-soft);
        }

        .masterQuickAccess {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 16px 0 2px;
        }

        .masterQuickTrack {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        .masterQuickItem {
          min-width: 0;
          min-height: 82px;
          padding: 12px 8px;
          border: 1px solid #ebe3f5;
          border-radius: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          color: #362544;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 12px 30px rgba(35, 21, 55, 0.055);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .masterQuickItem:hover {
          transform: translateY(-2px);
          border-color: #cdbbea;
          box-shadow: 0 16px 34px rgba(35, 21, 55, 0.09);
        }

        .masterQuickItem > span {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f3edff;
          font-size: 18px;
          font-weight: 900;
        }

        .masterQuickItem > strong {
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-align: center;
          text-overflow: ellipsis;
          font-size: 10px;
        }

        .masterQuickItem:nth-child(1) {
          border-color: #e3d5ff;
          background: linear-gradient(145deg, #ffffff, #f4eeff);
        }

        .masterQuickItem:nth-child(2) {
          border-color: #ccecf0;
          background: linear-gradient(145deg, #ffffff, #eefbfc);
        }

        .masterQuickItem:nth-child(3) {
          border-color: #ffe0ba;
          background: linear-gradient(145deg, #ffffff, #fff7ec);
        }

        .masterQuickItem:nth-child(4) {
          border-color: #d9e4ff;
          background: linear-gradient(145deg, #ffffff, #f1f5ff);
        }

        .masterQuickItem:nth-child(5) {
          border-color: #f4d5e8;
          background: linear-gradient(145deg, #ffffff, #fff2f8);
        }

        .masterQuickItem--showrooms {
          border-color: #ccebe2;
          background: linear-gradient(145deg, #ffffff, #effbf7);
        }

        .masterQuickItem:nth-child(2) > span { color: #0f766e; background: #e4f8f5; }
        .masterQuickItem:nth-child(3) > span { color: #b45309; background: #fff0db; }
        .masterQuickItem:nth-child(4) > span { color: #2563eb; background: #eaf0ff; }
        .masterQuickItem:nth-child(5) > span { color: #be185d; background: #ffe7f3; }

        .masterQuickItem--showrooms > span {
          color: #0f766e;
          background: #e1f8f0;
        }

        .masterStoriesWrap {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 14px 0 2px;
        }

        .masterStoriesWrap:empty {
          display: none;
        }

        .masterTrustSection {
          padding-top: 22px;
          padding-bottom: 20px;
        }

        .masterSectionHeader > div > span {
          display: inline-flex;
          width: fit-content;
          color: var(--purple);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .masterSearch {
          min-height: 46px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 7px;
          padding: 5px;
          border-radius: 15px;
          border: 1px solid #dfd4ef;
          background: #ffffff;
          box-shadow: 0 10px 26px rgba(35, 21, 55, 0.06);
        }

        .masterSearch > .masterSearchLeadingIcon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          color: var(--purple);
          font-size: 20px;
        }

        .masterSearch input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: var(--ink);
          background: transparent;
          font-size: 12px;
        }

        .masterSearch button {
          min-height: 36px;
          padding: 0 17px;
          border: 0;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background: linear-gradient(135deg, #4c1d95, #7c3aed);
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .masterSearchButtonIcon {
          display: none;
          font-size: 18px;
          line-height: 1;
        }

        .masterSection {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 34px 0;
        }

        .masterSection--luxury,
        .masterSection--freezone,
        .masterSection--economic {
          margin-top: 18px;
          padding: 28px;
          border-radius: 30px;
          box-shadow: 0 22px 62px rgba(35, 21, 55, 0.07);
        }

        .masterSection--luxury {
          border: 1px solid #e4d7ff;
          background:
            radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.14), transparent 22rem),
            linear-gradient(145deg, #ffffff, #f8f3ff);
        }

        .masterSection--freezone {
          border: 1px solid #cbeee9;
          background:
            radial-gradient(circle at 100% 0%, rgba(13, 148, 136, 0.14), transparent 22rem),
            linear-gradient(145deg, #ffffff, #f0fdfa);
        }

        .masterSection--economic {
          border: 1px solid #fde6b2;
          background:
            radial-gradient(circle at 100% 0%, rgba(245, 158, 11, 0.15), transparent 22rem),
            linear-gradient(145deg, #ffffff, #fffaf0);
        }

        .masterSection--luxury .masterSectionTitleBlock > span { color: #7c3aed; }
        .masterSection--freezone .masterSectionTitleBlock > span { color: #0f766e; }
        .masterSection--economic .masterSectionTitleBlock > span { color: #b45309; }

        .masterSectionHeader {
          margin-bottom: 18px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 22px;
        }

        .masterSectionTitleBlock {
          min-width: 0;
        }

        .masterSectionTitleRow {
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .masterSectionHeader h2 {
          margin: 0;
          color: var(--ink);
          font-size: 27px;
          line-height: 1.45;
        }

        .masterSectionHeaderSide {
          max-width: 560px;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 13px;
        }

        .masterSectionHeaderSide > p {
          max-width: 470px;
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 2;
        }

        .masterShowAllLink {
          min-height: 39px;
          flex: 0 0 auto;
          padding: 0 13px;
          border: 1px solid var(--border);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--purple-dark);
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(35, 21, 55, 0.07);
          font-size: 9px;
          font-weight: 900;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }

        .masterShowAllLink:hover {
          transform: translateY(-2px);
          border-color: #cdb8ed;
        }

        .masterSectionWithAll .homeRailControls {
          left: 0;
        }

        .masterClearSearch {
          min-height: 38px;
          padding: 0 13px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          color: var(--purple);
          border: 1px solid var(--border);
          background: #ffffff;
          font-size: 10px;
          font-weight: 900;
        }

        .homeRailShell {
          position: relative;
          min-width: 0;
        }

        .homeRailTrack {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: clamp(292px, 28vw, 342px);
          gap: 15px;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          scroll-snap-type: inline mandatory;
          scroll-padding-inline: 2px;
          padding: 4px 2px 18px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .homeRailTrack::-webkit-scrollbar {
          display: none;
        }

        .homeRailTrack > * {
          min-width: 0;
          height: 100%;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .homeRailControls {
          position: absolute;
          top: -58px;
          left: 0;
          z-index: 8;
          display: flex;
          gap: 7px;
        }

        .homeRailControl {
          width: 38px;
          height: 38px;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--purple-dark);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 10px 28px rgba(35, 21, 55, 0.09);
          cursor: pointer;
          font-size: 23px;
          line-height: 1;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }

        .homeRailControl:hover {
          transform: translateY(-2px);
          border-color: #cbb7e5;
        }

        .homeRailControl svg {
          width: 20px;
          height: 20px;
          display: block;
          margin: auto;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .homeRailHint {
          display: none;
          margin-top: -7px;
          color: #8a7f93;
          font-size: 8px;
          font-weight: 700;
          text-align: left;
        }

        .masterListingGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .masterListingCard {
          min-width: 0;
          overflow: hidden;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease;
        }

        .masterListingCard:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-strong);
        }

        .masterListingCard--luxury {
          border-color: #ded1ee;
        }

        .masterListingCard--freezone {
          border-color: #d5e8e4;
        }

        .masterListingCard--economic {
          border-color: #eadfcd;
        }

        .masterListingImage {
          position: relative;
          height: 240px;
          overflow: hidden;
          background: #eee7f5;
        }

        .masterListingImage > a {
          display: block;
          width: 100%;
          height: 100%;
        }

        .masterListingImage img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.28s ease;
        }

        .masterListingCard:hover .masterListingImage img {
          transform: scale(1.035);
        }

        .masterListingBadge,
        .masterListingCategory {
          position: absolute;
          top: 12px;
          z-index: 3;
          padding: 7px 10px;
          border-radius: 999px;
          backdrop-filter: blur(10px);
          font-size: 9px;
          font-weight: 900;
        }

        .masterListingBadge {
          right: 12px;
          color: #ffffff;
          background: rgba(38, 20, 53, 0.83);
        }

        .masterListingCard--freezone .masterListingBadge {
          background: rgba(15, 100, 88, 0.86);
        }

        .masterListingCard--economic .masterListingBadge {
          background: rgba(144, 92, 30, 0.87);
        }

        .masterListingCategory {
          left: 12px;
          color: var(--purple-dark);
          background: rgba(255, 255, 255, 0.94);
        }

        .masterSaveButton {
          position: absolute !important;
          left: 12px !important;
          bottom: 12px !important;
          z-index: 4 !important;
          width: 42px !important;
          height: 42px !important;
          min-width: 42px !important;
          min-height: 42px !important;
          border-radius: 999px !important;
          border: 1px solid rgba(255, 255, 255, 0.76) !important;
          color: var(--ink) !important;
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18) !important;
          backdrop-filter: blur(12px);
        }

        .masterListingContent {
          padding: 16px;
        }

        .masterListingMainLink {
          display: block;
        }

        .masterListingTopLine {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .masterListingTopLine h3 {
          min-width: 0;
          margin: 0;
          color: var(--ink);
          font-size: 15px;
          line-height: 1.7;
        }

        .masterListingTopLine > span {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          color: var(--purple-dark);
          background: var(--purple-soft);
          font-size: 9px;
          font-weight: 800;
        }

        .masterListingMeta,
        .masterListingFacts {
          margin-top: 9px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .masterListingMeta span,
        .masterListingFacts span {
          padding: 5px 8px;
          border-radius: 999px;
          color: #6f6478;
          background: #fbf9ff;
          border: 1px solid #eee7f5;
          font-size: 9px;
          font-weight: 700;
        }

        .masterListingLocation {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #7d7485;
          font-size: 9px;
        }

        .masterListingPrice {
          margin-top: 12px;
          color: var(--purple-dark);
          font-size: 16px;
          font-weight: 900;
        }

        .masterListingFooter {
          margin-top: 13px;
          padding-top: 12px;
          border-top: 1px solid #eee7f5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .masterSeller {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .masterSellerAvatar {
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          border-radius: 11px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #2d163d, #6d28d9);
          font-size: 10px;
          font-weight: 900;
        }

        .masterSeller > span:last-child {
          min-width: 0;
        }

        .masterSeller strong,
        .masterSeller small {
          display: block;
          max-width: 150px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .masterSeller strong {
          color: #3f3447;
          font-size: 10px;
        }

        .masterSeller small {
          margin-top: 2px;
          color: #918899;
          font-size: 8px;
        }

        .masterListingFooter > a {
          flex: 0 0 auto;
          padding: 8px 11px;
          border-radius: 11px;
          color: #ffffff;
          background: linear-gradient(135deg, #4c1d95, #7c3aed);
          font-size: 9px;
          font-weight: 900;
        }

        .masterEmptyShowcase {
          padding: 34px 20px;
          border-radius: 22px;
          text-align: center;
          border: 1px dashed #cfbfdf;
          background: #ffffff;
        }

        .masterEmptyShowcase > span {
          display: block;
          color: var(--purple);
          font-size: 33px;
        }

        .masterEmptyShowcase strong {
          display: block;
          margin-top: 9px;
          font-size: 15px;
        }

        .masterEmptyShowcase p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 10px;
        }

        .masterCategoryGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .masterCategoryCard {
          min-height: 185px;
          padding: 17px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          background: #ffffff;
          box-shadow: var(--shadow);
        }

        .masterCategoryCard > span {
          width: 42px;
          height: 42px;
          margin-bottom: 12px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: var(--purple);
          background: var(--purple-soft);
          font-size: 17px;
          font-weight: 900;
        }

        .masterCategoryCard strong {
          font-size: 13px;
        }

        .masterCategoryCard p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 9px;
          line-height: 1.9;
        }

        .masterCategoryCard small {
          margin-top: auto;
          padding-top: 12px;
          color: var(--purple);
          font-size: 9px;
          font-weight: 900;
        }

        .masterDealerSection {
          position: relative;
          margin-top: 10px;
          padding: 24px 0;
          overflow: visible;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .masterDealerHeader { margin-bottom: 16px; }
        .masterDealerHeader .masterSectionTitleBlock > span { color: #2563eb; }

        .masterDealerShowAll {
          color: #1d4ed8;
          border-color: #cfe2ff;
          box-shadow: 0 10px 28px rgba(37, 99, 235, 0.08);
        }

        .masterDealerRailFrame {
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .homeRailShell--dealers .homeRailTrack {
          grid-auto-columns: clamp(270px, 25vw, 314px);
          padding-bottom: 7px;
        }

        .homeRailShell--dealers .homeRailControls { top: -68px; left: 0; }

        .homeRailShell--dealers .homeRailControl {
          color: #1d4ed8;
          border-color: #cfe2ff;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 10px 28px rgba(37, 99, 235, 0.08);
        }

        .masterDealerShowcaseCard {
          overflow: visible;
          border-radius: 21px;
          color: var(--ink);
          background: #ffffff;
          border: 1px solid #dbeafe;
          box-shadow: 0 18px 44px rgba(41, 70, 118, 0.12);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .masterDealerShowcaseCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 24px 54px rgba(41, 70, 118, 0.17);
        }

        .masterDealerCover {
          position: relative;
          height: 145px;
          overflow: hidden;
          border-radius: 20px 20px 0 0;
          display: grid;
          place-items: center;
          color: #ffffff;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.2), transparent 8rem),
            linear-gradient(135deg, #1d4ed8, #6d28d9 60%, #db2777);
          font-size: 38px;
          font-weight: 900;
        }

        .masterDealerCover::after {
          position: absolute;
          inset: 0;
          content: "";
          background: linear-gradient(180deg, transparent 42%, rgba(13, 7, 20, 0.68));
          pointer-events: none;
        }

        .masterDealerCover img { width: 100%; height: 100%; object-fit: cover; }
        .masterDealerCover > span { position: relative; z-index: 1; }

        .masterDealerCover em {
          position: absolute;
          right: 11px;
          bottom: 10px;
          z-index: 2;
          padding: 6px 9px;
          border: 1px solid rgba(255, 255, 255, 0.32);
          border-radius: 999px;
          color: #ffffff;
          background: rgba(17, 10, 27, 0.58);
          backdrop-filter: blur(10px);
          font-size: 8px;
          font-style: normal;
          font-weight: 900;
        }

        .masterDealerCardBody { padding: 14px; }
        .masterDealerIdentity { display: flex; align-items: center; gap: 9px; }

        .masterDealerMiniLogo {
          width: 39px;
          height: 39px;
          flex: 0 0 auto;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          box-shadow: 0 9px 24px rgba(37, 99, 235, 0.2);
          font-size: 13px;
          font-weight: 900;
        }

        .masterDealerIdentity > div { min-width: 0; }

        .masterDealerIdentity strong,
        .masterDealerIdentity small {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .masterDealerIdentity strong { color: var(--ink); font-size: 12px; }
        .masterDealerIdentity small { margin-top: 4px; color: var(--muted); font-size: 8px; }

        .masterDealerStats {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .masterDealerStats > span {
          padding: 8px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: #5d6675;
          background: #f4f8ff;
          border: 1px solid #dbeafe;
          font-size: 8px;
          font-weight: 700;
        }

        .masterDealerStats > span:last-child {
          color: #047857;
          border-color: #c9f0dd;
          background: #effcf6;
        }

        .masterDealerStats b { color: #1d4ed8; font-size: 10px; }
        .masterDealerStats > span:last-child b { color: #059669; }

        .masterDealerCardActions {
          position: relative;
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 7px;
        }

        .masterDealerCardActions > a,
        .dealerShareTrigger {
          min-height: 39px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
        }

        .masterDealerCardActions > a {
          color: #ffffff;
          background: linear-gradient(135deg, #1d4ed8, #6d28d9);
        }

        .dealerShareActions { position: relative; }

        .dealerShareTrigger {
          min-width: 84px;
          padding: 0 10px;
          gap: 6px;
          color: #1d4ed8;
          border: 1px solid #cfe2ff;
          background: #f3f7ff;
          cursor: pointer;
        }

        .dealerShareTrigger svg { width: 15px; height: 15px; fill: currentColor; }

        .dealerShareMenu {
          position: absolute;
          left: 0;
          bottom: calc(100% + 8px);
          z-index: 30;
          width: 150px;
          padding: 7px;
          border: 1px solid var(--border);
          border-radius: 14px;
          display: grid;
          gap: 4px;
          background: #ffffff;
          box-shadow: 0 18px 48px rgba(30, 18, 43, 0.2);
        }

        .dealerShareMenu a,
        .dealerShareMenu button {
          min-height: 34px;
          padding: 0 9px;
          border: 0;
          border-radius: 9px;
          display: flex;
          align-items: center;
          color: #45394e;
          background: #faf7ff;
          cursor: pointer;
          font: inherit;
          font-size: 9px;
          font-weight: 800;
          text-align: right;
        }

        .masterCenteredHeader {
          display: block;
          max-width: 760px;
          margin: 0 auto 20px;
          text-align: center;
        }

        .masterTrustGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .masterTrustGrid article {
          padding: 19px;
          border-radius: 21px;
          background: #ffffff;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
        }

        .masterTrustGrid article:nth-child(1) { background: linear-gradient(145deg, #ffffff, #f5f1ff); border-color: #e4d7ff; }
        .masterTrustGrid article:nth-child(2) { background: linear-gradient(145deg, #ffffff, #eefbf8); border-color: #cbeee9; }
        .masterTrustGrid article:nth-child(3) { background: linear-gradient(145deg, #ffffff, #fff8e9); border-color: #fde6b2; }
        .masterTrustGrid article:nth-child(4) { background: linear-gradient(145deg, #ffffff, #eff6ff); border-color: #d6e8ff; }

        .masterTrustGrid article > span {
          color: var(--purple);
          font-size: 10px;
          font-weight: 900;
        }

        .masterTrustGrid h3 {
          margin: 12px 0 7px;
          font-size: 13px;
        }

        .masterTrustGrid p {
          margin: 0;
          color: var(--muted);
          font-size: 9px;
          line-height: 1.95;
        }

        .masterFinalCta {
          margin-top: 12px;
          margin-bottom: 34px;
          padding: 26px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          color: #ffffff;
          background: linear-gradient(135deg, #17111f, #4c1d95 70%, #7c3aed);
          box-shadow: 0 24px 66px rgba(35, 21, 55, 0.19);
        }

        .masterFinalCta > div:first-child > span {
          color: #d8c4ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .masterFinalCta h2 {
          max-width: 760px;
          margin: 8px 0 0;
          font-size: 23px;
          line-height: 1.65;
        }

        .masterFinalCta > div:last-child {
          display: flex;
          gap: 8px;
        }

        .masterFinalPrimary,
        .masterFinalSecondary {
          min-height: 41px;
          padding: 0 14px;
          border-radius: 12px;
          display: inline-grid;
          place-items: center;
          font-size: 9px;
          font-weight: 900;
        }

        .masterFinalPrimary {
          color: var(--purple-dark);
          background: #ffffff;
        }

        .masterFinalSecondary {
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.08);
        }

        .masterFooter {
          color: #ffffff;
          background: #17111f;
        }

        .masterFooterMain,
        .masterFooterBottom {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
        }

        .masterFooterMain {
          padding: 30px 0;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 28px;
        }

        .masterFooterBrand {
          align-self: center;
        }

        .masterFooterLogo {
          display: block;
          width: 188px;
          height: auto;
          object-fit: contain;
        }

        .masterFooterMain > p {
          margin: 0;
          color: rgba(255, 255, 255, 0.58);
          font-size: 9px;
        }

        .masterFooterMain > div {
          display: flex;
          gap: 16px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 9px;
          font-weight: 700;
        }

        .masterFooterBottom {
          padding: 13px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          gap: 15px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 8px;
        }

        @media (max-width: 1100px) {
          .masterNavLinks {
            display: none;
          }

          .masterCategoryGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .masterTrustGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .masterSavedLink,
          .masterSubmitButton {
            display: none !important;
          }

          .chakodMasterHome .authStatus {
            min-width: 0;
          }


          .masterFinalCta {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .chakodMasterHome {
            padding-bottom: 0;
          }

          .masterNav {
            display: none;
          }

          .masterBrandLogoDesktop {
            display: none;
          }

          .masterBrandLogoMobile {
            display: block;
            width: 31px;
            height: 36px;
          }

          .masterNavActions {
            display: none;
          }

          .masterHeaderToolsWrap {
            border-top-color: rgba(238, 231, 247, 0.72);
          }

          .masterHeaderTools {
            width: calc(100% - 20px);
            padding: 7px 0 8px;
            grid-template-columns: 34px minmax(96px, 31vw) minmax(0, 1fr);
            gap: 6px;
          }

          .masterHeaderToolsBrand {
            width: 34px;
            height: 40px;
            display: grid;
            place-items: center;
          }

          .masterHeaderToolsBrand img {
            width: 29px;
            height: 34px;
            object-fit: contain;
          }

          .masterLocationControl {
            width: 100%;
            max-width: none;
          }

          .masterLocationControl .homeLocationTrigger {
            width: 100%;
            max-width: 100%;
            min-height: 40px;
          }

          .masterSavedLink,
          .masterSubmitButton,
          .chakodMasterHome .authStatusShell,
          .chakodMasterHome .masterNavActions > .authStatus {
            display: none !important;
          }

          .masterQuickAccess {
            width: calc(100% - 20px);
            padding: 10px 0 0;
          }

          .masterQuickTrack {
            grid-template-columns: none;
            grid-auto-flow: column;
            grid-auto-columns: 86px;
            gap: 8px;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            scroll-snap-type: inline mandatory;
            padding: 1px 1px 7px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .masterQuickTrack::-webkit-scrollbar {
            display: none;
          }

          .masterQuickItem {
            min-height: 76px;
            padding: 9px 6px;
            border-radius: 17px;
            gap: 6px;
            scroll-snap-align: start;
            box-shadow: 0 8px 22px rgba(35, 21, 55, 0.045);
          }

          .masterQuickItem > span {
            width: 39px;
            height: 39px;
            border-radius: 14px;
            font-size: 17px;
          }

          .masterQuickItem > strong {
            font-size: 8px;
          }

          .masterStoriesWrap,
          .masterSection,
          .masterFooterMain,
          .masterFooterBottom {
            width: calc(100% - 20px);
          }

          .masterStoriesWrap {
            padding: 7px 0 0;
          }

          .masterStoriesWrap:empty {
            display: none;
          }

          .masterTrustSection {
            padding-top: 14px;
            padding-bottom: 12px;
          }

          .masterCenteredHeader {
            margin-bottom: 12px;
          }

          .masterSearch {
            min-height: 40px;
            border-radius: 12px;
            padding: 3px;
            gap: 3px;
          }

          .masterSearch > .masterSearchLeadingIcon {
            width: 27px;
            height: 27px;
            font-size: 17px;
          }

          .masterSearch input {
            font-size: 10px;
          }

          .masterSearch button {
            width: 34px;
            min-width: 34px;
            min-height: 34px;
            padding: 0;
            border-radius: 10px;
          }

          .masterSearchButtonText {
            display: none;
          }

          .masterSearchButtonIcon {
            display: inline;
          }

          .masterSection {
            padding: 24px 0;
          }

          .masterSection--luxury,
          .masterSection--freezone,
          .masterSection--economic {
            padding: 18px 14px;
            border-radius: 22px;
          }

          .masterDealerSection {
            padding: 18px 0;
            border-radius: 0;
          }

          .masterDealerRailFrame {
            margin-inline: -5px;
            padding: 8px;
            border-radius: 18px;
          }

          .masterSectionHeader {
            margin-bottom: 13px;
            display: block;
          }

          .masterSectionTitleRow {
            margin-top: 4px;
            justify-content: space-between;
            gap: 10px;
          }

          .masterSectionHeader h2 {
            margin: 0;
            font-size: 20px;
          }

          .masterSectionHeaderSide {
            width: 100%;
            max-width: none;
            margin-top: 7px;
            display: block;
          }

          .masterSectionHeaderSide > p {
            margin: 0;
            font-size: 9px;
            line-height: 1.85;
          }

          .masterShowAllLink {
            min-height: 34px;
            padding: 0 10px;
            border-radius: 10px;
            font-size: 8px;
            white-space: nowrap;
          }

          .masterListingGrid {
            grid-template-columns: 1fr;
            gap: 13px;
          }

          .homeRailTrack {
            grid-auto-columns: min(83vw, 318px);
            gap: 11px;
            margin-inline: -1px;
            padding: 3px 1px 15px;
          }

          .homeRailControls {
            display: none;
          }

          .homeRailHint {
            display: block;
          }

          .masterListingCard {
            border-radius: 20px;
          }

          .masterListingImage {
            height: 205px;
          }

          .masterListingContent {
            padding: 14px;
          }

          .masterListingTopLine h3 {
            font-size: 14px;
          }

          .masterListingPrice {
            font-size: 15px;
          }

          .masterCategoryGrid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .masterCategoryCard {
            min-height: 165px;
            padding: 14px;
            border-radius: 18px;
          }

          .masterCategoryCard > span {
            width: 37px;
            height: 37px;
            margin-bottom: 10px;
          }

          .masterCategoryCard strong {
            font-size: 11px;
          }

          .masterCategoryCard p {
            font-size: 8px;
          }

          .homeRailShell--dealers .homeRailTrack {
            grid-auto-columns: min(82vw, 304px);
          }

          .masterDealerCover {
            height: 132px;
          }

          .masterDealerCardBody {
            padding: 12px;
          }

          .dealerShareTrigger {
            min-width: 74px;
          }

          .masterTrustGrid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .masterTrustGrid article {
            padding: 14px;
            border-radius: 18px;
          }

          .masterTrustGrid h3 {
            font-size: 10px;
          }

          .masterTrustGrid p {
            font-size: 7px;
          }

          .masterFinalCta {
            width: calc(100% - 20px);
            margin-top: 8px;
            margin-bottom: 16px;
            padding: 14px 13px;
            gap: 11px;
            border-radius: 19px;
          }

          .masterFinalCta > div:first-child > span {
            font-size: 7px;
            letter-spacing: 0.7px;
          }

          .masterFinalCta h2 {
            margin-top: 5px;
            font-size: 15px;
            line-height: 1.6;
          }

          .masterFinalCta > div:last-child {
            width: 100%;
            gap: 6px;
          }

          .masterFinalPrimary,
          .masterFinalSecondary {
            flex: 1;
            min-height: 36px;
            padding: 0 7px;
            border-radius: 10px;
            font-size: 8px;
          }

          .masterFooterMain {
            padding: 24px 0 18px;
            display: block;
          }

          .masterFooterLogo {
            width: 176px;
          }

          .masterFooterMain > p {
            margin-top: 12px;
          }

          .masterFooterMain > div {
            margin-top: 17px;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            flex-wrap: wrap;
          }

          .masterFooterBottom {
            display: block;
            padding-bottom: 10px;
            line-height: 1.9;
          }
        }

        @media (max-width: 380px) {
          .masterBrandLogoMobile {
            width: 29px;
            height: 34px;
          }

          .masterHeaderTools {
            grid-template-columns: 31px minmax(92px, 30vw) minmax(0, 1fr);
            gap: 5px;
          }

          .masterHeaderToolsBrand {
            width: 31px;
          }

          .masterHeaderToolsBrand img {
            width: 27px;
            height: 32px;
          }

          .masterSearch input {
            font-size: 9px;
          }

          .masterCategoryGrid,
          .masterTrustGrid {
            grid-template-columns: 1fr;
          }

          .homeRailTrack {
            grid-auto-columns: min(86vw, 300px);
          }

          .dealerShareTrigger span {
            display: none;
          }

          .dealerShareTrigger {
            min-width: 42px;
            width: 42px;
            padding: 0;
          }
        }
      `}</style>
    </main>
  );
}