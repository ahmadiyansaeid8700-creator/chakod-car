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
    (listing) => listing.dealer_name && normalizeText(listing.dealer_name) === normalizedDealer,
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

  if (listings.length === 0) return { title: "نمایشگاه پیدا نشد" };

  const cover = listings.find((listing) => listing.cover_image)?.cover_image;

  return {
    title: `نمایشگاه ${dealerName}`,
    description: `مشاهده خودروهای فعال ${dealerName} در چاکود.`,
    openGraph: {
      title: `${dealerName} | چاکود`,
      description: `ویترین خودروهای فعال ${dealerName} در چاکود.`,
      type: "website",
      images: cover ? [getImageUrl(cover)] : ["/brand/chakod-og.jpg"],
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
  const totalViews = listings.reduce((sum, listing) => sum + Number(listing.views_count || 0), 0);
  const dealerHref = `/showrooms/${encodeURIComponent(dealerName)}`;

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

      <section className="dealerProfile">
        <div className="dealerCover">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(cover)} alt={`کاور ${dealerName}`} />
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
            <span>صفحه رسمی نمایشگاه در چاکود</span>
            <h1>{dealerName}</h1>
            <p>{[city, province].filter(Boolean).join("، ")}</p>
          </div>

          <div className="dealerIdentityActions">
            <div className="dealerMemberBadge">
              <b>✓</b>
              <span>عضو چاکود</span>
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
            <article className="dealerCarCard" key={listing.id}>
              <a className="dealerCarImage" href={`/listing/${listing.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(listing.cover_image)} alt={listing.title} loading="lazy" />
                <span>{listing.production_year || "سال نامشخص"}</span>
              </a>

              <div className="dealerCarBody">
                <div className="dealerCarTitle">
                  <div>
                    <span>{listing.brand || "خودرو"}</span>
                    <h3>{listing.title}</h3>
                  </div>
                  <SaveListingButton listingId={listing.id} />
                </div>

                <div className="dealerCarSpecs">
                  <span>{formatMileage(listing.mileage_km)}</span>
                  <span>{listing.transmission || "گیربکس نامشخص"}</span>
                  <span>{listing.body_status || "وضعیت بدنه نامشخص"}</span>
                </div>

                <div className="dealerCarFoot">
                  <strong>{formatPrice(listing.price_toman)}</strong>
                  <a href={`/listing/${listing.id}`}>مشاهده آگهی</a>
                </div>
              </div>
            </article>
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

      <style>{`
        .dealerPage{--purple:#6d28d9;--ink:#1b1222;--muted:#756a7d;--border:#e7ddf0;min-height:100vh;overflow-x:clip;color:var(--ink);font-family:Tahoma,Arial,sans-serif;background:#fbf9fd}
        .dealerPage *{box-sizing:border-box}
        .dealerPage a{color:inherit;text-decoration:none}
        .dealerHeader{position:sticky;top:0;z-index:60;min-height:66px;padding:10px max(18px,calc((100vw - 1160px)/2));display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #ece5f2;background:rgba(255,255,255,.96);backdrop-filter:blur(14px)}
        .dealerBrand img{display:block;width:auto;height:36px}
        .dealerHeader nav{display:flex;align-items:center;gap:7px;font-size:9px;font-weight:900}
        .dealerHeader nav a{min-height:38px;padding:0 11px;display:inline-flex;align-items:center;border-radius:11px;background:#f5effa}
        .dealerBack{color:#fff!important;background:var(--purple)!important}
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
        .dealerGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .dealerCarCard{overflow:hidden;display:grid;grid-template-columns:190px minmax(0,1fr);border:1px solid var(--border);border-radius:17px;background:#fff}
        .dealerCarImage{position:relative;min-height:170px;overflow:hidden;background:#f1ebf6}
        .dealerCarImage img{width:100%;height:100%;display:block;object-fit:cover}
        .dealerCarImage>span{position:absolute;right:8px;top:8px;padding:5px 7px;color:#fff;border-radius:999px;background:rgba(31,17,41,.78);font-size:8px}
        .dealerCarBody{padding:12px;display:flex;min-width:0;flex-direction:column}
        .dealerCarTitle{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
        .dealerCarTitle>div>span{color:var(--purple);font-size:8px;font-weight:900}
        .dealerCarTitle h3{margin:4px 0 0;font-size:13px;line-height:1.7}
        .dealerCarSpecs{margin:10px 0;display:flex;flex-wrap:wrap;gap:5px}
        .dealerCarSpecs span{padding:5px 7px;color:#6f6277;border-radius:999px;background:#f7f3f9;font-size:7px}
        .dealerCarFoot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:9px}
        .dealerCarFoot strong{font-size:11px}
        .dealerCarFoot a{padding:8px 10px;color:#fff!important;border-radius:9px;background:var(--purple);font-size:8px;font-weight:900}
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
          .dealerGrid{grid-template-columns:1fr}
          .dealerQrCard{grid-template-columns:135px minmax(0,1fr);gap:13px}
          .dealerQrImageWrap,.dealerQrLoading{width:128px;height:128px}
        }
        @media(max-width:620px){
          .dealerProfile,.dealerStats,.dealerInventory,.dealerQrSection,.dealerFooter{width:min(100% - 20px,1160px)}
          .dealerStats{grid-template-columns:1fr 1fr}
          .dealerStats article:last-child{grid-column:1/-1}
          .dealerSectionHead{align-items:flex-start;flex-direction:column}
          .dealerCarCard{grid-template-columns:118px minmax(0,1fr)}
          .dealerCarImage{min-height:155px}
          .dealerCarSpecs span:nth-child(3){display:none}
          .dealerQrCard{grid-template-columns:1fr;text-align:center}
          .dealerQrText small{text-align:center}
          .dealerFooter{align-items:flex-start;flex-direction:column}
        }
      `}</style>
    </main>
  );
}
