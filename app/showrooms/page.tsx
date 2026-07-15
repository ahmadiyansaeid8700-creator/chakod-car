import DealerShareActions from "../components/DealerShareActions";

const API_BASE = "https://api.chakod.com";

type Listing = {
  id: number;
  title: string;
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
        <a className="showroomsBrand" href="/">
          <span>چ</span>
          <strong>چاکود</strong>
        </a>
        <nav>
          <a href="/">خانه</a>
          <a href="/ads/luxury">خودروها</a>
          <a className="showroomsManage" href="/dealers">مدیریت نمایشگاه</a>
        </nav>
      </header>

      <section className="showroomsHero">
        <div>
          <span>SHOWROOMS OF CHAKOD</span>
          <h1>نمایشگاه‌های چاکود</h1>
          <p>فهرست عمودی نمایشگاه‌ها برای بررسی راحت‌تر، جست‌وجو و اشتراک‌گذاری با مشتری.</p>
        </div>
        <strong>{new Intl.NumberFormat("fa-IR").format(filtered.length)} نمایشگاه</strong>
      </section>

      <section className="showroomsBody">
        <form className="showroomsFilters" method="get" action="/showrooms">
          <label>
            <span>نام نمایشگاه یا شهر</span>
            <input name="q" defaultValue={query} placeholder="جست‌وجو..." />
          </label>

          <label>
            <span>شهر</span>
            <select name="city" defaultValue={city}>
              <option value="">همه شهرها</option>
              {cities.map((item) => <option key={item} value={item}>{item}</option>)}
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

          <button type="submit">نمایش نتایج</button>
          <a href="/showrooms">پاک‌کردن</a>
        </form>

        {filtered.length === 0 ? (
          <div className="showroomsEmpty">
            <span>چ</span>
            <strong>نمایشگاهی مطابق جست‌وجو پیدا نشد</strong>
            <p>فیلترها را تغییر بده یا اولین نمایشگاه این شهر را ثبت کن.</p>
            <a href="/dealers">ثبت نمایشگاه</a>
          </div>
        ) : (
          <div className="showroomsGrid">
            {filtered.map((dealer) => {
              const dealerHref = `/?q=${encodeURIComponent(dealer.name)}`;
              return (
                <article className="showroomCard" key={dealer.name}>
                  <a className="showroomCover" href={dealerHref}>
                    {dealer.coverImage ? (
                      <img src={getImageUrl(dealer.coverImage)} alt={dealer.name} loading="lazy" />
                    ) : (
                      <span>{dealer.name.slice(0, 1)}</span>
                    )}
                    <em>هویت نمایشگاه در چاکود</em>
                  </a>

                  <div className="showroomCardBody">
                    <div className="showroomIdentity">
                      <span>{dealer.name.slice(0, 1)}</span>
                      <div>
                        <h2>{dealer.name}</h2>
                        <p>{[dealer.city, dealer.province].filter(Boolean).join("، ")}</p>
                      </div>
                    </div>

                    <div className="showroomStats">
                      <span><b>{new Intl.NumberFormat("fa-IR").format(dealer.listingCount)}</b> آگهی فعال</span>
                      <span><b>✓</b> عضو چاکود</span>
                    </div>

                    <div className="showroomActions">
                      <a href={dealerHref}>مشاهده خودروها</a>
                      <DealerShareActions
                        dealerName={dealer.name}
                        city={dealer.city}
                        href={dealerHref}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .showroomsPage { min-height:100vh; overflow-x:clip; color:#1c1324; font-family:Tahoma,Arial,sans-serif; background:radial-gradient(circle at 90% 0%,rgba(109,40,217,.13),transparent 27rem),linear-gradient(180deg,#fff,#faf7ff 52%,#fff); }
        .showroomsPage * { box-sizing:border-box; }
        .showroomsPage a { color:inherit; text-decoration:none; }
        .showroomsHeader { position:sticky; top:0; z-index:50; min-height:72px; padding:12px max(20px,calc((100vw - 1220px)/2)); display:flex; align-items:center; justify-content:space-between; gap:18px; border-bottom:1px solid #ece3f5; background:rgba(255,255,255,.94); backdrop-filter:blur(16px); }
        .showroomsBrand { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:900; }
        .showroomsBrand > span { width:39px; height:39px; display:grid; place-items:center; color:#fff; border-radius:13px; background:linear-gradient(135deg,#2d163d,#6d28d9); }
        .showroomsHeader nav { display:flex; align-items:center; gap:8px; font-size:10px; font-weight:900; }
        .showroomsHeader nav a { min-height:39px; padding:0 12px; display:inline-flex; align-items:center; border-radius:12px; }
        .showroomsManage { color:#fff !important; background:#6d28d9; }
        .showroomsHero { width:min(1220px,calc(100% - 32px)); margin:28px auto 18px; padding:30px; display:flex; align-items:flex-end; justify-content:space-between; gap:20px; color:#fff; border-radius:29px; background:radial-gradient(circle at 10% 100%,rgba(168,85,247,.38),transparent 34%),linear-gradient(135deg,#251330,#55208e 68%,#6d28d9); box-shadow:0 28px 75px rgba(43,22,61,.2); }
        .showroomsHero span { color:#d8c0ff; font-size:9px; font-weight:900; letter-spacing:.08em; }
        .showroomsHero h1 { margin:8px 0 5px; font-size:32px; }
        .showroomsHero p { margin:0; color:rgba(255,255,255,.72); font-size:11px; line-height:2; }
        .showroomsHero > strong { flex:0 0 auto; padding:10px 13px; border:1px solid rgba(255,255,255,.18); border-radius:999px; background:rgba(255,255,255,.09); font-size:10px; }
        .showroomsBody { width:min(1220px,calc(100% - 32px)); margin:0 auto 60px; }
        .showroomsFilters { margin-bottom:18px; padding:14px; display:grid; grid-template-columns:minmax(220px,1.5fr) repeat(2,minmax(160px,1fr)) auto auto; gap:9px; align-items:end; border:1px solid #e8def2; border-radius:20px; background:#fff; box-shadow:0 16px 48px rgba(44,24,68,.06); }
        .showroomsFilters label { display:grid; gap:6px; }
        .showroomsFilters label > span { color:#73667c; font-size:8px; font-weight:900; }
        .showroomsFilters input,.showroomsFilters select { width:100%; min-height:43px; padding:0 11px; border:1px solid #e6dced; border-radius:12px; color:#25192e; background:#fff; outline:none; font:inherit; font-size:9px; }
        .showroomsFilters button,.showroomsFilters > a { min-height:43px; padding:0 13px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; font:inherit; font-size:9px; font-weight:900; cursor:pointer; }
        .showroomsFilters button { border:0; color:#fff; background:#6d28d9; }
        .showroomsFilters > a { color:#6d28d9; border:1px solid #e2d5ef; background:#fff; }
        .showroomsGrid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:15px; }
        .showroomCard { min-width:0; overflow:visible; border:1px solid #e7dcef; border-radius:23px; background:#fff; box-shadow:0 19px 52px rgba(44,24,68,.08); }
        .showroomCover { position:relative; height:185px; overflow:hidden; border-radius:22px 22px 0 0; display:grid; place-items:center; color:#fff; background:linear-gradient(135deg,#271634,#6d28d9); font-size:42px; font-weight:900; }
        .showroomCover img { width:100%; height:100%; display:block; object-fit:cover; }
        .showroomCover::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 48%,rgba(18,9,26,.62)); pointer-events:none; }
        .showroomCover em { position:absolute; right:12px; bottom:11px; z-index:2; padding:6px 9px; border:1px solid rgba(255,255,255,.3); border-radius:999px; background:rgba(18,9,26,.52); font-size:8px; font-style:normal; }
        .showroomCardBody { padding:15px; }
        .showroomIdentity { display:flex; align-items:center; gap:10px; }
        .showroomIdentity > span { width:43px; height:43px; flex:0 0 auto; display:grid; place-items:center; color:#fff; border-radius:14px; background:linear-gradient(135deg,#2d163d,#6d28d9); font-size:14px; font-weight:900; }
        .showroomIdentity h2 { margin:0; font-size:14px; line-height:1.7; }
        .showroomIdentity p { margin:2px 0 0; color:#786c81; font-size:9px; }
        .showroomStats { margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .showroomStats span { padding:9px; display:grid; gap:4px; text-align:center; color:#766a7f; border-radius:12px; background:#f8f4fb; font-size:8px; }
        .showroomStats b { color:#5b258f; font-size:12px; }
        .showroomActions { position:relative; margin-top:14px; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
        .showroomActions > a { min-height:42px; display:grid; place-items:center; color:#fff; border-radius:12px; background:#6d28d9; font-size:9px; font-weight:900; }
        .dealerShareActions { position:relative; }
        .dealerShareTrigger { min-width:88px; min-height:42px; padding:0 11px; display:flex; align-items:center; justify-content:center; gap:6px; border:1px solid #dfd2eb; border-radius:12px; color:#5e2a91; background:#fff; font:inherit; font-size:9px; font-weight:900; cursor:pointer; }
        .dealerShareTrigger svg { width:16px; height:16px; fill:currentColor; }
        .dealerShareMenu { position:absolute; left:0; bottom:calc(100% + 7px); z-index:20; min-width:125px; padding:6px; display:grid; gap:4px; border:1px solid #e3d7ed; border-radius:13px; background:#fff; box-shadow:0 17px 45px rgba(30,14,43,.17); }
        .dealerShareMenu a,.dealerShareMenu button { min-height:34px; padding:0 9px; display:flex; align-items:center; border:0; border-radius:9px; color:#4e275f; background:#f8f4fb; font:inherit; font-size:8px; font-weight:900; cursor:pointer; }
        .showroomsEmpty { min-height:360px; padding:30px; display:grid; place-items:center; align-content:center; gap:9px; text-align:center; border:1px dashed #d8cae5; border-radius:24px; background:#fff; }
        .showroomsEmpty > span { width:55px; height:55px; display:grid; place-items:center; color:#fff; border-radius:17px; background:#6d28d9; font-size:22px; font-weight:900; }
        .showroomsEmpty strong { font-size:17px; }
        .showroomsEmpty p { margin:0; color:#766a7f; font-size:10px; }
        .showroomsEmpty a { margin-top:7px; padding:10px 13px; color:#fff; border-radius:11px; background:#6d28d9; font-size:9px; font-weight:900; }
        @media (max-width:980px) { .showroomsGrid { grid-template-columns:repeat(2,minmax(0,1fr)); } .showroomsFilters { grid-template-columns:1fr 1fr; } .showroomsFilters label:first-child { grid-column:1/-1; } }
        @media (max-width:620px) {
          .showroomsHeader { min-height:60px; padding:9px 12px; }
          .showroomsHeader nav a:not(.showroomsManage) { display:none; }
          .showroomsHero { width:calc(100% - 20px); margin-top:14px; padding:20px 15px; align-items:flex-start; border-radius:22px; }
          .showroomsHero h1 { font-size:23px; }
          .showroomsHero p { font-size:8px; }
          .showroomsHero > strong { font-size:8px; }
          .showroomsBody { width:calc(100% - 20px); }
          .showroomsFilters { grid-template-columns:1fr; padding:12px; }
          .showroomsFilters label:first-child { grid-column:auto; }
          .showroomsFilters > a { min-height:38px; }
          .showroomsGrid { grid-template-columns:1fr; gap:12px; }
          .showroomCover { height:170px; }
        }
      `}</style>
    </main>
  );
}
