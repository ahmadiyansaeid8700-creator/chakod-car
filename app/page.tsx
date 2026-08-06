import Link from "next/link";
import "./home.css";
import AuthStatus from "./components/AuthStatus";
import HomeStories from "./components/HomeStories";
import HomeFeaturedShowrooms from "./components/HomeFeaturedShowrooms";
import HomeLocationSelector from "./components/HomeLocationSelector";
import HomeMarketSearch from "./components/HomeMarketSearch";
import HomeBannerSlot from "./components/HomeBannerSlot";
import HomePublicListingsClient from "./components/HomePublicListingsClient";
import HomeBusinessLinks from "./components/HomeBusinessLinks";
import HomeGuides from "./components/HomeGuides";
import MobileBottomNav from "./components/MobileBottomNav";

type SearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const rawQuery = resolvedSearchParams.q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] || "" : rawQuery || "";

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
            <Link href="/cars">خودروها</Link>
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

            <Link className="masterSubmitButton" href="/account/listings/new">
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

      <HomeBannerSlot />

      <div className="masterStoriesWrap">
        <HomeStories />
      </div>

      <HomeFeaturedShowrooms location="همه شهرها" query={query} />

      <HomePublicListingsClient query={query} />

      <HomeBusinessLinks />
      <HomeGuides />

      <footer className="masterFooter">
        <div className="masterFooterMain">
          <Link
            className="masterBrand masterFooterBrand"
            href="/"
            aria-label="صفحه اصلی چاکود"
          >
            <img
              className="masterFooterLogo"
              src="/brand/chakod-logo-full-light.png"
              alt="چاکود؛ پلتفرم رشد کسب‌وکار"
            />
          </Link>

          <p>
            ویترین خودروهای لوکس و منطقه آزاد، نمایشگاه‌های منتخب و خدمات
            خودرویی.
          </p>

          <div>
            <Link href="/cars/luxury">خودروهای لوکس</Link>
            <Link href="/cars/free-zone">منطقه آزاد</Link>
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
