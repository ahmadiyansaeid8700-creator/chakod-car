import Link from "next/link";
import "./home.css";
import AuthStatus from "./components/AuthStatus";
import CreateActionMenu from "./components/CreateActionMenu";
import HomeStories from "./components/HomeStoriesUnified";
import HomeFeaturedShowrooms from "./components/HomeFeaturedShowrooms";
import HomeLocationSelector from "./components/HomeLocationSelector";
import HomeMarketSearch from "./components/HomeMarketSearch";
import HomePublicListingsClient from "./components/HomePublicListingsClient";
import HomeFeaturedBusinesses from "./components/HomeFeaturedBusinesses";
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
            <Link href="/dealerships">نمایشگاه‌ها</Link>
            <Link href="/businesses">کسب‌وکارها</Link>
            <Link href="/articles">مقاله</Link>
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

            <Link
              className="masterSavedLink masterMarketFloorDesktop"
              href="/market-floor"
              aria-label="کف بازار"
            >
              <span aria-hidden="true" style={{ display: "inline-flex" }}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
                  <path d="M4.5 5.5h7.1l7.9 7.9-6.1 6.1-7.9-7.9V5.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="8.4" cy="9.2" r="1.15" fill="currentColor" />
                  <path d="M13 10.5v5m0 0-2-2m2 2 2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <b>کف بازار</b>
            </Link>

            <AuthStatus />

            <CreateActionMenu
              triggerClassName="masterSubmitButton"
              iconClassName="masterSubmitIcon"
              titleClassName="masterSubmitTitle"
              icon={<span aria-hidden="true">＋</span>}
              placement="down"
            />
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

      <HomeFeaturedShowrooms query={query} />

      <HomePublicListingsClient query={query} />

      <HomeFeaturedBusinesses />

      <HomeGuides />

      <footer className="masterFooter">
        <div className="masterFooterMain">
          <Link
            className="masterBrand masterFooterBrand"
            href="/"
            aria-label="صفحه اصلی چاکود"
          >
            <img className="masterFooterSymbol" src="/brand/chakod-symbol.png" alt="" />
            <span className="masterFooterWordmark">
              <b>چاکود</b>
              <small>پلتفرم رشد کسب‌وکار</small>
            </span>
          </Link>

          <p>
            ویترین خودروهای لوکس و منطقه آزاد، نمایشگاه‌های منتخب و خدمات
            خودرویی.
          </p>

          <div>
            <Link href="/cars/luxury">خودروهای لوکس</Link>
            <Link href="/cars/free-zone">منطقه آزاد</Link>
            <Link href="/dealerships">نمایشگاه‌ها</Link>
            <Link href="/businesses">خدمات خودرو</Link>
            <Link href="/rules">قوانین</Link>
          </div>
        </div>

        <div className="masterFooterBottom">
          <span>
            © چاکود؛ محصول شرکت یکتا الکترونیک گلشن نوین — تأسیس ۱۳۹۴
          </span>
          <span>کلیه حقوق مادی و معنوی این وب‌سایت محفوظ است.</span>
        </div>
      </footer>

      <style>{`
        .masterMarketFloorDesktop {
          color: #6d28d9;
          border-color: #ddd0f4;
          background: linear-gradient(145deg, #ffffff, #f6f1ff);
        }
        .masterMarketFloorDesktop:hover {
          border-color: #a78bfa;
          background: #f7f2ff;
        }
        @media (max-width: 760px) {
          .masterMarketFloorDesktop { display: none !important; }
        }
      `}</style>

      <MobileBottomNav />
    </main>
  );
}
