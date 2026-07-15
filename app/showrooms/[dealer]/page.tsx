import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DealerQrCard from "../../components/DealerQrCard";
import DealerShareActions from "../../components/DealerShareActions";
import SaveListingButton from "../../components/SaveListingButton";

const API_BASE = "https://api.chakod.com";

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
  dealer_name: string | null;
  cover_image: string | null;
};

type ListingsResponse = {
  success: boolean;
  data: Listing[];
};

function normalizeText(value: string) {
  return value
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

function getImageUrl(path: string | null) {
  if (!path) return "/brand/chakod-symbol.png";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatPrice(price: number | null) {
  if (!price) return "قیمت توافقی";
  return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
}

function formatMileage(mileage: number | null) {
  if (mileage === null || mileage === undefined) return "کارکرد نامشخص";
  return `${new Intl.NumberFormat("fa-IR").format(mileage)} کیلومتر`;
}

async function getDealerData(rawDealer: string) {
  const dealerName = decodeDealer(rawDealer);
  const normalizedDealer = normalizeText(dealerName);
  const allListings = await getListings();
  const listings = allListings.filter(
    (listing) =>
      listing.dealer_name && normalizeText(listing.dealer_name) === normalizedDealer,
  );

  return {
    dealerName: listings[0]?.dealer_name?.trim() || dealerName,
    listings,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ dealer: string }>;
}): Promise<Metadata> {
  const { dealer } = await params;
  const { dealerName, listings } = await getDealerData(dealer);

  if (listings.length === 0) {
    return { title: "نمایشگاه پیدا نشد" };
  }

  const cover = listings.find((listing) => listing.cover_image)?.cover_image;

  return {
    title: `نمایشگاه ${dealerName}`,
    description: `ویترین رسمی ${dealerName} در چاکود و مشاهده خودروهای فعال این نمایشگاه.`,
    openGraph: {
      title: `${dealerName} | نمایشگاه چاکود`,
      description: `مشاهده خودروهای فعال ${dealerName} در چاکود.`,
      type: "website",
      images: cover
        ? [getImageUrl(cover)]
        : ["/brand/chakod-og.jpg"],
    },
  };
}

export default async function DealerPublicPage({
  params,
}: {
  params: Promise<{ dealer: string }>;
}) {
  const { dealer } = await params;
  const { dealerName, listings } = await getDealerData(dealer);

  if (listings.length === 0) notFound();

  const firstListing = listings[0];
  const city = firstListing.city || "شهر نامشخص";
  const province = firstListing.province || "";
  const cover = listings.find((listing) => listing.cover_image)?.cover_image || null;
  const totalViews = listings.reduce(
    (sum, listing) => sum + Number(listing.views_count || 0),
    0,
  );
  const dealerHref = `/showrooms/${encodeURIComponent(dealerName)}`;

  return (
    <main className="dealerPublicPage" dir="rtl">
      <header className="dealerPublicHeader">
        <a className="dealerPublicBrand" href="/" aria-label="صفحه اصلی چاکود">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </a>

        <nav>
          <a href="/">خانه</a>
          <a href="/showrooms">نمایشگاه‌ها</a>
          <a className="dealerPublicSubmit" href="/submit">ثبت آگهی</a>
        </nav>
      </header>

      <section className="dealerPublicHero">
        <div className="dealerPublicCover">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(cover)} alt={`کاور ${dealerName}`} />
          ) : (
            <div className="dealerPublicCoverFallback">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
            </div>
          )}
          <div className="dealerPublicCoverShade" />
        </div>

        <div className="dealerPublicIdentity">
          <div className="dealerPublicAvatar" aria-hidden="true">
            {dealerName.slice(0, 1)}
          </div>

          <div className="dealerPublicTitle">
            <span>ویترین رسمی در چاکود</span>
            <h1>{dealerName}</h1>
            <p>{[city, province].filter(Boolean).join("، ")}</p>
          </div>

          <div className="dealerPublicVerified">
            <b>✓</b>
            <span>
              <strong>عضو چاکود</strong>
              <small>هویت نمایشگاه در سامانه ثبت شده است</small>
            </span>
          </div>
        </div>
      </section>

      <section className="dealerPublicSummary">
        <article>
          <span>خودروهای فعال</span>
          <strong>{new Intl.NumberFormat("fa-IR").format(listings.length)}</strong>
        </article>
        <article>
          <span>بازدید ثبت‌شده</span>
          <strong>{new Intl.NumberFormat("fa-IR").format(totalViews)}</strong>
        </article>
        <article>
          <span>محدوده فعالیت</span>
          <strong>{city}</strong>
        </article>

        <div className="dealerPublicShare">
          <DealerShareActions dealerName={dealerName} city={city} href={dealerHref} />
        </div>
      </section>

      <section className="dealerPublicListings">
        <div className="dealerPublicSectionHead">
          <div>
            <span>ACTIVE INVENTORY</span>
            <h2>خودروهای فعال {dealerName}</h2>
            <p>فهرست عمودی برای بررسی راحت در موبایل و مقایسه سریع مشخصات.</p>
          </div>
          <a href={`/ads?q=${encodeURIComponent(dealerName)}`}>جست‌وجوی کامل</a>
        </div>

        <div className="dealerPublicGrid">
          {listings.map((listing) => (
            <article className="dealerPublicListingCard" key={listing.id}>
              <a className="dealerPublicListingImage" href={`/listing/${listing.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(listing.cover_image)}
                  alt={listing.title}
                  loading="lazy"
                />
                <span>{listing.production_year || "سال نامشخص"}</span>
              </a>

              <div className="dealerPublicListingBody">
                <div className="dealerPublicListingTitle">
                  <div>
                    <span>{listing.brand || "خودرو"}</span>
                    <h3>{listing.title}</h3>
                  </div>
                  <SaveListingButton listingId={listing.id} />
                </div>

                <div className="dealerPublicSpecs">
                  <span>{formatMileage(listing.mileage_km)}</span>
                  <span>{listing.transmission || "گیربکس نامشخص"}</span>
                  <span>{listing.body_status || "وضعیت بدنه نامشخص"}</span>
                </div>

                <div className="dealerPublicListingFoot">
                  <strong>{formatPrice(listing.price_toman)}</strong>
                  <a href={`/listing/${listing.id}`}>مشاهده آگهی</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dealerPublicTrust">
        <div>
          <span>معرفی حرفه‌ای نمایشگاه</span>
          <h2>یک صفحه آماده برای نمایش به مشتری</h2>
          <p>
            لینک این صفحه را در شبکه‌های اجتماعی، کارت ویزیت یا پیام‌رسان‌ها منتشر کن.
            مشتری خودروهای فعال را بدون شلوغی و در یک ویترین رسمی می‌بیند.
          </p>
        </div>

        <DealerQrCard dealerName={dealerName} />
      </section>

      <footer className="dealerPublicFooter">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/chakod-logo-full-light.png" alt="چاکود؛ پلتفرم رشد کسب‌وکار" />
        <p>صفحه عمومی نمایشگاه در چاکود؛ مناسب اشتراک‌گذاری با مشتری.</p>
        <div>
          <a href="/showrooms">همه نمایشگاه‌ها</a>
          <a href="/rules">قوانین</a>
        </div>
      </footer>

      <style>{`
        .dealerPublicPage {
          --purple:#6d28d9;
          --purple-dark:#4c1d95;
          --ink:#17111f;
          --muted:#75697e;
          --border:#e8def2;
          min-height:100vh;
          overflow-x:clip;
          color:var(--ink);
          font-family:Tahoma,Arial,sans-serif;
          background:radial-gradient(circle at 92% 0%,rgba(109,40,217,.12),transparent 28rem),linear-gradient(180deg,#fff,#faf7ff 50%,#fff);
        }
        .dealerPublicPage *{box-sizing:border-box}
        .dealerPublicPage a{color:inherit;text-decoration:none}
        .dealerPublicHeader{
          position:sticky;top:0;z-index:70;min-height:72px;padding:11px max(20px,calc((100vw - 1220px)/2));display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid rgba(232,222,242,.92);background:rgba(255,255,255,.93);backdrop-filter:blur(18px)
        }
        .dealerPublicBrand img{display:block;width:auto;height:39px}
        .dealerPublicHeader nav{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:900}
        .dealerPublicHeader nav a{min-height:40px;padding:0 12px;display:inline-flex;align-items:center;border-radius:12px}
        .dealerPublicSubmit{color:#fff!important;background:linear-gradient(135deg,#4c1d95,#7c3aed)}
        .dealerPublicHero{width:min(1220px,calc(100% - 32px));margin:24px auto 16px;overflow:hidden;border:1px solid var(--border);border-radius:30px;background:#fff;box-shadow:0 28px 75px rgba(40,20,59,.12)}
        .dealerPublicCover{position:relative;height:330px;overflow:hidden;background:linear-gradient(135deg,#261330,#6d28d9)}
        .dealerPublicCover>img{width:100%;height:100%;object-fit:cover}
        .dealerPublicCoverFallback{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(circle at 20% 30%,rgba(168,85,247,.7),transparent 30%),linear-gradient(135deg,#21122b,#55208e 70%,#6d28d9)}
        .dealerPublicCoverFallback img{width:130px;max-height:190px;object-fit:contain;filter:drop-shadow(0 20px 30px rgba(0,0,0,.2))}
        .dealerPublicCoverShade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(20,10,28,.64))}
        .dealerPublicIdentity{position:relative;margin-top:-68px;padding:0 28px 25px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:end;gap:16px}
        .dealerPublicAvatar{position:relative;z-index:2;width:112px;height:112px;display:grid;place-items:center;color:#fff;border:7px solid #fff;border-radius:31px;background:linear-gradient(145deg,#2c153a,#7c3aed);box-shadow:0 18px 40px rgba(60,25,87,.25);font-size:38px;font-weight:900}
        .dealerPublicTitle{position:relative;z-index:2;padding-bottom:7px}
        .dealerPublicTitle>span{display:inline-flex;padding:6px 9px;color:#fff;border-radius:999px;background:rgba(109,40,217,.92);font-size:8px;font-weight:900}
        .dealerPublicTitle h1{margin:8px 0 5px;font-size:31px}
        .dealerPublicTitle p{margin:0;color:var(--muted);font-size:10px}
        .dealerPublicVerified{margin-bottom:8px;padding:11px 13px;display:flex;align-items:center;gap:9px;border:1px solid #dfd2ed;border-radius:16px;background:#faf7ff}
        .dealerPublicVerified>b{width:32px;height:32px;display:grid;place-items:center;color:#fff;border-radius:50%;background:var(--purple);font-size:16px}
        .dealerPublicVerified span{display:grid;gap:3px}
        .dealerPublicVerified strong{font-size:9px}
        .dealerPublicVerified small{color:var(--muted);font-size:7px}
        .dealerPublicSummary{width:min(1220px,calc(100% - 32px));margin:0 auto 24px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:10px}
        .dealerPublicSummary article,.dealerPublicShare{min-height:88px;padding:15px;border:1px solid var(--border);border-radius:19px;background:#fff;box-shadow:0 15px 40px rgba(41,22,61,.06)}
        .dealerPublicSummary article{display:grid;align-content:center;gap:7px}
        .dealerPublicSummary article span{color:var(--muted);font-size:8px;font-weight:900}
        .dealerPublicSummary article strong{font-size:18px}
        .dealerPublicShare{min-width:150px;display:grid;place-items:center}
        .dealerPublicShare .dealerShareTrigger{min-width:118px}
        .dealerPublicListings{width:min(1220px,calc(100% - 32px));margin:0 auto 30px}
        .dealerPublicSectionHead{margin-bottom:14px;display:flex;align-items:end;justify-content:space-between;gap:15px}
        .dealerPublicSectionHead span{color:var(--purple);font-size:8px;font-weight:900;letter-spacing:.08em}
        .dealerPublicSectionHead h2{margin:7px 0 5px;font-size:25px}
        .dealerPublicSectionHead p{margin:0;color:var(--muted);font-size:9px}
        .dealerPublicSectionHead>a{min-height:39px;padding:0 13px;display:inline-flex;align-items:center;color:var(--purple-dark);border:1px solid #dcccff;border-radius:12px;background:#fff;font-size:9px;font-weight:900}
        .dealerPublicGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .dealerPublicListingCard{overflow:hidden;border:1px solid var(--border);border-radius:22px;background:#fff;box-shadow:0 17px 50px rgba(39,20,58,.07)}
        .dealerPublicListingImage{position:relative;height:215px;display:block;overflow:hidden;background:#f3edff}
        .dealerPublicListingImage img{width:100%;height:100%;object-fit:cover;transition:transform .25s ease}
        .dealerPublicListingCard:hover .dealerPublicListingImage img{transform:scale(1.025)}
        .dealerPublicListingImage>span{position:absolute;right:10px;bottom:10px;padding:6px 9px;color:#fff;border-radius:999px;background:rgba(23,17,31,.78);font-size:8px;font-weight:900;backdrop-filter:blur(7px)}
        .dealerPublicListingBody{padding:14px}
        .dealerPublicListingTitle{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .dealerPublicListingTitle>div>span{color:var(--purple);font-size:8px;font-weight:900}
        .dealerPublicListingTitle h3{margin:5px 0 0;font-size:14px;line-height:1.75}
        .dealerPublicSpecs{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
        .dealerPublicSpecs span{padding:6px 8px;color:#675b70;border-radius:999px;background:#f7f3fb;font-size:7px;font-weight:800}
        .dealerPublicListingFoot{margin-top:14px;padding-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #eee6f4}
        .dealerPublicListingFoot strong{font-size:10px}
        .dealerPublicListingFoot a{min-height:35px;padding:0 11px;display:inline-flex;align-items:center;color:#fff;border-radius:11px;background:var(--purple);font-size:8px;font-weight:900}
        .dealerPublicTrust{width:min(1220px,calc(100% - 32px));margin:0 auto 35px;padding:25px;display:grid;grid-template-columns:minmax(0,.8fr) minmax(430px,1.2fr);align-items:center;gap:24px;color:#fff;border-radius:28px;background:radial-gradient(circle at 0% 100%,rgba(168,85,247,.35),transparent 34%),linear-gradient(135deg,#21122b,#55208e 70%,#6d28d9);box-shadow:0 26px 70px rgba(48,21,70,.19)}
        .dealerPublicTrust>div>span{color:#d8c0ff;font-size:8px;font-weight:900}
        .dealerPublicTrust h2{margin:8px 0 7px;font-size:24px}
        .dealerPublicTrust>div>p{margin:0;color:rgba(255,255,255,.72);font-size:9px;line-height:2}
        .dealerQrCard{padding:15px;display:grid;grid-template-columns:150px 1fr;align-items:center;gap:16px;color:var(--ink);border:1px solid rgba(255,255,255,.22);border-radius:22px;background:#fff}
        .dealerQrVisual{min-height:150px;display:grid;place-items:center}
        .dealerQrImageWrap{position:relative;width:150px;height:150px;padding:7px;border:1px solid #eadff4;border-radius:17px;background:#fff}
        .dealerQrImageWrap>img:first-child{width:100%;height:100%;display:block}
        .dealerQrLogo{position:absolute;left:50%;top:50%;width:31px;height:38px;padding:3px;object-fit:contain;border:4px solid #fff;border-radius:8px;background:#fff;transform:translate(-50%,-50%)}
        .dealerQrLoading{color:var(--muted);font-size:8px}
        .dealerQrText{min-width:0;display:grid;gap:7px}
        .dealerQrText>span{color:var(--purple);font-size:7px;font-weight:900;letter-spacing:.07em}
        .dealerQrText>strong{font-size:14px;line-height:1.8}
        .dealerQrText>p{margin:0;color:var(--muted);font-size:8px;line-height:1.9}
        .dealerQrText>a{width:fit-content;min-height:35px;padding:0 11px;display:inline-flex;align-items:center;color:#fff;border-radius:10px;background:var(--purple);font-size:8px;font-weight:900}
        .dealerQrText>small{max-width:100%;overflow:hidden;color:#93869a;font-size:6px;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left}
        .dealerPublicFooter{padding:28px max(20px,calc((100vw - 1220px)/2));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px;color:#fff;background:#17111f}
        .dealerPublicFooter img{width:190px;height:auto}
        .dealerPublicFooter p{margin:0;color:rgba(255,255,255,.56);font-size:8px}
        .dealerPublicFooter div{display:flex;gap:14px;color:rgba(255,255,255,.72);font-size:8px;font-weight:900}
        .dealerShareActions{position:relative}
        .dealerShareTrigger{min-width:90px;min-height:42px;padding:0 11px;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #dfd2eb;border-radius:12px;color:#5e2a91;background:#fff;font:inherit;font-size:9px;font-weight:900;cursor:pointer}
        .dealerShareTrigger svg{width:16px;height:16px;fill:currentColor}
        .dealerShareMenu{position:absolute;left:0;bottom:calc(100% + 7px);z-index:20;min-width:125px;padding:6px;display:grid;gap:4px;border:1px solid #e3d7ed;border-radius:13px;background:#fff;box-shadow:0 17px 45px rgba(30,14,43,.17)}
        .dealerShareMenu a,.dealerShareMenu button{min-height:34px;padding:0 9px;display:flex;align-items:center;border:0;border-radius:9px;color:#4e275f;background:#f8f4fb;font:inherit;font-size:8px;font-weight:900;cursor:pointer}
        @media(max-width:980px){
          .dealerPublicGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .dealerPublicTrust{grid-template-columns:1fr}
          .dealerPublicSummary{grid-template-columns:repeat(3,minmax(0,1fr))}
          .dealerPublicShare{grid-column:1/-1}
        }
        @media(max-width:640px){
          .dealerPublicHeader{min-height:60px;padding:9px 12px}
          .dealerPublicBrand img{width:36px;height:42px;object-fit:cover;object-position:left}
          .dealerPublicHeader nav a:not(.dealerPublicSubmit){display:none}
          .dealerPublicHero{width:calc(100% - 20px);margin-top:12px;border-radius:22px}
          .dealerPublicCover{height:205px}
          .dealerPublicIdentity{margin-top:-44px;padding:0 13px 16px;grid-template-columns:auto minmax(0,1fr);gap:10px}
          .dealerPublicAvatar{width:78px;height:78px;border-width:5px;border-radius:23px;font-size:27px}
          .dealerPublicTitle h1{font-size:21px}
          .dealerPublicTitle p{font-size:8px}
          .dealerPublicVerified{grid-column:1/-1;margin:0;padding:9px 10px}
          .dealerPublicSummary{width:calc(100% - 20px);grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
          .dealerPublicSummary article{min-height:72px;padding:10px;border-radius:15px}
          .dealerPublicSummary article span{font-size:6px}
          .dealerPublicSummary article strong{font-size:12px}
          .dealerPublicShare{min-height:58px;padding:8px}
          .dealerPublicListings{width:calc(100% - 20px)}
          .dealerPublicSectionHead{align-items:flex-start}
          .dealerPublicSectionHead h2{font-size:19px}
          .dealerPublicSectionHead p{font-size:7px}
          .dealerPublicSectionHead>a{min-height:35px;padding:0 9px;font-size:7px}
          .dealerPublicGrid{grid-template-columns:1fr;gap:11px}
          .dealerPublicListingCard{display:grid;grid-template-columns:125px minmax(0,1fr);border-radius:18px}
          .dealerPublicListingImage{height:100%;min-height:175px}
          .dealerPublicListingBody{padding:11px}
          .dealerPublicListingTitle h3{font-size:11px}
          .dealerPublicSpecs{margin-top:9px}
          .dealerPublicSpecs span{font-size:6px}
          .dealerPublicListingFoot{align-items:flex-start;flex-direction:column}
          .dealerPublicListingFoot a{width:100%;justify-content:center}
          .dealerPublicTrust{width:calc(100% - 20px);padding:18px 13px;border-radius:22px}
          .dealerPublicTrust h2{font-size:19px}
          .dealerPublicTrust>div>p{font-size:7px}
          .dealerQrCard{grid-template-columns:112px 1fr;padding:10px;gap:11px;border-radius:18px}
          .dealerQrVisual{min-height:112px}
          .dealerQrImageWrap{width:112px;height:112px;padding:5px;border-radius:13px}
          .dealerQrLogo{width:25px;height:31px}
          .dealerQrText>strong{font-size:10px}
          .dealerQrText>p{font-size:6px}
          .dealerPublicFooter{padding:24px 14px 100px;grid-template-columns:1fr;gap:12px}
          .dealerPublicFooter img{width:175px}
        }
        @media(max-width:390px){
          .dealerPublicListingCard{grid-template-columns:108px minmax(0,1fr)}
          .dealerQrCard{grid-template-columns:1fr;text-align:center}
          .dealerQrText{justify-items:center}
          .dealerQrText>small{width:100%}
        }
      `}</style>
    </main>
  );
}
