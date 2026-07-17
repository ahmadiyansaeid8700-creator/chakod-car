"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DealerShareActions from "./DealerShareActions";
import HomeHorizontalRail from "./HomeHorizontalRail";
import ListingCard, { type ListingCardData } from "./ListingCard";

const API_URL = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";
const SITE_BASE = "https://chakod.com";

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
};

type ApiResponse = { success?: boolean; data?: Listing[] };
type Tone = "luxury" | "freezone" | "economic";

type DealerPreview = {
  name: string;
  city: string;
  listingCount: number;
  coverImage: string | null;
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
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function includesAny(value: string, needles: string[]) {
  const normalizedValue = normalizeText(value);
  return needles.some((needle) => normalizedValue.includes(normalizeText(needle)));
}

function isFreezone(listing: Listing) {
  const text = [
    listing.market_segment || "", listing.category_code, listing.category_name,
    listing.title, listing.province, listing.city,
  ].join(" ");
  return listing.market_segment === "freezone" || includesAny(text, [
    "freezone", "منطقه آزاد", "کیش", "قشم", "اروند", "انزلی", "ارس", "ماکو", "چابهار",
  ]);
}

function isLuxury(listing: Listing) {
  return !isFreezone(listing) && (
    listing.market_segment === "luxury" ||
    listing.category_code === "luxury" ||
    includesAny(`${listing.brand} ${listing.model} ${listing.title}`, luxuryBrands) ||
    Number(listing.price_toman || 0) >= 2_000_000_000
  );
}

function isEconomic(listing: Listing) {
  const price = Number(listing.price_toman || 0);
  return listing.market_segment === "economic" || (
    price > 0 && price <= 1_500_000_000 && !isFreezone(listing) && !isLuxury(listing)
  );
}

function byNewest(a: Listing, b: Listing) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function matchesQuery(listing: Listing, query: string) {
  const text = [
    listing.title, listing.brand, listing.model, listing.trim_name || "",
    listing.province, listing.city, listing.neighborhood, listing.dealer_name || "",
    listing.category_name,
  ].join(" ");
  return normalizeText(text).includes(normalizeText(query));
}

function getImageUrl(path: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${SITE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getDealers(listings: Listing[]): DealerPreview[] {
  const map = new Map<string, DealerPreview>();
  for (const listing of listings) {
    const name = listing.dealer_name?.trim();
    if (!name) continue;
    const current = map.get(name);
    if (current) {
      current.listingCount += 1;
      if (!current.coverImage && listing.cover_image) current.coverImage = listing.cover_image;
    } else {
      map.set(name, {
        name,
        city: listing.city || "شهر نامشخص",
        listingCount: 1,
        coverImage: listing.cover_image || null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.listingCount - a.listingCount).slice(0, 6);
}

function ShowcaseSection({
  id, kicker, title, description, listings, badge, tone, allHref,
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
    <section className={`masterSection masterSection--${tone} masterSectionWithAll`} id={id}>
      <div className="masterSectionHeader">
        <div className="masterSectionTitleBlock">
          <span>{kicker}</span>
          <div className="masterSectionTitleRow">
            <h2>{title}</h2>
            <a className="masterShowAllLink" href={allHref} aria-label={`نمایش همه ${title}`}>
              نمایش همه <span aria-hidden="true">←</span>
            </a>
          </div>
        </div>
        <div className="masterSectionHeaderSide"><p>{description}</p></div>
      </div>
      <HomeHorizontalRail
        ariaLabel={title}
        className={`homeRailShell--${tone}`}
        showControls={listings.length > 3}
      >
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} badge={badge} tone={tone} variant="rail" />
        ))}
      </HomeHorizontalRail>
    </section>
  );
}

function DealerSection({ dealers }: { dealers: DealerPreview[] }) {
  if (dealers.length === 0) return null;
  return (
    <section className="masterSection masterDealerSection" id="dealers">
      <div className="masterSectionHeader masterDealerHeader">
        <div className="masterSectionTitleBlock">
          <span>SHOWROOMS OF CHAKOD</span>
          <div className="masterSectionTitleRow">
            <h2>نمایشگاه‌های منتخب</h2>
            <Link className="masterShowAllLink masterDealerShowAll" href="/showrooms">
              نمایش همه <span aria-hidden="true">←</span>
            </Link>
          </div>
        </div>
        <div className="masterSectionHeaderSide">
          <p>نمایشگاه‌های فعال با خودروهای واقعی؛ برای دیدن موجودی و اطلاعات شعبه وارد ویترین نمایشگاه شو.</p>
        </div>
      </div>
      <div className="masterDealerRailFrame">
        <HomeHorizontalRail ariaLabel="نمایشگاه‌های منتخب چاکود" className="homeRailShell--dealers" showControls={dealers.length > 2}>
          {dealers.map((dealer) => {
            const dealerHref = `/showrooms/${encodeURIComponent(dealer.name)}`;
            return (
              <article className="masterDealerShowcaseCard" key={dealer.name}>
                <a className="masterDealerCover" href={dealerHref} aria-label={`مشاهده خودروهای ${dealer.name}`}>
                  {dealer.coverImage ? (
                    <img src={getImageUrl(dealer.coverImage)} alt={dealer.name} loading="lazy" decoding="async" />
                  ) : <span>{dealer.name.slice(0, 1)}</span>}
                  <em>نمایشگاه تأییدشده</em>
                </a>
                <div className="masterDealerCardBody">
                  <div className="masterDealerIdentity">
                    <span className="masterDealerMiniLogo">{dealer.name.slice(0, 1)}</span>
                    <div><strong>{dealer.name}</strong><small>{dealer.city}</small></div>
                  </div>
                  <div className="masterDealerStats">
                    <span><b>{new Intl.NumberFormat("fa-IR").format(dealer.listingCount)}</b> خودرو</span>
                    <span><b>✓</b> هویت تأییدشده</span>
                  </div>
                  <div className="masterDealerCardActions">
                    <a href={dealerHref}>مشاهده نمایشگاه</a>
                    <DealerShareActions dealerName={dealer.name} city={dealer.city} href={dealerHref} />
                  </div>
                </div>
              </article>
            );
          })}
        </HomeHorizontalRail>
      </div>
    </section>
  );
}

export default function HomePublicListingsClient({ query }: { query: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as ApiResponse;
        if (!payload.success || !Array.isArray(payload.data)) throw new Error("Invalid API response");
        setListings(payload.data);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const data = useMemo(() => {
    const sorted = [...listings].sort(byNewest);
    const freezone = sorted.filter(isFreezone).slice(0, 9);
    const luxury = sorted.filter(isLuxury).slice(0, 9);
    const used = new Set([...freezone, ...luxury].map((item) => item.id));
    const economic = sorted.filter((item) => !used.has(item.id) && isEconomic(item)).slice(0, 9);
    const searchResults = query ? sorted.filter((item) => matchesQuery(item, query)).slice(0, 12) : [];
    return { freezone, luxury, economic, searchResults, dealers: getDealers(sorted) };
  }, [listings, query]);

  if (status === "loading") {
    return (
      <section className="masterSection masterEmptyShowcase" aria-live="polite">
        <span>◌</span><strong>در حال دریافت خودروهای چاکود</strong>
        <p>کارت‌ها مستقیم از فهرست فعال آگهی‌ها بارگذاری می‌شوند.</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="masterSection masterEmptyShowcase" aria-live="polite">
        <span>!</span><strong>دریافت آگهی‌ها ناموفق بود</strong>
        <p>مرورگر نتوانست به API چاکود متصل شود.</p>
        <button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button>
      </section>
    );
  }

  return (
    <>
      {query ? (
        <section className="masterSection masterSearchResults">
          <div className="masterSectionHeader">
            <div><span>نتیجه جست‌وجو</span><h2>نتایج برای «{query}»</h2></div>
            <Link className="masterClearSearch" href="/">پاک‌کردن جست‌وجو</Link>
          </div>
          {data.searchResults.length === 0 ? (
            <div className="masterEmptyShowcase">
              <span>⌕</span><strong>نتیجه‌ای پیدا نشد</strong>
              <p>نام برند، مدل، شهر یا نمایشگاه را با عبارت دیگری جست‌وجو کن.</p>
            </div>
          ) : (
            <div className="masterListingGrid">
              {data.searchResults.map((listing) => (
                <ListingCard key={listing.id} listing={listing} badge="نتیجه جست‌وجو" tone="neutral" variant="grid" />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <ShowcaseSection id="luxury" kicker="CHAKOD LUXURY" title="منتخب خودروهای لوکس" description="خودروهای ممتاز بر اساس برند، قیمت و کیفیت آگهی در اولویت نمایش قرار می‌گیرند." listings={data.luxury} badge="منتخب لوکس" tone="luxury" allHref="/ads/luxury" />
          <ShowcaseSection id="freezone" kicker="FREE ZONE" title="تازه‌های منطقه آزاد" description="ویترین اختصاصی خودروهای منطقه آزاد؛ جدا از بازار عمومی و قابل بررسی سریع." listings={data.freezone} badge="منطقه آزاد" tone="freezone" allHref="/ads/freezone" />
          <ShowcaseSection id="economic" kicker="SMART VALUE" title="انتخاب‌های اقتصادی چاکود" description="خودروهای اقتصادی و ارزشمند بر اساس قیمت، سال و کیفیت آگهی." listings={data.economic} badge="ارزش خرید" tone="economic" allHref="/ads/economic" />
        </>
      )}
      <DealerSection dealers={data.dealers} />
    </>
  );
}
