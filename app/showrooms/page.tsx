"use client";

import { useEffect, useMemo, useState } from "react";
import ShowroomCard, {
  type ShowroomCardData,
  type ShowroomListingPreview,
} from "../components/ShowroomCard";

const API_URL = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";

type Listing = {
  id: number;
  title: string;
  city: string;
  province: string;
  dealer_name: string | null;
  dealer_id?: number | string | null;
  dealer_logo_url?: string | null;
  dealer_logo?: string | null;
  logo_url?: string | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  dealer_is_verified?: boolean | number | null;
  cover_image: string | null;
  created_at: string;
};

type ListingsResponse = {
  success?: boolean;
  data?: Listing[];
};

type DealerPreview = ShowroomCardData & {
  latestAt: number;
};

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

function buildDealers(listings: Listing[]): DealerPreview[] {
  const map = new Map<string, DealerPreview>();
  const ordered = [...listings].sort(
    (a, b) =>
      (new Date(b.created_at).getTime() || 0) -
      (new Date(a.created_at).getTime() || 0),
  );

  for (const listing of ordered) {
    const name = listing.dealer_name?.trim();
    if (!name) continue;

    const key = listing.dealer_id
      ? `id:${listing.dealer_id}`
      : `name:${normalizeText(name)}`;
    const verified = Boolean(
      listing.dealer_verified ||
        listing.is_dealer_verified ||
        listing.dealer_is_verified,
    );
    const logoUrl =
      listing.dealer_logo_url || listing.dealer_logo || listing.logo_url || null;
    const latestAt = new Date(listing.created_at).getTime() || 0;
    const current = map.get(key);
    const preview: ShowroomListingPreview = {
      id: listing.id,
      title: listing.title || "آگهی خودرو",
      image: listing.cover_image || null,
    };

    if (current) {
      current.listingCount += 1;
      current.verified = current.verified || verified;
      current.latestAt = Math.max(current.latestAt, latestAt);
      if (!current.logoUrl && logoUrl) current.logoUrl = logoUrl;
      if (!current.coverImage && listing.cover_image) {
        current.coverImage = listing.cover_image;
      }
      if (
        listing.cover_image &&
        (current.latestListings?.length || 0) < 3
      ) {
        current.latestListings = [
          ...(current.latestListings || []),
          preview,
        ];
      }
      if ((!current.city || current.city === "شهر نامشخص") && listing.city) {
        current.city = listing.city;
      }
      if (!current.province && listing.province) {
        current.province = listing.province;
      }
      continue;
    }

    map.set(key, {
      key,
      name,
      city: listing.city || "شهر نامشخص",
      province: listing.province || "",
      listingCount: 1,
      logoUrl,
      coverImage: listing.cover_image || null,
      verified,
      latestAt,
      latestListings: listing.cover_image ? [preview] : [],
    });
  }

  return Array.from(map.values());
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export default function PublicShowroomsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [requestKey, setRequestKey] = useState(0);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("popular");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") || "");
    setCity(params.get("city") || "");
    setSort(params.get("sort") || "popular");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json: ListingsResponse = await response.json();
        if (!json.success || !Array.isArray(json.data)) {
          throw new Error("Invalid API response");
        }
        setListings(json.data);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("showrooms-listings-fetch", error);
        setListings([]);
        setStatus("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [requestKey]);

  const dealers = useMemo(() => buildDealers(listings), [listings]);
  const cities = useMemo(
    () =>
      Array.from(new Set(dealers.map((dealer) => dealer.city).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "fa"),
      ),
    [dealers],
  );

  const filtered = useMemo(() => {
    const result = dealers.filter((dealer) => {
      const text = normalizeText(
        `${dealer.name} ${dealer.city} ${dealer.province || ""}`,
      );
      if (query && !text.includes(normalizeText(query))) return false;
      if (city && dealer.city !== city) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "fa");
      if (sort === "newest") return b.latestAt - a.latestAt;
      return b.listingCount - a.listingCount || b.latestAt - a.latestAt;
    });

    return result;
  }, [dealers, query, city, sort]);

  const totalActiveCars = useMemo(
    () => dealers.reduce((sum, dealer) => sum + dealer.listingCount, 0),
    [dealers],
  );

  const hasFilters = Boolean(query || city || sort !== "popular");

  return (
    <main className="showroomsPage" dir="rtl">
      <header className="showroomsHeader">
        <div className="showroomsHeaderInner">
          <a className="showroomsBrand" href="/" aria-label="صفحه اصلی چاکود">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </a>

          <nav aria-label="ناوبری نمایشگاه‌ها">
            <a href="/">خانه</a>
            <a href="/ads">همه خودروها</a>
          </nav>
        </div>
      </header>

      <section className="showroomsHero">
        <span className="heroOrb heroOrbOne" aria-hidden="true" />
        <span className="heroOrb heroOrbTwo" aria-hidden="true" />

        <div className="heroCopy">
          <span className="heroKicker">
            <i aria-hidden="true" />
            ویترین رسمی چاکود
          </span>
          <h1>نمایشگاه‌های معتبر، یک‌جا و قابل مقایسه</h1>
          <p>
            نمایشگاه مناسب را پیدا کن، موجودی فعالش را ببین و با یک لینک، ویترین
            خودروها را برای دیگران بفرست.
          </p>
          <div className="heroTrust">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 12 2 2 4-5" />
                <path d="M12 3 4.5 6v5.2c0 4.7 3.2 8 7.5 9.8 4.3-1.8 7.5-5.1 7.5-9.8V6L12 3Z" />
              </svg>
              اطلاعات ساختاریافته
            </span>
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 15.5 6.2 9a3 3 0 0 1 2.8-2h6a3 3 0 0 1 2.8 2l2.2 6.5" />
                <path d="M3 15.5h18V19H3z" />
              </svg>
              موجودی واقعی خودرو
            </span>
          </div>
        </div>

        <div className="heroStats" aria-label="آمار نمایشگاه‌ها">
          <div className="heroStatIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20V8l8-4 8 4v12" />
              <path d="M8 20v-7h8v7M4 10h16" />
            </svg>
          </div>
          <div>
            <strong>
              {status === "ready" ? formatNumber(dealers.length) : "—"}
            </strong>
            <span>نمایشگاه فعال</span>
          </div>
          <div className="heroStatDivider" />
          <div>
            <strong>
              {status === "ready" ? formatNumber(totalActiveCars) : "—"}
            </strong>
            <span>خودرو در ویترین‌ها</span>
          </div>
        </div>
      </section>

      <section className="showroomsContent">
        <form className="showroomsFilters" method="get" action="/showrooms">
          <label className="searchField">
            <span>جست‌وجوی نمایشگاه</span>
            <div className="fieldControl">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="نام نمایشگاه، شهر یا استان..."
              />
            </div>
          </label>

          <label>
            <span>شهر</span>
            <div className="fieldControl">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
                <circle cx="12" cy="9" r="2.4" />
              </svg>
              <select
                name="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              >
                <option value="">همه شهرها</option>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label>
            <span>مرتب‌سازی</span>
            <div className="fieldControl">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 6h12M8 12h9M8 18h6" />
                <path d="m4 4-2 2 2 2M2 6h4" />
              </svg>
              <select
                name="sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="popular">بیشترین خودرو</option>
                <option value="newest">تازه‌ترین فعالیت</option>
                <option value="name">نام نمایشگاه</option>
              </select>
            </div>
          </label>

          <div className="filterActions">
            <button type="submit">
              اعمال فیلتر
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5h16M7 12h10M10 19h4" />
              </svg>
            </button>
            <a
              className={`clearFilters ${hasFilters ? "isVisible" : ""}`}
              href="/showrooms"
              aria-label="پاک‌کردن فیلترها"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </a>
          </div>
        </form>

        <div className="resultsHeader">
          <div>
            <span>SHOWROOM DIRECTORY</span>
            <h2>نمایشگاه‌های فعال چاکود</h2>
          </div>
          <p>
            {status === "ready"
              ? `${formatNumber(filtered.length)} نتیجه برای نمایش`
              : "در حال آماده‌سازی ویترین‌ها"}
          </p>
        </div>

        {status === "loading" ? (
          <div className="showroomsState" aria-live="polite">
            <span className="showroomsSpinner" aria-hidden="true" />
            <strong>در حال دریافت نمایشگاه‌ها</strong>
            <p>موجودی فعال نمایشگاه‌ها از چاکود دریافت می‌شود.</p>
          </div>
        ) : status === "error" ? (
          <div className="showroomsState" role="alert">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
            <strong>دریافت نمایشگاه‌ها انجام نشد</strong>
            <p>اتصال اینترنت یا سرویس آگهی‌ها را بررسی کن.</p>
            <button type="button" onClick={() => setRequestKey((value) => value + 1)}>
              تلاش دوباره
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="showroomsState">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
            <strong>نمایشگاهی پیدا نشد</strong>
            <p>عبارت جست‌وجو یا شهر را تغییر بده.</p>
            <a href="/showrooms">نمایش همه نمایشگاه‌ها</a>
          </div>
        ) : (
          <div className="showroomsGrid">
            {filtered.map((dealer) => (
              <ShowroomCard key={dealer.key} showroom={dealer} />
            ))}
          </div>
        )}
      </section>

      <style>{`
        .showroomsPage{--purple:#6d28d9;--purpleDark:#4c1d95;--ink:#1b1024;--muted:#746a7d;--border:#e8dff0;min-height:100vh;overflow-x:clip;color:var(--ink);font-family:Tahoma,Arial,sans-serif;background:radial-gradient(circle at 15% 5%,rgba(124,58,237,.07),transparent 24rem),linear-gradient(180deg,#fcfbfe 0%,#f9f7fc 100%)}
        .showroomsPage *{box-sizing:border-box}
        .showroomsPage a{color:inherit;text-decoration:none}
        .showroomsPage button,.showroomsPage input,.showroomsPage select{font-family:inherit}
        .showroomsHeader{position:sticky;top:0;z-index:50;border-bottom:1px solid rgba(232,223,240,.82);background:rgba(255,255,255,.88);backdrop-filter:blur(18px)}
        .showroomsHeaderInner{width:min(1200px,calc(100% - 32px));min-height:72px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:18px}
        .showroomsBrand img{display:block;width:auto;height:38px}
        .showroomsHeader nav{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:900}
        .showroomsHeader nav>a{min-height:40px;padding:0 13px;border-radius:12px;display:inline-flex;align-items:center;gap:7px;transition:background .18s ease,color .18s ease}
        .showroomsHeader nav>a:not(.manageLink):hover{color:var(--purple);background:#f6f0ff}
        .showroomsHeader nav svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .manageLink{color:#fff!important;background:linear-gradient(135deg,#6d28d9,#4f46e5);box-shadow:0 11px 25px rgba(91,33,182,.18)}
        .showroomsHero{position:relative;width:min(1200px,calc(100% - 32px));min-height:260px;margin:26px auto 18px;padding:36px 40px;overflow:hidden;border:1px solid rgba(109,40,217,.14);border-radius:32px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.55fr);align-items:center;gap:34px;background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(247,241,255,.96) 58%,rgba(238,245,255,.94));box-shadow:0 24px 70px rgba(53,29,75,.08)}
        .showroomsHero::before{position:absolute;inset:0;content:"";background-image:linear-gradient(rgba(109,40,217,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,.035) 1px,transparent 1px);background-size:28px 28px;mask-image:linear-gradient(90deg,#000,transparent 76%);pointer-events:none}
        .heroOrb{position:absolute;border-radius:50%;filter:blur(2px);pointer-events:none}
        .heroOrbOne{width:220px;height:220px;left:-70px;top:-88px;background:radial-gradient(circle,rgba(124,58,237,.20),rgba(124,58,237,0))}
        .heroOrbTwo{width:190px;height:190px;right:44%;bottom:-110px;background:radial-gradient(circle,rgba(14,165,233,.14),rgba(14,165,233,0))}
        .heroCopy,.heroStats{position:relative;z-index:1}
        .heroKicker{display:inline-flex;align-items:center;gap:8px;color:#6d28d9;font-size:10px;font-weight:900;letter-spacing:.02em}
        .heroKicker i{width:8px;height:8px;border-radius:50%;background:#7c3aed;box-shadow:0 0 0 5px rgba(124,58,237,.10)}
        .heroCopy h1{max-width:720px;margin:13px 0 10px;font-size:clamp(27px,3vw,42px);line-height:1.45;letter-spacing:-.02em}
        .heroCopy>p{max-width:680px;margin:0;color:#6f6478;font-size:12px;line-height:2.05}
        .heroTrust{margin-top:21px;display:flex;flex-wrap:wrap;gap:9px}
        .heroTrust span{min-height:36px;padding:0 12px;border:1px solid rgba(109,40,217,.12);border-radius:999px;display:inline-flex;align-items:center;gap:7px;color:#5c5067;background:rgba(255,255,255,.76);font-size:9px;font-weight:800}
        .heroTrust svg{width:16px;height:16px;fill:none;stroke:#6d28d9;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .heroStats{min-height:148px;padding:22px;border:1px solid rgba(255,255,255,.74);border-radius:24px;display:grid;grid-template-columns:58px 1fr;grid-template-areas:"icon first" "icon divider" "icon second";align-items:center;gap:4px 14px;background:rgba(255,255,255,.70);backdrop-filter:blur(14px);box-shadow:0 18px 48px rgba(61,35,85,.10)}
        .heroStatIcon{grid-area:icon;width:58px;height:58px;border-radius:19px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#6d28d9,#4f46e5 62%,#2563eb);box-shadow:0 14px 30px rgba(91,33,182,.22)}
        .heroStatIcon svg{width:29px;height:29px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
        .heroStats>div:nth-of-type(2){grid-area:first}.heroStats>div:nth-of-type(4){grid-area:second}
        .heroStats strong,.heroStats span{display:block}.heroStats strong{font-size:22px;line-height:1.2}.heroStats span{margin-top:4px;color:#786c80;font-size:9px;font-weight:800}
        .heroStatDivider{grid-area:divider;height:1px;background:#eadff1}
        .showroomsContent{width:min(1200px,calc(100% - 32px));margin:0 auto 70px}
        .showroomsFilters{position:relative;margin-bottom:27px;padding:16px;border:1px solid rgba(224,211,236,.9);border-radius:23px;display:grid;grid-template-columns:minmax(280px,1.6fr) minmax(170px,.7fr) minmax(190px,.8fr) auto;gap:11px;align-items:end;background:rgba(255,255,255,.92);box-shadow:0 18px 54px rgba(49,27,70,.07)}
        .showroomsFilters label{min-width:0;display:grid;gap:7px}.showroomsFilters label>span{padding-right:3px;color:#766b7f;font-size:8px;font-weight:900}
        .fieldControl{position:relative;min-width:0}.fieldControl>svg{position:absolute;right:13px;top:50%;z-index:1;width:18px;height:18px;transform:translateY(-50%);fill:none;stroke:#8b5cf6;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
        .showroomsFilters input,.showroomsFilters select{width:100%;min-height:49px;padding:0 42px 0 13px;border:1px solid #e6ddec;border-radius:14px;color:#21172a;background:#fff;outline:none;font-size:10px;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
        .showroomsFilters input::placeholder{color:#a69cab}.showroomsFilters input:focus,.showroomsFilters select:focus{border-color:#a986e8;background:#fefcff;box-shadow:0 0 0 4px rgba(109,40,217,.08)}
        .filterActions{display:grid;grid-template-columns:auto 49px;gap:8px}.filterActions button,.clearFilters{min-height:49px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
        .filterActions button{padding:0 17px;gap:8px;color:#fff;border:0;background:linear-gradient(135deg,#6d28d9,#4f46e5);box-shadow:0 12px 28px rgba(91,33,182,.20);font-size:9px;font-weight:900}
        .filterActions button svg,.clearFilters svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
        .clearFilters{width:49px;color:#8a7b94;border:1px solid #e5dbea;background:#fff;opacity:.55;pointer-events:none}.clearFilters.isVisible{opacity:1;pointer-events:auto}.clearFilters.isVisible:hover{color:#6d28d9;border-color:#cfb9e8;background:#f8f3ff}
        .resultsHeader{margin:0 2px 17px;display:flex;align-items:end;justify-content:space-between;gap:18px}.resultsHeader span{color:#6d28d9;font-size:8px;font-weight:900;letter-spacing:.08em}.resultsHeader h2{margin:6px 0 0;font-size:22px}.resultsHeader p{margin:0;padding:8px 11px;border-radius:999px;color:#655970;background:#f2eaff;font-size:9px;font-weight:900}
        .showroomsGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,360px));justify-content:center;gap:22px;align-items:start}
        .showroomsState{min-height:330px;padding:28px;display:grid;place-items:center;align-content:center;gap:9px;text-align:center;border:1px dashed #d8c8e6;border-radius:28px;background:rgba(255,255,255,.88);box-shadow:0 18px 54px rgba(49,27,70,.05)}
        .showroomsState img{width:62px;height:62px;object-fit:contain}.showroomsState strong{font-size:16px}.showroomsState p{margin:0;color:#776a80;font-size:10px;line-height:1.9}
        .showroomsState button,.showroomsState>a{min-height:42px;margin-top:4px;padding:0 15px;border:0;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,#6d28d9,#4f46e5);font-size:9px;font-weight:900;cursor:pointer}
        .showroomsSpinner{width:39px;height:39px;border:3px solid #eadff5;border-top-color:#6d28d9;border-radius:50%;animation:showroomsSpin .75s linear infinite}@keyframes showroomsSpin{to{transform:rotate(360deg)}}
        @media(max-width:980px){.showroomsHero{grid-template-columns:1fr;min-height:auto;padding:30px}.heroStats{grid-template-columns:58px 1fr 1px 1fr;grid-template-areas:"icon first divider second";min-height:100px}.heroStatDivider{width:1px;height:46px}.showroomsFilters{grid-template-columns:1fr 1fr}.searchField{grid-column:1/-1}.filterActions{grid-column:1/-1;grid-template-columns:1fr 49px}.showroomsGrid{grid-template-columns:repeat(2,minmax(280px,360px))}}
        @media(max-width:700px){.showroomsHeaderInner{width:calc(100% - 22px);min-height:62px}.showroomsBrand img{height:32px}.showroomsHeader nav>a:not(.manageLink){display:none}.showroomsHeader nav>a{min-height:38px;padding:0 11px}.manageLink{font-size:9px}.showroomsHero,.showroomsContent{width:calc(100% - 20px)}.showroomsHero{margin-top:12px;padding:23px 19px;border-radius:25px}.heroCopy h1{margin-top:11px;font-size:25px}.heroCopy>p{font-size:10px}.heroTrust{margin-top:16px;gap:7px}.heroTrust span{min-height:33px;padding:0 10px;font-size:8px}.heroStats{padding:15px;grid-template-columns:49px 1fr 1px 1fr;gap:4px 10px;border-radius:19px}.heroStatIcon{width:49px;height:49px;border-radius:16px}.heroStatIcon svg{width:25px;height:25px}.heroStats strong{font-size:17px}.heroStats span{font-size:8px}.showroomsFilters{padding:12px;grid-template-columns:1fr;border-radius:20px}.searchField,.filterActions{grid-column:auto}.showroomsFilters input,.showroomsFilters select{min-height:47px}.resultsHeader{align-items:flex-start;flex-direction:column;gap:9px}.resultsHeader h2{font-size:19px}.showroomsGrid{grid-template-columns:minmax(0,1fr);gap:14px}.showroomsState{min-height:280px;border-radius:23px}}
        @media(max-width:420px){.manageLink svg{display:none}.showroomsHero{padding:21px 16px}.heroStats{grid-template-columns:44px 1fr;grid-template-areas:"icon first" "icon divider" "icon second"}.heroStatIcon{width:44px;height:44px}.heroStatDivider{width:100%;height:1px}.heroTrust span{width:100%;justify-content:center}.filterActions button{font-size:9px}}
        @media(prefers-reduced-motion:reduce){.showroomsPage *{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
      `}</style>
    </main>
  );
}
