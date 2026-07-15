import DealerShareActions from "../components/DealerShareActions";

const API_BASE = "https://api.chakod.com";

type Listing = {
  id: number;
  city: string;
  province: string;
  dealer_name: string | null;
  cover_image: string | null;
  created_at: string;
};

type ListingsResponse = {
  success: boolean;
  data: Listing[];
};

type SearchParams = Record<string, string | string[] | undefined>;

type DealerPreview = {
  name: string;
  city: string;
  province: string;
  listingCount: number;
  coverImage: string | null;
  latestAt: string;
};

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

function readParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
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
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function getImageUrl(path: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildDealers(listings: Listing[]) {
  const map = new Map<string, DealerPreview>();

  for (const listing of listings) {
    const name = listing.dealer_name?.trim();
    if (!name) continue;

    const current = map.get(name);
    if (current) {
      current.listingCount += 1;
      if (!current.coverImage && listing.cover_image) current.coverImage = listing.cover_image;
      if (new Date(listing.created_at).getTime() > new Date(current.latestAt).getTime()) {
        current.latestAt = listing.created_at;
      }
      continue;
    }

    map.set(name, {
      name,
      city: listing.city || "شهر نامشخص",
      province: listing.province || "",
      listingCount: 1,
      coverImage: listing.cover_image,
      latestAt: listing.created_at,
    });
  }

  return Array.from(map.values());
}

export default async function PublicShowroomsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const query = readParam(params, "q");
  const city = readParam(params, "city");
  const sort = readParam(params, "sort") || "popular";

  const dealers = buildDealers(await getListings());
  const cities = Array.from(new Set(dealers.map((dealer) => dealer.city).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, "fa"),
  );

  const filtered = dealers.filter((dealer) => {
    const text = normalizeText(`${dealer.name} ${dealer.city} ${dealer.province}`);
    if (query && !text.includes(normalizeText(query))) return false;
    if (city && dealer.city !== city) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "fa");
    if (sort === "newest") return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    return b.listingCount - a.listingCount;
  });

  return (
    <main className="showroomsPage" dir="rtl">
      <header className="showroomsHeader">
        <a className="showroomsBrand" href="/" aria-label="صفحه اصلی چاکود">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </a>

        <nav>
          <a href="/">خانه</a>
          <a href="/ads">همه خودروها</a>
          <a className="manageLink" href="/dealers">مدیریت نمایشگاه</a>
        </nav>
      </header>

      <section className="showroomsIntro">
        <div>
          <span>نمایشگاه‌های چاکود</span>
          <h1>ویترین رسمی نمایشگاه‌ها</h1>
          <p>نمایشگاه را پیدا کن، خودروهای فعالش را ببین و لینک صفحه را برای مشتری بفرست.</p>
        </div>
        <strong>{new Intl.NumberFormat("fa-IR").format(filtered.length)} نمایشگاه</strong>
      </section>

      <section className="showroomsContent">
        <form className="showroomsFilters" method="get" action="/showrooms">
          <label className="wideField">
            <span>جست‌وجو</span>
            <input name="q" defaultValue={query} placeholder="نام نمایشگاه یا شهر..." />
          </label>

          <label>
            <span>شهر</span>
            <select name="city" defaultValue={city}>
              <option value="">همه شهرها</option>
              {cities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>مرتب‌سازی</span>
            <select name="sort" defaultValue={sort}>
              <option value="popular">بیشترین آگهی</option>
              <option value="newest">تازه‌ترین فعالیت</option>
              <option value="name">نام نمایشگاه</option>
            </select>
          </label>

          <button type="submit">اعمال</button>
          <a className="clearFilters" href="/showrooms">پاک‌کردن</a>
        </form>

        {filtered.length === 0 ? (
          <div className="showroomsEmpty">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
            <strong>نمایشگاهی پیدا نشد</strong>
            <p>عبارت جست‌وجو یا شهر را تغییر بده.</p>
          </div>
        ) : (
          <div className="showroomsGrid">
            {filtered.map((dealer) => {
              const dealerHref = `/showrooms/${encodeURIComponent(dealer.name)}`;

              return (
                <article className="showroomCard" key={dealer.name}>
                  <a className="showroomCover" href={dealerHref}>
                    {dealer.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getImageUrl(dealer.coverImage)} alt={dealer.name} loading="lazy" />
                    ) : (
                      <span>{dealer.name.slice(0, 1)}</span>
                    )}
                  </a>

                  <div className="showroomBody">
                    <div className="showroomTitle">
                      <div className="showroomAvatar" aria-hidden="true">{dealer.name.slice(0, 1)}</div>
                      <div>
                        <h2>{dealer.name}</h2>
                        <p>{[dealer.city, dealer.province].filter(Boolean).join("، ")}</p>
                      </div>
                    </div>

                    <div className="showroomMeta">
                      <span><b>{new Intl.NumberFormat("fa-IR").format(dealer.listingCount)}</b> خودرو فعال</span>
                      <span><b>✓</b> عضو چاکود</span>
                    </div>

                    <div className="showroomActions">
                      <a className="viewShowroom" href={dealerHref}>مشاهده نمایشگاه</a>
                      <DealerShareActions dealerName={dealer.name} city={dealer.city} href={dealerHref} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .showroomsPage{min-height:100vh;overflow-x:clip;color:#1c1324;font-family:Tahoma,Arial,sans-serif;background:#fbf9fd}
        .showroomsPage *{box-sizing:border-box}
        .showroomsPage a{color:inherit;text-decoration:none}
        .showroomsHeader{position:sticky;top:0;z-index:50;min-height:66px;padding:10px max(18px,calc((100vw - 1160px)/2));display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #ece5f2;background:rgba(255,255,255,.96);backdrop-filter:blur(14px)}
        .showroomsBrand img{display:block;width:auto;height:36px}
        .showroomsHeader nav{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:900}
        .showroomsHeader nav a{min-height:38px;padding:0 11px;display:inline-flex;align-items:center;border-radius:11px}
        .manageLink{color:#fff!important;background:#6d28d9}
        .showroomsIntro{width:min(1160px,calc(100% - 28px));margin:22px auto 14px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid #e7ddf0;border-radius:22px;background:#fff;box-shadow:0 14px 40px rgba(54,28,78,.06)}
        .showroomsIntro span{color:#6d28d9;font-size:9px;font-weight:900}
        .showroomsIntro h1{margin:5px 0 4px;font-size:25px}
        .showroomsIntro p{margin:0;color:#756a7e;font-size:10px;line-height:1.9}
        .showroomsIntro>strong{flex:0 0 auto;padding:9px 12px;color:#5b21b6;border-radius:999px;background:#f3eaff;font-size:10px}
        .showroomsContent{width:min(1160px,calc(100% - 28px));margin:0 auto 48px}
        .showroomsFilters{margin-bottom:14px;padding:12px;display:grid;grid-template-columns:minmax(220px,1.6fr) repeat(2,minmax(150px,1fr)) auto auto;gap:8px;align-items:end;border:1px solid #e7ddf0;border-radius:18px;background:#fff}
        .showroomsFilters label{display:grid;gap:5px}
        .showroomsFilters label span{color:#756a7e;font-size:8px;font-weight:900}
        .showroomsFilters input,.showroomsFilters select{width:100%;min-height:42px;padding:0 11px;border:1px solid #e5dbea;border-radius:11px;color:#21172a;font-family:inherit;background:#fff;outline:none}
        .showroomsFilters input:focus,.showroomsFilters select:focus{border-color:#9b6de7;box-shadow:0 0 0 3px rgba(109,40,217,.08)}
        .showroomsFilters button,.clearFilters{min-height:42px;padding:0 13px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:11px;font-family:inherit;font-size:9px;font-weight:900;cursor:pointer}
        .showroomsFilters button{color:#fff;background:#6d28d9}
        .clearFilters{color:#6d28d9;background:#f3eaff}
        .showroomsGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .showroomCard{overflow:visible;border:1px solid #e7ddf0;border-radius:21px;background:#fff;box-shadow:0 14px 38px rgba(51,28,70,.06)}
        .showroomCover{height:150px;display:block;overflow:hidden;border-radius:20px 20px 0 0;background:linear-gradient(135deg,#24112f,#6d28d9)}
        .showroomCover img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .2s ease}
        .showroomCover:hover img{transform:scale(1.025)}
        .showroomCover>span{width:100%;height:100%;display:grid;place-items:center;color:#fff;font-size:42px;font-weight:900}
        .showroomBody{padding:13px}
        .showroomTitle{display:flex;align-items:center;gap:10px}
        .showroomAvatar{width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;color:#fff;border-radius:13px;background:linear-gradient(135deg,#4c1d95,#8b5cf6);font-weight:900}
        .showroomTitle h2{margin:0 0 3px;font-size:14px}
        .showroomTitle p{margin:0;color:#7a6d83;font-size:9px}
        .showroomMeta{margin:12px 0;display:flex;flex-wrap:wrap;gap:7px}
        .showroomMeta span{padding:7px 9px;color:#695b73;border-radius:999px;background:#f7f2fb;font-size:8px}
        .showroomMeta b{color:#6d28d9}
        .showroomActions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center}
        .viewShowroom{min-height:39px;display:flex;align-items:center;justify-content:center;color:#fff!important;border-radius:11px;background:#6d28d9;font-size:9px;font-weight:900}
        .dealerShareActions{position:relative}
        .dealerShareTrigger{min-width:78px;min-height:39px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:5px;color:#6d28d9;border:1px solid #dfcff0;border-radius:11px;background:#fff;font-family:inherit;font-size:8px;font-weight:900;cursor:pointer}
        .dealerShareTrigger svg{width:15px;height:15px;fill:currentColor}
        .dealerShareMenu{position:absolute;left:0;bottom:calc(100% + 6px);z-index:20;width:115px;padding:6px;display:grid;gap:4px;border:1px solid #e4d8ed;border-radius:12px;background:#fff;box-shadow:0 14px 34px rgba(40,20,55,.14)}
        .dealerShareMenu a,.dealerShareMenu button{min-height:31px;padding:0 8px;display:flex;align-items:center;border:0;border-radius:8px;color:#44344f;background:#f8f4fb;font-family:inherit;font-size:8px;cursor:pointer}
        .showroomsEmpty{min-height:280px;display:grid;place-items:center;align-content:center;gap:8px;text-align:center;border:1px dashed #d9c9e8;border-radius:22px;background:#fff}
        .showroomsEmpty img{width:56px;height:56px;object-fit:contain}
        .showroomsEmpty strong{font-size:15px}
        .showroomsEmpty p{margin:0;color:#776a80;font-size:10px}
        @media(max-width:900px){
          .showroomsHeader{min-height:58px;padding:9px 12px}
          .showroomsBrand img{height:31px}
          .showroomsHeader nav a:not(.manageLink){display:none}
          .showroomsIntro{margin-top:12px;padding:16px;align-items:flex-start;flex-direction:column}
          .showroomsIntro h1{font-size:21px}
          .showroomsFilters{grid-template-columns:1fr 1fr}
          .wideField{grid-column:1/-1}
          .showroomsGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media(max-width:620px){
          .showroomsContent,.showroomsIntro{width:min(100% - 20px,1160px)}
          .showroomsFilters{grid-template-columns:1fr}
          .wideField{grid-column:auto}
          .showroomsGrid{grid-template-columns:1fr;gap:11px}
          .showroomCover{height:138px}
          .showroomActions{grid-template-columns:minmax(0,1fr) 82px}
        }
      `}</style>
    </main>
  );
}
