import AuthStatus from "./components/AuthStatus";
import HomeStories from "./components/HomeStories";
import HomeLocationSelector from "./components/HomeLocationSelector";
import HomeBannerSlot from "./components/HomeBannerSlot";
import SaveListingButton from "./components/SaveListingButton";

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

type DealerPreview = {
  name: string;
  city: string;
  listingCount: number;
  coverImage: string | null;
};

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

function formatPrice(price: number | null) {
  if (!price) {
    return "قیمت توافقی";
  }

  if (price >= 1_000_000_000) {
    return `${(price / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
}

function formatMileage(mileage: number | null) {
  if (mileage === null || mileage === undefined) {
    return "کارکرد نامشخص";
  }

  return `${new Intl.NumberFormat("fa-IR").format(mileage)} کیلومتر`;
}

function getImageUrl(path: string | null) {
  if (!path) {
    return "https://placehold.co/1200x800/17111f/f4eaff?text=CHAKOD";
  }

  if (path.startsWith("http")) {
    return path;
  }

  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getSellerLabel(listing: Listing) {
  if (listing.dealer_name) {
    return listing.dealer_name;
  }

  const labels: Record<string, string> = {
    personal: "فروشنده شخصی",
    dealer: "نمایشگاه خودرو",
    importer: "واردکننده",
    freezone_operator: "فعال منطقه آزاد",
  };

  return labels[listing.seller_type] || "فروشنده";
}

function getDealerPreviews(listings: Listing[]): DealerPreview[] {
  const dealers = new Map<string, DealerPreview>();

  for (const listing of listings) {
    const dealerName = listing.dealer_name?.trim();

    if (!dealerName) {
      continue;
    }

    const currentDealer = dealers.get(dealerName);

    if (currentDealer) {
      currentDealer.listingCount += 1;

      if (!currentDealer.coverImage && listing.cover_image) {
        currentDealer.coverImage = listing.cover_image;
      }

      continue;
    }

    dealers.set(dealerName, {
      name: dealerName,
      city: listing.city || "شهر نامشخص",
      listingCount: 1,
      coverImage: listing.cover_image,
    });
  }

  return Array.from(dealers.values())
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 6);
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
    <article className={`masterListingCard masterListingCard--${tone}`}>
      <div className="masterListingImage">
        <a href={`/listing/${listing.id}`} aria-label={listing.title}>
          <img
            src={getImageUrl(listing.cover_image)}
            alt={listing.title}
            loading="lazy"
            decoding="async"
          />
        </a>

        <span className="masterListingBadge">{badge}</span>

        {listing.category_name ? (
          <span className="masterListingCategory">
            {listing.category_name}
          </span>
        ) : null}

        <SaveListingButton
          listingId={listing.id}
          compact
          className="masterSaveButton"
        />
      </div>

      <div className="masterListingContent">
        <a href={`/listing/${listing.id}`} className="masterListingMainLink">
          <div className="masterListingTopLine">
            <h3>{listing.title}</h3>
            <span>{listing.production_year || "سال نامشخص"}</span>
          </div>

          <div className="masterListingMeta">
            <span>{listing.brand}</span>
            <span>{listing.model}</span>
            {listing.transmission ? <span>{listing.transmission}</span> : null}
          </div>

          <div className="masterListingFacts">
            <span>{formatMileage(listing.mileage_km)}</span>
            <span>{listing.body_status || "بدنه نامشخص"}</span>
          </div>

          <div className="masterListingLocation">
            <span aria-hidden="true">⌖</span>
            <span>
              {[listing.city, listing.neighborhood]
                .filter(Boolean)
                .join("، ") || "موقعیت نامشخص"}
            </span>
          </div>

          <div className="masterListingPrice">
            {formatPrice(listing.price_toman)}
          </div>
        </a>

        <div className="masterListingFooter">
          <div className="masterSeller">
            <span className="masterSellerAvatar">
              {getSellerLabel(listing).slice(0, 1)}
            </span>

            <span>
              <strong>{getSellerLabel(listing)}</strong>
              <small>عضو چاکود</small>
            </span>
          </div>

          <a href={`/listing/${listing.id}`}>مشاهده آگهی</a>
        </div>
      </div>
    </article>
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
  emptyText,
}: {
  id: string;
  kicker: string;
  title: string;
  description: string;
  listings: ShowcaseListing[];
  badge: string;
  tone: "luxury" | "freezone" | "economic";
  emptyText: string;
}) {
  if (listings.length === 0) {
    return (
      <section className="masterSection" id={id}>
        <div className="masterSectionHeader">
          <div>
            <span>{kicker}</span>
            <h2>{title}</h2>
          </div>
          <p>{description}</p>
        </div>

        <div className="masterEmptyShowcase">
          <span>✦</span>
          <strong>{emptyText}</strong>
          <p>آگهی‌های مناسب پس از بررسی در این بخش نمایش داده می‌شوند.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`masterSection masterSection--${tone}`} id={id}>
      <div className="masterSectionHeader">
        <div>
          <span>{kicker}</span>
          <h2>{title}</h2>
        </div>

        <p>{description}</p>
      </div>

      <div className="masterListingGrid">
        {listings.map((listing) => (
          <ShowcaseCard
            key={listing.id}
            listing={listing}
            badge={badge}
            tone={tone}
          />
        ))}
      </div>
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
          <a className="masterBrand" href="/" aria-label="صفحه اصلی چاکود">
            <span className="masterBrandMark">چ</span>

            <span className="masterBrandText">
              <strong>چاکود</strong>
              <small>مرجع خودروهای لوکس و منطقه آزاد</small>
            </span>
          </a>

          <div className="masterNavLinks">
            <a href="#luxury">خودروهای لوکس</a>
            <a href="#freezone">منطقه آزاد</a>
            <a href="#economic">اقتصادی</a>
            <a href="#dealers">نمایشگاه‌ها</a>
          </div>

          <div className="masterNavActions">
            <div className="masterLocationControl">
              <HomeLocationSelector />
            </div>

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
      </header>

      <div className="masterStoriesWrap">
        <HomeStories />
      </div>

      <HomeBannerSlot />

      <section className="masterHero">
        <div className="masterHeroContent">
          <div className="masterHeroSearchArea">
            <form className="masterSearch" action="/" method="get">
              <label className="masterSrOnly" htmlFor="master-search">
                جست‌وجوی خودرو
              </label>

              <span aria-hidden="true">⌕</span>

              <input
                id="master-search"
                name="q"
                defaultValue={query}
                placeholder="برند، مدل، شهر یا نمایشگاه..."
                autoComplete="off"
              />

              <button type="submit">جست‌وجو</button>
            </form>

            <div className="masterHeroLinks">
              <a href="#luxury">منتخب لوکس</a>
              <a href="#freezone">منطقه آزاد</a>
              <a href="#economic">خودروهای اقتصادی</a>
            </div>
          </div>
        </div>
      </section>

      {query ? (
        <section className="masterSection masterSearchResults">
          <div className="masterSectionHeader">
            <div>
              <span>نتیجه جست‌وجو</span>
              <h2>نتایج برای «{query}»</h2>
            </div>

            <a className="masterClearSearch" href="/">
              پاک‌کردن جست‌وجو
            </a>
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
            emptyText="هنوز خودروی لوکس مناسبی برای نمایش نداریم"
          />

          <ShowcaseSection
            id="freezone"
            kicker="FREE ZONE"
            title="تازه‌های منطقه آزاد"
            description="ویترین اختصاصی خودروهای منطقه آزاد؛ جدا از بازار عمومی و با اولویت بالا در صفحه اصلی."
            listings={freezone}
            badge="منطقه آزاد"
            tone="freezone"
            emptyText="هنوز آگهی منطقه آزاد تأییدشده‌ای ثبت نشده"
          />

          <ShowcaseSection
            id="economic"
            kicker="SMART VALUE"
            title="انتخاب‌های اقتصادی چاکود"
            description="تعداد محدودی خودروی اقتصادی و ارزشمند که از نظر قیمت، سال و کیفیت آگهی انتخاب شده‌اند."
            listings={economic}
            badge="ارزش خرید"
            tone="economic"
            emptyText="هنوز گزینه اقتصادی مناسبی برای نمایش نداریم"
          />
        </>
      )}

      <section className="masterSection" id="categories">
        <div className="masterSectionHeader">
          <div>
            <span>ورود سریع</span>
            <h2>تمام بازار خودرو در دسترس است</h2>
          </div>

          <p>
            خودروهای معمولی از صفحه اصلی حذف نشده‌اند؛ از جست‌وجو و دسته‌بندی
            به همه آگهی‌ها دسترسی داری.
          </p>
        </div>

        <div className="masterCategoryGrid">
          {categories.slice(0, 6).map((category) => (
            <a
              key={category.id}
              className="masterCategoryCard"
              href={`/submit?category=${encodeURIComponent(category.code)}`}
            >
              <span>{getCategoryIcon(category.code)}</span>
              <strong>{category.name}</strong>
              <p>{category.description}</p>
              <small>ورود به این مسیر ←</small>
            </a>
          ))}
        </div>
      </section>

      <section className="masterSection" id="dealers">
        <div className="masterDealerPanel">
          <div className="masterDealerIntro">
            <span>SHOWROOMS OF CHAKOD</span>
            <h2>نمایشگاه‌های عضو؛ هویت حرفه‌ای، نه فقط یک حساب کاربری</h2>
            <p>
              صفحه اختصاصی، آگهی‌های مرتب، نشان عضویت و لینک قابل اشتراک‌گذاری
              برای مشتریان.
            </p>
            <a href="/dealers">مشاهده نمایشگاه‌ها</a>
          </div>

          <div className="masterDealerGrid">
            {dealers.length > 0 ? (
              dealers.map((dealer) => (
                <article className="masterDealerCard" key={dealer.name}>
                  <div className="masterDealerImage">
                    {dealer.coverImage ? (
                      <img
                        src={getImageUrl(dealer.coverImage)}
                        alt={dealer.name}
                        loading="lazy"
                      />
                    ) : (
                      <span>{dealer.name.slice(0, 1)}</span>
                    )}
                  </div>

                  <div>
                    <strong>{dealer.name}</strong>
                    <small>{dealer.city}</small>
                  </div>

                  <span>
                    {new Intl.NumberFormat("fa-IR").format(dealer.listingCount)}
                    <small> آگهی</small>
                  </span>
                </article>
              ))
            ) : (
              <>
                <article className="masterDealerCard">
                  <div className="masterDealerImage">
                    <span>چ</span>
                  </div>
                  <div>
                    <strong>ویترین اختصاصی نمایشگاه</strong>
                    <small>نام، شهر و هویت رسمی کسب‌وکار</small>
                  </div>
                  <span>✓</span>
                </article>

                <article className="masterDealerCard">
                  <div className="masterDealerImage">
                    <span>◆</span>
                  </div>
                  <div>
                    <strong>نشان عضویت چاکود</strong>
                    <small>اعتماد بیشتر در معرفی به مشتری</small>
                  </div>
                  <span>✓</span>
                </article>
              </>
            )}
          </div>
        </div>
      </section>

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

      <section className="masterSection masterFinalCta">
        <div>
          <span>CHAKOD PREMIUM MARKET</span>
          <h2>خودروی خاص یا نمایشگاه حرفه‌ای خود را در جای درست معرفی کن</h2>
        </div>

        <div>
          <a className="masterFinalPrimary" href="/submit">
            ثبت آگهی خودرو
          </a>
          <a className="masterFinalSecondary" href="/dealers">
            نمایشگاه‌های چاکود
          </a>
        </div>
      </section>

      <footer className="masterFooter">
        <div className="masterFooterMain">
          <a className="masterBrand" href="/">
            <span className="masterBrandMark">چ</span>
            <span className="masterBrandText">
              <strong>چاکود</strong>
              <small>مرجع خودروهای لوکس و منطقه آزاد</small>
            </span>
          </a>

          <p>
            ویترین تخصصی خودروهای ارزشمند، منطقه آزاد و فروشندگان حرفه‌ای.
          </p>

          <div>
            <a href="#luxury">لوکس</a>
            <a href="#freezone">منطقه آزاد</a>
            <a href="#economic">اقتصادی</a>
            <a href="/rules">قوانین</a>
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
          overflow: hidden;
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
          border-bottom: 1px solid rgba(232, 223, 244, 0.92);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(18px);
        }

        .masterNav {
          width: min(1240px, calc(100% - 32px));
          min-height: 72px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .masterBrand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: max-content;
        }

        .masterBrandMark {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #ffffff;
          font-size: 18px;
          font-weight: 900;
          background: linear-gradient(145deg, #2d163d, #6d28d9);
          box-shadow: 0 12px 28px rgba(76, 29, 149, 0.22);
        }

        .masterBrandText {
          display: grid;
          gap: 2px;
        }

        .masterBrandText strong {
          color: var(--ink);
          font-size: 17px;
        }

        .masterBrandText small {
          color: var(--muted);
          font-size: 9px;
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
          min-width: 0;
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

        .masterStoriesWrap {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 22px 0 4px;
        }

        .masterHero {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 10px 0 22px;
        }

        .masterHeroContent {
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: #ffffff;
          box-shadow: var(--shadow);
        }

        .masterHeroSearchArea {
          min-width: 0;
        }

        .masterSectionHeader > div > span {
          display: inline-flex;
          width: fit-content;
          color: var(--purple);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .masterHeroSearchArea {
          padding: 0;
        }

        .masterSearch {
          min-height: 58px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 7px;
          border-radius: 18px;
          border: 1px solid #dfd4ef;
          background: #ffffff;
          box-shadow: 0 13px 34px rgba(35, 21, 55, 0.07);
        }

        .masterSearch > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          color: var(--purple);
          font-size: 23px;
        }

        .masterSearch input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: var(--ink);
          background: transparent;
          font-size: 13px;
        }

        .masterSearch button {
          min-height: 44px;
          padding: 0 22px;
          border: 0;
          border-radius: 13px;
          color: #ffffff;
          background: linear-gradient(135deg, #4c1d95, #7c3aed);
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .masterHeroLinks {
          margin-top: 13px;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .masterHeroLinks a {
          padding: 7px 10px;
          border-radius: 999px;
          color: #5f526a;
          background: #fbf9ff;
          border: 1px solid #eee7f7;
          font-size: 9px;
          font-weight: 800;
        }

        .masterSection {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 34px 0;
        }

        .masterSectionHeader {
          margin-bottom: 18px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 22px;
        }

        .masterSectionHeader h2 {
          margin: 5px 0 0;
          color: var(--ink);
          font-size: 27px;
          line-height: 1.45;
        }

        .masterSectionHeader > p {
          max-width: 520px;
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 2;
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

        .masterDealerPanel {
          padding: 30px;
          border-radius: 28px;
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(380px, 1.2fr);
          gap: 24px;
          color: #ffffff;
          background:
            radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.13), transparent 17rem),
            linear-gradient(140deg, #17111f, #2f173f 50%, #5b21b6);
          box-shadow: 0 26px 72px rgba(30, 18, 43, 0.19);
        }

        .masterDealerIntro > span {
          color: #d8c3ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .masterDealerIntro h2 {
          margin: 9px 0 10px;
          font-size: 27px;
          line-height: 1.6;
        }

        .masterDealerIntro p {
          margin: 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 10px;
          line-height: 2;
        }

        .masterDealerIntro > a {
          min-height: 41px;
          margin-top: 16px;
          padding: 0 14px;
          border-radius: 12px;
          display: inline-grid;
          place-items: center;
          color: var(--purple-dark);
          background: #ffffff;
          font-size: 10px;
          font-weight: 900;
        }

        .masterDealerGrid {
          display: grid;
          align-content: center;
          gap: 9px;
        }

        .masterDealerCard {
          min-height: 70px;
          padding: 10px;
          border-radius: 17px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .masterDealerImage {
          width: 43px;
          height: 43px;
          overflow: hidden;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: var(--purple-dark);
          background: #ffffff;
          font-weight: 900;
        }

        .masterDealerImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .masterDealerCard > div:nth-child(2) {
          min-width: 0;
        }

        .masterDealerCard strong,
        .masterDealerCard small {
          display: block;
        }

        .masterDealerCard strong {
          overflow: hidden;
          color: #ffffff;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 10px;
        }

        .masterDealerCard small {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.55);
          font-size: 8px;
        }

        .masterDealerCard > span {
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
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

        .masterFooter .masterBrandText strong {
          color: #ffffff;
        }

        .masterFooter .masterBrandText small {
          color: rgba(255, 255, 255, 0.52);
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

          .masterListingGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .masterCategoryGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .masterTrustGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .masterSavedLink {
            display: none;
          }

          .chakodMasterHome .authStatus {
            min-width: 0;
          }

          .masterHeroContent {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .masterDealerPanel {
            grid-template-columns: 1fr;
          }

          .masterFinalCta {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .chakodMasterHome {
            padding-bottom: 86px;
          }

          .masterNav {
            width: calc(100% - 20px);
            min-height: 62px;
            gap: 8px;
          }

          .masterBrand {
            gap: 7px;
          }

          .masterBrandMark {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            font-size: 16px;
          }

          .masterBrandText small {
            display: none;
          }

          .masterBrandText strong {
            font-size: 14px;
          }

          .masterNavActions {
            flex: 1;
            justify-content: flex-end;
            margin-right: auto;
            gap: 5px;
          }

          .masterLocationControl {
            min-width: 0;
          }

          .masterSavedLink,
          .masterSubmitButton {
            display: none;
          }

          .chakodMasterHome .authStatusShell {
            width: 38px;
            flex: 0 0 38px;
          }

          .chakodMasterHome .authStatus {
            width: 38px;
            min-width: 38px;
            min-height: 38px;
            padding: 1px;
            border: 0;
            background: transparent;
          }

          .chakodMasterHome .authStatusText,
          .chakodMasterHome .authMenuChevron {
            display: none;
          }

          .chakodMasterHome .authAvatar {
            width: 36px;
            height: 36px;
            border-radius: 11px;
          }

          .masterStoriesWrap,
          .masterHero,
          .masterSection,
          .masterFooterMain,
          .masterFooterBottom {
            width: calc(100% - 20px);
          }

          .masterStoriesWrap {
            padding: 14px 0 1px;
          }

          .masterHero {
            padding: 7px 0 16px;
          }

          .masterHeroContent {
            padding: 9px;
            border-radius: 18px;
          }

          .masterHeroSearchArea {
            padding: 0;
          }

          .masterSearch {
            min-height: 50px;
            border-radius: 15px;
            padding: 5px;
          }

          .masterSearch > span {
            width: 31px;
            height: 31px;
            font-size: 19px;
          }

          .masterSearch input {
            font-size: 10px;
          }

          .masterSearch button {
            min-height: 38px;
            padding: 0 11px;
            border-radius: 10px;
            font-size: 9px;
          }

          .masterHeroLinks {
            margin-top: 10px;
            gap: 6px;
          }

          .masterHeroLinks a {
            padding: 6px 8px;
            font-size: 7px;
          }


          .masterSection {
            padding: 24px 0;
          }

          .masterSectionHeader {
            margin-bottom: 13px;
            display: block;
          }

          .masterSectionHeader h2 {
            margin-top: 4px;
            font-size: 20px;
          }

          .masterSectionHeader > p {
            margin-top: 7px;
            font-size: 9px;
            line-height: 1.85;
          }

          .masterListingGrid {
            grid-template-columns: 1fr;
            gap: 13px;
          }

          .masterListingCard {
            border-radius: 20px;
          }

          .masterListingImage {
            height: 225px;
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

          .masterDealerPanel {
            padding: 20px 15px;
            border-radius: 22px;
            gap: 18px;
          }

          .masterDealerIntro h2 {
            font-size: 20px;
          }

          .masterDealerIntro p {
            font-size: 8px;
          }

          .masterDealerCard {
            min-height: 62px;
            border-radius: 14px;
          }

          .masterDealerImage {
            width: 38px;
            height: 38px;
            border-radius: 11px;
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
            margin-bottom: 24px;
            padding: 19px 15px;
            border-radius: 21px;
          }

          .masterFinalCta h2 {
            font-size: 18px;
          }

          .masterFinalCta > div:last-child {
            width: 100%;
          }

          .masterFinalPrimary,
          .masterFinalSecondary {
            flex: 1;
            min-height: 39px;
            padding: 0 8px;
            font-size: 8px;
          }

          .masterFooterMain {
            padding: 24px 0 18px;
            display: block;
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
            line-height: 1.9;
          }
        }

        @media (max-width: 380px) {
          .masterBrandText {
            display: none;
          }

          .masterCategoryGrid,
          .masterTrustGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}