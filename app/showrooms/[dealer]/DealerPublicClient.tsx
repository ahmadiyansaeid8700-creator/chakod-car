"use client";

import { useEffect, useMemo, useState } from "react";
import DealerQrCard from "../../components/DealerQrCard";
import DealerShareActions from "../../components/DealerShareActions";
import ListingCard, { type ListingCardData } from "../../components/ListingCard";

const API_URL = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";
const API_BASE = "https://api.chakod.com";
const SITE_BASE = "https://chakod.com";

type Listing = ListingCardData & {
  id: number;
  title: string;
  city: string;
  province: string;
  dealer_name: string | null;
  cover_image: string | null;
  created_at: string;
  views_count?: number | null;
};

type ListingsResponse = {
  success?: boolean;
  data?: Listing[];
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

function decodeDealer(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/") || path.startsWith("uploads/")) {
    return `${SITE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function DealerPublicClient({ rawDealer }: { rawDealer: string }) {
  const requestedDealer = decodeDealer(rawDealer);
  const normalizedDealer = normalizeText(requestedDealer);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [requestKey, setRequestKey] = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json: ListingsResponse = await response.json();
        if (!json.success || !Array.isArray(json.data)) {
          throw new Error("Invalid API response");
        }
        setAllListings(json.data);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("dealer-public-fetch", error);
        setAllListings([]);
        setStatus("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [requestKey]);

  const listings = useMemo(
    () =>
      allListings.filter(
        (listing) =>
          listing.dealer_name &&
          normalizeText(listing.dealer_name) === normalizedDealer,
      ),
    [allListings, normalizedDealer],
  );

  const dealerName = listings[0]?.dealer_name?.trim() || requestedDealer;
  const firstListing = listings[0];
  const city = firstListing?.city || "شهر نامشخص";
  const province = firstListing?.province || "";
  const cover = listings.find((listing) => listing.cover_image)?.cover_image || null;
  const coverUrl = getImageUrl(cover);
  const totalViews = listings.reduce(
    (sum, listing) => sum + Number(listing.views_count || 0),
    0,
  );
  const dealerHref = `/showrooms/${encodeURIComponent(dealerName)}`;

  useEffect(() => {
    setCoverFailed(false);
  }, [coverUrl]);

  return (
    <main className="dealerPage" dir="rtl">
      <header className="dealerHeader">
        <a className="dealerBrand" href="/" aria-label="صفحه اصلی چاکود">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </a>

        <nav>
          <a href="/showrooms">همه نمایشگاه‌ها</a>
          <a className="dealerBack" href="/">خانه</a>
        </nav>
      </header>

      {status === "loading" ? (
        <section className="dealerState" aria-live="polite">
          <span className="dealerSpinner" aria-hidden="true" />
          <strong>در حال دریافت ویترین نمایشگاه</strong>
          <p>خودروهای فعال این نمایشگاه دریافت می‌شوند.</p>
        </section>
      ) : status === "error" ? (
        <section className="dealerState" role="alert">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
          <strong>ویترین نمایشگاه دریافت نشد</strong>
          <p>اتصال اینترنت یا سرویس آگهی‌ها را بررسی کن.</p>
          <button type="button" onClick={() => setRequestKey((value) => value + 1)}>
            تلاش دوباره
          </button>
        </section>
      ) : listings.length === 0 ? (
        <section className="dealerState">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
          <strong>نمایشگاه پیدا نشد</strong>
          <p>این نمایشگاه آگهی فعال ندارد یا نشانی آن تغییر کرده است.</p>
          <a href="/showrooms">مشاهده همه نمایشگاه‌ها</a>
        </section>
      ) : (
        <>
          <section className="dealerProfile">
            <div className="dealerCover">
              {coverUrl && !coverFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={`کاور ${dealerName}`}
                  onError={() => setCoverFailed(true)}
                />
              ) : (
                <div className="dealerCoverFallback">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="dealerIdentityRow">
              <div className="dealerAvatar" aria-hidden="true">{dealerName.slice(0, 1)}</div>

              <div className="dealerIdentityText">
                <span>ویترین عمومی نمایشگاه در چاکود</span>
                <h1>{dealerName}</h1>
                <p>{[city, province].filter(Boolean).join("، ")}</p>
              </div>

              <div className="dealerIdentityActions">
                <div className="dealerMemberBadge">
                  <b>✓</b>
                  <span>فعال در چاکود</span>
                </div>
                <DealerShareActions dealerName={dealerName} city={city} href={dealerHref} />
              </div>
            </div>
          </section>

          <section className="dealerStats">
            <article>
              <span>خودروهای فعال</span>
              <strong>{new Intl.NumberFormat("fa-IR").format(listings.length)}</strong>
            </article>
            <article>
              <span>بازدید آگهی‌ها</span>
              <strong>{new Intl.NumberFormat("fa-IR").format(totalViews)}</strong>
            </article>
            <article>
              <span>شهر فعالیت</span>
              <strong>{city}</strong>
            </article>
          </section>

          <section className="dealerInventory">
            <div className="dealerSectionHead">
              <div>
                <span>خودروهای نمایشگاه</span>
                <h2>آگهی‌های فعال {dealerName}</h2>
              </div>
              <a href={`/ads?q=${encodeURIComponent(dealerName)}`}>جست‌وجوی کامل</a>
            </div>

            <div className="dealerGrid">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} variant="grid" />
              ))}
            </div>
          </section>

          <section className="dealerQrSection">
            <DealerQrCard dealerName={dealerName} />
          </section>

          <footer className="dealerFooter">
            <a href="/showrooms">بازگشت به نمایشگاه‌ها</a>
            <span>ویترین عمومی نمایشگاه در چاکود</span>
          </footer>
        </>
      )}

      <style>{`
        .dealerPage{--purple:#6d28d9;--ink:#1b1222;--muted:#756a7d;--border:#e7ddf0;min-height:100vh;overflow-x:clip;color:var(--ink);font-family:Tahoma,Arial,sans-serif;background:#fbf9fd}
        .dealerPage *{box-sizing:border-box}
        .dealerPage a{color:inherit;text-decoration:none}
        .dealerHeader{position:sticky;top:0;z-index:60;min-height:66px;padding:10px max(18px,calc((100vw - 1160px)/2));display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #ece5f2;background:rgba(255,255,255,.96);backdrop-filter:blur(14px)}
        .dealerBrand img{display:block;width:auto;height:36px}
        .dealerHeader nav{display:flex;align-items:center;gap:7px;font-size:9px;font-weight:900}
        .dealerHeader nav a{min-height:38px;padding:0 11px;display:inline-flex;align-items:center;border-radius:11px;background:#f5effa}
        .dealerBack{color:#fff!important;background:var(--purple)!important}
        .dealerState{width:min(1160px,calc(100% - 28px));min-height:360px;margin:22px auto;display:grid;place-items:center;align-content:center;gap:9px;text-align:center;border:1px dashed #d9c9e8;border-radius:24px;background:#fff}
        .dealerState img{width:62px;height:62px;object-fit:contain}
        .dealerState strong{font-size:16px}
        .dealerState p{margin:0;color:var(--muted);font-size:10px}
        .dealerState button,.dealerState>a{min-height:39px;margin-top:4px;padding:0 13px;display:inline-flex;align-items:center;justify-content:center;color:#fff;border:0;border-radius:10px;background:var(--purple);font-family:inherit;font-size:9px;font-weight:900;cursor:pointer}
        .dealerSpinner{width:36px;height:36px;border:3px solid #eadff5;border-top-color:var(--purple);border-radius:50%;animation:dealerSpin .75s linear infinite}
        @keyframes dealerSpin{to{transform:rotate(360deg)}}
        .dealerProfile{width:min(1160px,calc(100% - 28px));margin:20px auto 12px;overflow:hidden;border:1px solid var(--border);border-radius:24px;background:#fff;box-shadow:0 16px 46px rgba(52,27,73,.07)}
        .dealerCover{height:220px;overflow:hidden;background:linear-gradient(135deg,#24112f,#6d28d9)}
        .dealerCover>img{width:100%;height:100%;display:block;object-fit:cover}
        .dealerCoverFallback{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#25122f,#6d28d9)}
        .dealerCoverFallback img{width:90px;height:90px;object-fit:contain;filter:drop-shadow(0 14px 24px rgba(0,0,0,.2))}
        .dealerIdentityRow{padding:16px 20px 18px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px}
        .dealerAvatar{width:74px;height:74px;display:grid;place-items:center;color:#fff;border:5px solid #fff;border-radius:22px;background:linear-gradient(135deg,#4c1d95,#8b5cf6);box-shadow:0 12px 28px rgba(70,33,99,.18);font-size:25px;font-weight:900}
        .dealerIdentityText>span{color:var(--purple);font-size:8px;font-weight:900}
        .dealerIdentityText h1{margin:5px 0 3px;font-size:25px}
        .dealerIdentityText p{margin:0;color:var(--muted);font-size:10px}
        .dealerIdentityActions{display:flex;align-items:center;gap:8px}
        .dealerMemberBadge{min-height:39px;padding:0 11px;display:flex;align-items:center;gap:6px;color:#5b21b6;border-radius:11px;background:#f2e9ff;font-size:9px;font-weight:900}
        .dealerMemberBadge b{width:20px;height:20px;display:grid;place-items:center;color:#fff;border-radius:50%;background:var(--purple)}
        .dealerShareActions{position:relative}
        .dealerShareTrigger{min-height:39px;padding:0 11px;display:inline-flex;align-items:center;justify-content:center;gap:6px;color:#fff;border:0;border-radius:11px;background:var(--purple);font-family:inherit;font-size:9px;font-weight:900;cursor:pointer}
        .dealerShareTrigger svg{width:15px;height:15px;fill:currentColor}
        .dealerShareMenu{position:absolute;left:0;top:calc(100% + 6px);z-index:30;width:120px;padding:6px;display:grid;gap:4px;border:1px solid var(--border);border-radius:12px;background:#fff;box-shadow:0 14px 34px rgba(42,21,58,.16)}
        .dealerShareMenu a,.dealerShareMenu button{min-height:32px;padding:0 8px;display:flex;align-items:center;border:0;border-radius:8px;color:#44354e;background:#f8f4fb;font-family:inherit;font-size:8px;cursor:pointer}
        .dealerStats{width:min(1160px,calc(100% - 28px));margin:0 auto 12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .dealerStats article{padding:14px 16px;border:1px solid var(--border);border-radius:18px;background:#fff}
        .dealerStats span{display:block;color:var(--muted);font-size:8px}
        .dealerStats strong{display:block;margin-top:5px;font-size:17px}
        .dealerInventory{width:min(1160px,calc(100% - 28px));margin:0 auto 16px;padding:18px;border:1px solid var(--border);border-radius:22px;background:#fff}
        .dealerSectionHead{margin-bottom:13px;display:flex;align-items:end;justify-content:space-between;gap:14px}
        .dealerSectionHead span{color:var(--purple);font-size:8px;font-weight:900}
        .dealerSectionHead h2{margin:4px 0 0;font-size:20px}
        .dealerSectionHead>a{padding:9px 11px;color:var(--purple);border-radius:10px;background:#f3eaff;font-size:8px;font-weight:900}
        .dealerGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}
        .dealerQrSection{width:min(1160px,calc(100% - 28px));margin:0 auto 18px}
        .dealerQrCard{padding:18px;display:grid;grid-template-columns:180px minmax(0,1fr);align-items:center;gap:20px;border:1px solid var(--border);border-radius:22px;background:#fff}
        .dealerQrVisual{display:grid;place-items:center}
        .dealerQrImageWrap{position:relative;width:170px;height:170px;padding:8px;border:1px solid var(--border);border-radius:17px;background:#fff}
        .dealerQrImageWrap>img:first-child{width:100%;height:100%;display:block}
        .dealerQrLogo{position:absolute;inset:50% auto auto 50%;width:34px;height:34px;padding:4px;object-fit:contain;border-radius:8px;background:#fff;transform:translate(-50%,-50%)}
        .dealerQrLoading{width:170px;height:170px;display:grid;place-items:center;color:var(--muted);border:1px dashed #d9cae7;border-radius:17px;font-size:9px}
        .dealerQrText>span{color:var(--purple);font-size:8px;font-weight:900}
        .dealerQrText>strong{display:block;margin:6px 0;font-size:18px}
        .dealerQrText p{margin:0;color:var(--muted);font-size:10px;line-height:1.9}
        .dealerQrText>a{margin-top:11px;padding:9px 11px;display:inline-flex;color:#fff;border-radius:10px;background:var(--purple);font-size:8px;font-weight:900}
        .dealerQrText small{display:block;margin-top:8px;color:#8b7d93;font-size:7px;direction:ltr;text-align:right;word-break:break-all}
        .dealerFooter{width:min(1160px,calc(100% - 28px));margin:0 auto 32px;padding:12px 2px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:#74677c;font-size:8px}
        .dealerFooter a{color:var(--purple);font-weight:900}
        @media(max-width:900px){
          .dealerHeader{min-height:58px;padding:9px 12px}
          .dealerBrand img{height:31px}
          .dealerHeader nav a:first-child{display:none}
          .dealerCover{height:165px}
          .dealerIdentityRow{grid-template-columns:auto minmax(0,1fr);padding:13px;gap:10px}
          .dealerAvatar{width:58px;height:58px;border-radius:17px;font-size:20px}
          .dealerIdentityText h1{font-size:20px}
          .dealerIdentityActions{grid-column:1/-1;justify-content:space-between}
          .dealerStats{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
          .dealerStats article{padding:11px 9px}
          .dealerStats strong{font-size:13px}
          .dealerInventory{padding:12px}
          .dealerGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .dealerQrCard{grid-template-columns:135px minmax(0,1fr);gap:13px}
          .dealerQrImageWrap,.dealerQrLoading{width:128px;height:128px}
        }
        @media(max-width:620px){
          .dealerProfile,.dealerStats,.dealerInventory,.dealerQrSection,.dealerFooter,.dealerState{width:min(100% - 20px,1160px)}
          .dealerStats{grid-template-columns:1fr 1fr}
          .dealerStats article:last-child{grid-column:1/-1}
          .dealerSectionHead{align-items:flex-start;flex-direction:column}
          .dealerGrid{grid-template-columns:1fr}
          .dealerQrCard{grid-template-columns:1fr;text-align:center}
          .dealerQrText small{text-align:center}
          .dealerFooter{align-items:flex-start;flex-direction:column}
        }
      `}</style>
    </main>
  );
}
