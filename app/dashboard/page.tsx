"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.chakod.com";

type DashboardUser = {
  id: number;
  mobile?: string;
  full_name?: string;
  account_type?: string;
  business_name?: string;
};

type DashboardStats = {
  total: number;
  active: number;
  pending: number;
  draft: number;
  inactive: number;
  rejected: number;
  expired: number;
  sold: number;
};

type ChartItem = {
  code?: string;
  title: string;
  value: number;
};

type TrendItem = {
  date: string;
  label: string;
  count: number;
};

type DealerItem = {
  id: number;
  dealer_name: string;
  role: string;
  role_title: string;
  can_manage_team: boolean;
  can_create_listing: boolean;
  province?: string;
  city?: string;
  neighborhood?: string;
};

type TeamPerformanceItem = {
  auth_user_id: number;
  display_name: string;
  total: number;
  active: number;
  pending: number;
  rejected: number;
  sold: number;
  inactive: number;
};

type RecentListing = {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  mileage_km?: string | number | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  created_by_auth_user_id?: number | null;
  category_code?: string;
  status: {
    code: string;
    title: string;
  };
  cover_image?: {
    image_id: number;
    image_url: string;
  } | null;
  image_count: number;
  created_at?: string;
};

type DashboardResponse = {
  success: boolean;
  message?: string;
  user?: DashboardUser;
  stats?: Partial<DashboardStats>;
  dealers?: DealerItem[];
  charts?: {
    status?: ChartItem[];
    trend?: TrendItem[];
    category?: ChartItem[];
    dealers?: {
      dealer_id: number;
      dealer_name: string;
      value: number;
    }[];
    team_performance?: TeamPerformanceItem[];
  };
  recent_listings?: RecentListing[];
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function formatNumber(value: number | string | null | undefined) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "۰";
  return n.toLocaleString("fa-IR");
}

function formatPrice(value: number | string | null | undefined) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return "قیمت توافقی";
  }

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${n.toLocaleString("fa-IR")} تومان`;
}

function statusClass(code?: string) {
  switch (code) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "sold":
      return "sold";
    case "expired":
    case "inactive":
    case "draft":
      return "inactive";
    default:
      return "pending";
  }
}

function maxValue(items: { value?: number; count?: number }[]) {
  const values = items.map((item) => Number(item.value ?? item.count ?? 0));
  return Math.max(1, ...values);
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/dashboard-summary.php`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json: DashboardResponse = await res.json();

      if (!json.success) {
        setError(json.message || "داشبورد دریافت نشد.");
        setData(null);
        return;
      }

      setData(json);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats: DashboardStats = {
    total: Number(data?.stats?.total || 0),
    active: Number(data?.stats?.active || 0),
    pending: Number(data?.stats?.pending || 0),
    draft: Number(data?.stats?.draft || 0),
    inactive: Number(data?.stats?.inactive || 0),
    rejected: Number(data?.stats?.rejected || 0),
    expired: Number(data?.stats?.expired || 0),
    sold: Number(data?.stats?.sold || 0),
  };

  const statusChart = data?.charts?.status || [];
  const trendChart = data?.charts?.trend || [];
  const categoryChart = data?.charts?.category || [];
  const dealerChart = data?.charts?.dealers || [];
  const teamPerformance = data?.charts?.team_performance || [];
  const dealers = data?.dealers || [];
  const recentListings = data?.recent_listings || [];

  const activePercent = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.active / stats.total) * 100);
  }, [stats.total, stats.active]);

  const pendingPercent = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.pending / stats.total) * 100);
  }, [stats.total, stats.pending]);

  const trendMax = maxValue(trendChart);
  const statusMax = maxValue(statusChart);
  const categoryMax = maxValue(categoryChart);
  const dealerMax = maxValue(dealerChart);

  const displayName =
    data?.user?.full_name ||
    data?.user?.business_name ||
    data?.user?.mobile ||
    "همراه چاکود";

  return (
    <main className="dashboardPage" dir="rtl">
      <section className="shell">
        <header className="topbar">
          <a href="/" className="brand">
            <div className="logoMark">چ</div>
            <div>
              <strong>چاکود</strong>
              <span>داشبورد مدیریتی</span>
            </div>
          </a>

          <nav className="navLinks">
            <a href="/">خانه</a>
            <a href="/account">حساب</a>
            <a href="/submit">ثبت آگهی</a>
            <a href="/dealers">نمایشگاه</a>
          </nav>
        </header>

        {loading && (
          <div className="centerCard">
            <div className="loader" />
            <h1>در حال آماده‌سازی داشبورد...</h1>
            <p>آمار آگهی‌ها، نمایشگاه‌ها و عملکرد تیم در حال دریافت است.</p>
          </div>
        )}

        {!loading && error && (
          <div className="centerCard">
            <span className="miniLabel">داشبورد</span>
            <h1>دسترسی به داشبورد ممکن نیست</h1>
            <p>{error}</p>
            <div className="centerActions">
              <a href="/login" className="primaryLink">
                ورود به حساب
              </a>
              <button className="secondaryBtn" onClick={loadDashboard}>
                تلاش دوباره
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section className="hero">
              <div>
                <span className="miniLabel">مرکز کنترل چاکود</span>
                <h1>سلام، {displayName} 👑</h1>
                <p>
                  اینجا مرکز مدیریت آگهی‌ها، نمایشگاه‌ها، تیم فروش و تحلیل عملکرد شماست.
                  از این بخش می‌توانید وضعیت آگهی‌ها را ببینید، آگهی‌ها را مدیریت کنید و عملکرد نمایشگاه را بررسی کنید.
                </p>
              </div>

              <div className="heroPanel">
                <div className="heroMetric">
                  <span>نرخ آگهی فعال</span>
                  <strong>{formatNumber(activePercent)}٪</strong>
                </div>
                <div className="heroMetric">
                  <span>در انتظار بررسی</span>
                  <strong>{formatNumber(pendingPercent)}٪</strong>
                </div>
              </div>
            </section>

            <section className="quickActions">
              <a href="/submit" className="quickAction primaryAction">
                <span>＋</span>
                <div>
                  <strong>ثبت آگهی جدید</strong>
                  <small>شخصی یا به نام نمایشگاه</small>
                </div>
              </a>

              <a href="#recentListings" className="quickAction">
                <span>📋</span>
                <div>
                  <strong>آگهی‌های من</strong>
                  <small>مشاهده و مدیریت آگهی‌های اخیر</small>
                </div>
              </a>

              <a href="/dealers" className="quickAction">
                <span>🏢</span>
                <div>
                  <strong>نمایشگاه و تیم</strong>
                  <small>دعوت کارمند و نقش‌ها</small>
                </div>
              </a>

              <a href="/account" className="quickAction">
                <span>👤</span>
                <div>
                  <strong>حساب کاربری</strong>
                  <small>اطلاعات حساب و مسیرهای مدیریتی</small>
                </div>
              </a>
            </section>

            <section className="statsGrid">
              <div className="statCard statMain">
                <span>کل آگهی‌ها</span>
                <strong>{formatNumber(stats.total)}</strong>
                <small>شخصی + نمایشگاهی</small>
              </div>

              <div className="statCard">
                <span>فعال</span>
                <strong>{formatNumber(stats.active)}</strong>
                <small>منتشر شده و قابل مشاهده</small>
              </div>

              <div className="statCard">
                <span>در انتظار بررسی</span>
                <strong>{formatNumber(stats.pending)}</strong>
                <small>منتظر تأیید چاکود</small>
              </div>

              <div className="statCard">
                <span>نیازمند توجه</span>
                <strong>{formatNumber(stats.rejected + stats.inactive + stats.expired)}</strong>
                <small>رد شده، غیرفعال یا منقضی</small>
              </div>

              <div className="statCard">
                <span>فروخته‌شده</span>
                <strong>{formatNumber(stats.sold)}</strong>
                <small>آگهی‌های موفق</small>
              </div>
            </section>

            <section className="analyticsGrid">
              <div className="panel largePanel">
                <div className="panelHead">
                  <div>
                    <span>نمودار مدیریتی</span>
                    <h2>روند ثبت آگهی در ۱۴ روز اخیر</h2>
                  </div>
                  <b>
                    {formatNumber(
                      trendChart.reduce((sum, item) => sum + Number(item.count || 0), 0)
                    )}{" "}
                    آگهی
                  </b>
                </div>

                {trendChart.length === 0 ? (
                  <div className="emptyBox">هنوز داده‌ای برای نمودار روند وجود ندارد.</div>
                ) : (
                  <div className="trendChart">
                    {trendChart.map((item) => {
                      const height = Math.max(
                        6,
                        Math.round((Number(item.count || 0) / trendMax) * 100)
                      );

                      return (
                        <div className="trendItem" key={item.date}>
                          <div className="trendBarBox">
                            <div className="trendBar" style={{ height: `${height}%` }}>
                              <span>{formatNumber(item.count)}</span>
                            </div>
                          </div>
                          <small>{item.label}</small>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panelHead">
                  <div>
                    <span>وضعیت آگهی‌ها</span>
                    <h2>تحلیل وضعیت</h2>
                  </div>
                </div>

                {statusChart.length === 0 ? (
                  <div className="emptyBox">هنوز داده‌ای برای تحلیل وضعیت وجود ندارد.</div>
                ) : (
                  <div className="barList">
                    {statusChart.map((item) => {
                      const width = Math.round((Number(item.value || 0) / statusMax) * 100);

                      return (
                        <div className="barRow" key={item.code || item.title}>
                          <div className="barInfo">
                            <span>{item.title}</span>
                            <b>{formatNumber(item.value)}</b>
                          </div>
                          <div className="barTrack">
                            <div
                              className={`barFill ${statusClass(item.code)}`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panelHead">
                  <div>
                    <span>ترکیب آگهی‌ها</span>
                    <h2>دسته‌بندی خودروها</h2>
                  </div>
                </div>

                {categoryChart.length === 0 ? (
                  <div className="emptyBox">هنوز داده کافی برای این نمودار وجود ندارد.</div>
                ) : (
                  <div className="barList">
                    {categoryChart.map((item) => {
                      const width = Math.round((Number(item.value || 0) / categoryMax) * 100);

                      return (
                        <div className="barRow" key={item.code || item.title}>
                          <div className="barInfo">
                            <span>{item.title}</span>
                            <b>{formatNumber(item.value)}</b>
                          </div>
                          <div className="barTrack">
                            <div className="barFill purple" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panelHead">
                  <div>
                    <span>نمایشگاه‌ها</span>
                    <h2>سهم هر نمایشگاه</h2>
                  </div>
                </div>

                {dealerChart.length === 0 ? (
                  <div className="emptyBox">فعلاً آگهی نمایشگاهی ثبت نشده است.</div>
                ) : (
                  <div className="dealerChart">
                    {dealerChart.map((item) => {
                      const width = Math.round((Number(item.value || 0) / dealerMax) * 100);

                      return (
                        <div className="dealerBar" key={item.dealer_id}>
                          <div>
                            <strong>{item.dealer_name}</strong>
                            <span>{formatNumber(item.value)} آگهی</span>
                          </div>
                          <div className="dealerTrack">
                            <div className="dealerFill" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="managementGrid">
              <div className="panel" id="recentListings">
                <div className="panelHead">
                  <div>
                    <span>مدیریت آگهی</span>
                    <h2>آگهی‌های اخیر</h2>
                  </div>
                  <a href="/submit">ثبت آگهی</a>
                </div>

                {recentListings.length === 0 ? (
                  <div className="emptyBox">
                    هنوز آگهی‌ای ثبت نکرده‌اید.
                    <br />
                    از دکمه ثبت آگهی جدید شروع کنید.
                  </div>
                ) : (
                  <div className="listingList">
                    {recentListings.map((listing) => (
                      <div className="listingItem" key={listing.id}>
                        <div className="listingImage">
                          {listing.cover_image?.image_url ? (
                            <img src={listing.cover_image.image_url} alt={listing.title} />
                          ) : (
                            <span>بدون عکس</span>
                          )}
                        </div>

                        <div className="listingBody">
                          <div className="listingTitleRow">
                            <strong>{listing.title || "آگهی بدون عنوان"}</strong>
                            <em className={`statusBadge ${statusClass(listing.status?.code)}`}>
                              {listing.status?.title || "در انتظار بررسی"}
                            </em>
                          </div>

                          <p>
                            {[listing.brand, listing.model, listing.year]
                              .filter(Boolean)
                              .join("، ") || "مشخصات خودرو ثبت نشده"}
                          </p>

                          <div className="listingMeta">
                            <span>{formatPrice(listing.price_toman)}</span>
                            <span>
                              {[listing.province, listing.city, listing.neighborhood]
                                .filter(Boolean)
                                .join("، ") || "موقعیت ثبت نشده"}
                            </span>
                            <span>{formatNumber(listing.image_count)} عکس</span>
                          </div>

                          <div className="listingOwner">
                            <b>
                              {listing.listing_owner_type === "dealer" ? "نمایشگاهی" : "شخصی"}
                            </b>
                            <span>{listing.seller_display_name || "چاکود"}</span>
                          </div>
                        </div>

                        <div className="listingActions">
                          <a href={`/listing/${listing.id}`}>نمایش</a>
                          <a href={`/dashboard/listings/${listing.id}`}>مدیریت</a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sideStack">
                <div className="panel">
                  <div className="panelHead">
                    <div>
                      <span>نمایشگاه‌های من</span>
                      <h2>دسترسی‌های نمایشگاهی</h2>
                    </div>
                    <a href="/dealers">مدیریت</a>
                  </div>

                  {dealers.length === 0 ? (
                    <div className="emptyBox">
                      هنوز عضو هیچ نمایشگاهی نیستید.
                      <br />
                      نمایشگاه خود را بسازید.
                    </div>
                  ) : (
                    <div className="dealerList">
                      {dealers.map((dealer) => (
                        <div className="dealerItem" key={dealer.id}>
                          <div>
                            <strong>{dealer.dealer_name || "نمایشگاه بدون نام"}</strong>
                            <span>
                              {[dealer.province, dealer.city, dealer.neighborhood]
                                .filter(Boolean)
                                .join("، ") || "موقعیت ثبت نشده"}
                            </span>
                          </div>
                          <div className="dealerRole">
                            <b>{dealer.role_title}</b>
                            {dealer.can_manage_team && <small>مدیریت تیم</small>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel">
                  <div className="panelHead">
                    <div>
                      <span>عملکرد تیم</span>
                      <h2>برترین اعضا</h2>
                    </div>
                  </div>

                  {teamPerformance.length === 0 ? (
                    <div className="emptyBox">هنوز داده‌ای برای عملکرد تیم وجود ندارد.</div>
                  ) : (
                    <div className="teamList">
                      {teamPerformance.map((member, index) => (
                        <div className="teamItem" key={member.auth_user_id}>
                          <div className="rank">{formatNumber(index + 1)}</div>
                          <div>
                            <strong>{member.display_name}</strong>
                            <span>
                              {formatNumber(member.total)} آگهی، {formatNumber(member.active)} فعال
                            </span>
                          </div>
                          <b>{formatNumber(member.pending)} در انتظار</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </section>

      <nav className="mobileBottomNav" aria-label="منوی موبایل داشبورد">
        <a href="/dashboard">
          <span>📊</span>
          <b>داشبورد</b>
        </a>
        <a href="/submit">
          <span>＋</span>
          <b>ثبت آگهی</b>
        </a>
        <a href="/dealers">
          <span>🏢</span>
          <b>نمایشگاه</b>
        </a>
        <a href="/account">
          <span>👤</span>
          <b>حساب</b>
        </a>
      </nav>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #f7f3ff;
        }

        .dashboardPage {
          min-height: 100vh;
          font-family: Tahoma, Arial, sans-serif;
          color: #211335;
          background:
            radial-gradient(circle at 88% 8%, rgba(124, 58, 237, 0.20), transparent 34%),
            radial-gradient(circle at 8% 42%, rgba(168, 85, 247, 0.12), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 44%, #ffffff 100%);
          padding: 24px;
        }

        .shell {
          width: min(1240px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          text-decoration: none;
          color: #211335;
        }

        .logoMark {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 900;
          box-shadow: 0 14px 30px rgba(109, 40, 217, 0.24);
        }

        .brand strong {
          display: block;
          font-size: 18px;
        }

        .brand span {
          display: block;
          margin-top: 3px;
          color: #7b6a91;
          font-size: 12px;
        }

        .navLinks {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .navLinks a {
          color: #6d28d9;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid #eadcff;
          border-radius: 999px;
          padding: 10px 14px;
          text-decoration: none;
          font-size: 13px;
          font-weight: bold;
        }

        .centerCard,
        .hero,
        .panel,
        .statCard,
        .quickAction {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #eadcff;
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.10);
          backdrop-filter: blur(12px);
        }

        .centerCard {
          width: min(620px, 100%);
          margin: 80px auto 0;
          text-align: center;
          border-radius: 34px;
          padding: 34px;
        }

        .hero {
          border-radius: 34px;
          padding: 34px;
          display: grid;
          grid-template-columns: 1fr 330px;
          gap: 24px;
          align-items: center;
          margin-bottom: 20px;
        }

        .miniLabel {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.45;
        }

        h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.7;
        }

        p {
          color: #6d5b83;
          line-height: 2.1;
          margin: 12px 0 0;
        }

        .heroPanel {
          border-radius: 28px;
          background: linear-gradient(135deg, #5b21b6, #9333ea);
          color: #fff;
          padding: 22px;
          display: grid;
          gap: 14px;
          box-shadow: 0 18px 44px rgba(109, 40, 217, 0.25);
        }

        .heroMetric {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.12);
          border-radius: 22px;
          padding: 16px;
        }

        .heroMetric span {
          display: block;
          opacity: 0.86;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .heroMetric strong {
          font-size: 30px;
        }

        .quickActions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .quickAction {
          border-radius: 26px;
          padding: 18px;
          text-decoration: none;
          color: #211335;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: 0.2s ease;
        }

        .quickAction:hover {
          transform: translateY(-2px);
          box-shadow: 0 26px 70px rgba(76, 29, 149, 0.14);
        }

        .quickAction > span {
          width: 46px;
          height: 46px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: #f4ecff;
          color: #6d28d9;
          font-size: 22px;
          flex: 0 0 auto;
        }

        .quickAction strong {
          display: block;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .quickAction small {
          color: #7b6a91;
          line-height: 1.8;
        }

        .primaryAction {
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
          border-color: transparent;
        }

        .primaryAction > span {
          background: rgba(255, 255, 255, 0.18);
          color: #fff;
        }

        .primaryAction small {
          color: rgba(255, 255, 255, 0.82);
        }

        .statsGrid {
          display: grid;
          grid-template-columns: 1.25fr repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .statCard {
          border-radius: 26px;
          padding: 22px;
        }

        .statMain {
          background:
            radial-gradient(circle at 90% 0%, rgba(255, 255, 255, 0.25), transparent 36%),
            linear-gradient(135deg, #3b0764, #6d28d9);
          color: #fff;
          border-color: transparent;
        }

        .statCard span {
          display: block;
          color: #7b6a91;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .statMain span,
        .statMain small {
          color: rgba(255, 255, 255, 0.78);
        }

        .statCard strong {
          display: block;
          font-size: 34px;
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .statCard small {
          color: #7b6a91;
          line-height: 1.8;
        }

        .analyticsGrid {
          display: grid;
          grid-template-columns: 1.3fr 0.9fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .panel {
          border-radius: 30px;
          padding: 26px;
          min-width: 0;
        }

        .largePanel {
          grid-row: span 2;
        }

        .panelHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .panelHead span {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .panelHead b,
        .panelHead a {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 9px 12px;
          text-decoration: none;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
        }

        .trendChart {
          height: 340px;
          display: grid;
          grid-template-columns: repeat(14, 1fr);
          gap: 9px;
          align-items: end;
          padding-top: 14px;
        }

        .trendItem {
          height: 100%;
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 8px;
          text-align: center;
          min-width: 0;
        }

        .trendBarBox {
          height: 100%;
          border-radius: 16px;
          background: #fbf8ff;
          border: 1px solid #f0e7ff;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }

        .trendBar {
          width: 100%;
          min-height: 6%;
          border-radius: 16px 16px 0 0;
          background: linear-gradient(180deg, #9333ea, #6d28d9);
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .trendBar span {
          color: #fff;
          font-size: 10px;
          margin-top: 7px;
          font-weight: bold;
        }

        .trendItem small {
          color: #7b6a91;
          font-size: 10px;
          white-space: nowrap;
        }

        .barList {
          display: grid;
          gap: 16px;
        }

        .barInfo {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 7px;
          font-size: 13px;
        }

        .barInfo span {
          color: #4c3b64;
        }

        .barInfo b {
          color: #211335;
        }

        .barTrack {
          height: 10px;
          background: #f2eaff;
          border-radius: 999px;
          overflow: hidden;
        }

        .barFill {
          height: 100%;
          min-width: 4px;
          border-radius: 999px;
          background: #8b5cf6;
        }

        .barFill.active {
          background: #16a34a;
        }

        .barFill.pending {
          background: #f59e0b;
        }

        .barFill.rejected {
          background: #e11d48;
        }

        .barFill.sold {
          background: #2563eb;
        }

        .barFill.inactive {
          background: #64748b;
        }

        .barFill.purple {
          background: linear-gradient(90deg, #6d28d9, #a855f7);
        }

        .dealerChart {
          display: grid;
          gap: 16px;
        }

        .dealerBar {
          display: grid;
          gap: 10px;
        }

        .dealerBar > div:first-child {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }

        .dealerBar strong {
          color: #211335;
        }

        .dealerBar span {
          color: #7b6a91;
        }

        .dealerTrack {
          height: 12px;
          border-radius: 999px;
          background: #f2eaff;
          overflow: hidden;
        }

        .dealerFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #7c3aed, #c084fc);
        }

        .managementGrid {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 20px;
          align-items: start;
        }

        .sideStack {
          display: grid;
          gap: 20px;
        }

        .listingList {
          display: grid;
          gap: 14px;
        }

        .listingItem {
          display: grid;
          grid-template-columns: 96px 1fr auto;
          gap: 14px;
          align-items: center;
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 24px;
          padding: 14px;
        }

        .listingImage {
          width: 96px;
          height: 82px;
          border-radius: 18px;
          overflow: hidden;
          background: #f4ecff;
          display: grid;
          place-items: center;
          color: #8b5cf6;
          font-size: 12px;
          text-align: center;
        }

        .listingImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .listingTitleRow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 6px;
        }

        .listingTitleRow strong {
          color: #211335;
          line-height: 1.7;
        }

        .statusBadge {
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-style: normal;
          white-space: nowrap;
        }

        .statusBadge.active {
          background: #dcfce7;
          color: #166534;
        }

        .statusBadge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .statusBadge.rejected {
          background: #ffe4e6;
          color: #be123c;
        }

        .statusBadge.sold {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .statusBadge.inactive {
          background: #f1f5f9;
          color: #475569;
        }

        .listingBody p {
          margin: 0 0 8px;
          font-size: 12px;
          color: #7b6a91;
        }

        .listingMeta,
        .listingOwner {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          color: #6d5b83;
          font-size: 12px;
          line-height: 1.9;
        }

        .listingMeta span,
        .listingOwner span,
        .listingOwner b {
          background: #fbf8ff;
          border: 1px solid #f0e7ff;
          border-radius: 999px;
          padding: 5px 9px;
        }

        .listingOwner b {
          color: #6d28d9;
        }

        .listingActions {
          display: grid;
          gap: 8px;
          min-width: 86px;
        }

        .listingActions a {
          text-decoration: none;
          text-align: center;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: bold;
        }

        .dealerList,
        .teamList {
          display: grid;
          gap: 12px;
        }

        .dealerItem,
        .teamItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 22px;
          padding: 14px;
        }

        .dealerItem strong,
        .teamItem strong {
          display: block;
          font-size: 13px;
          color: #211335;
          margin-bottom: 6px;
        }

        .dealerItem span,
        .teamItem span {
          display: block;
          color: #7b6a91;
          font-size: 11px;
          line-height: 1.8;
        }

        .dealerRole {
          display: grid;
          justify-items: end;
          gap: 6px;
        }

        .dealerRole b,
        .teamItem b {
          color: #6d28d9;
          background: #f4ecff;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          white-space: nowrap;
        }

        .dealerRole small {
          color: #166534;
          background: #dcfce7;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          white-space: nowrap;
        }

        .rank {
          width: 36px;
          height: 36px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: bold;
          flex: 0 0 auto;
        }

        .teamItem {
          justify-content: flex-start;
        }

        .teamItem > div:nth-child(2) {
          flex: 1;
        }

        .emptyBox {
          border: 1px dashed #d7c2ff;
          background: #fbf8ff;
          color: #7b6a91;
          border-radius: 22px;
          padding: 22px;
          text-align: center;
          line-height: 2;
          font-size: 13px;
        }

        .primaryLink,
        .secondaryBtn {
          border: 0;
          border-radius: 17px;
          padding: 13px 16px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          text-align: center;
          font-family: inherit;
        }

        .primaryLink {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .secondaryBtn {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
        }

        .centerActions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .loader {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 4px solid #eadcff;
          border-top-color: #6d28d9;
          margin: 0 auto 18px;
          animation: spin 0.85s linear infinite;
        }

        .mobileBottomNav {
          display: none;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .hero,
          .analyticsGrid,
          .managementGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .quickActions {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .dashboardPage {
            padding: 12px;
            padding-bottom: 94px;
          }

          .shell {
            width: 100%;
          }

          .topbar {
            position: sticky;
            top: 8px;
            z-index: 30;
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
            background: rgba(255, 255, 255, 0.86);
            backdrop-filter: blur(14px);
            border: 1px solid #eadcff;
            border-radius: 22px;
            padding: 10px;
            margin-bottom: 14px;
            box-shadow: 0 14px 40px rgba(76, 29, 149, 0.10);
          }

          .brand .logoMark {
            width: 42px;
            height: 42px;
            border-radius: 16px;
          }

          .brand strong {
            font-size: 16px;
          }

          .brand span {
            font-size: 11px;
          }

          .navLinks {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 2px;
            scrollbar-width: none;
          }

          .navLinks::-webkit-scrollbar {
            display: none;
          }

          .navLinks a {
            white-space: nowrap;
            padding: 9px 12px;
            font-size: 12px;
            min-height: 38px;
            display: inline-flex;
            align-items: center;
          }

          .centerCard,
          .hero,
          .panel,
          .statCard {
            border-radius: 24px;
            padding: 20px;
          }

          .centerCard {
            margin: 44px auto 0;
          }

          h1 {
            font-size: 27px;
          }

          h2 {
            font-size: 17px;
          }

          p {
            font-size: 13px;
            line-height: 2;
          }

          .hero {
            gap: 16px;
            margin-bottom: 14px;
          }

          .heroPanel {
            padding: 16px;
            border-radius: 22px;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .heroMetric {
            padding: 13px;
            border-radius: 18px;
          }

          .heroMetric strong {
            font-size: 23px;
          }

          .quickActions {
            display: flex;
            overflow-x: auto;
            gap: 10px;
            padding: 2px 2px 8px;
            margin-bottom: 14px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }

          .quickActions::-webkit-scrollbar {
            display: none;
          }

          .quickAction {
            min-width: 230px;
            scroll-snap-align: start;
            border-radius: 22px;
            padding: 15px;
          }

          .statsGrid {
            display: flex;
            overflow-x: auto;
            gap: 10px;
            padding: 2px 2px 8px;
            margin-bottom: 14px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }

          .statsGrid::-webkit-scrollbar {
            display: none;
          }

          .statCard {
            min-width: 210px;
            scroll-snap-align: start;
          }

          .largePanel {
            overflow-x: auto;
            scrollbar-width: thin;
          }

          .largePanel .panelHead {
            min-width: 640px;
          }

          .trendChart {
            min-width: 640px;
            height: 240px;
            grid-template-columns: repeat(14, 38px);
            gap: 7px;
            padding-bottom: 8px;
          }

          .managementGrid,
          .analyticsGrid,
          .sideStack {
            gap: 14px;
          }

          .listingItem {
            grid-template-columns: 1fr;
            padding: 12px;
            border-radius: 22px;
          }

          .listingImage {
            width: 100%;
            height: 185px;
            border-radius: 18px;
          }

          .listingTitleRow {
            align-items: flex-start;
            flex-direction: column;
          }

          .listingActions {
            grid-template-columns: repeat(2, 1fr);
          }

          .listingActions a {
            padding: 11px 10px;
          }

          .dealerItem {
            align-items: flex-start;
            flex-direction: column;
          }

          .dealerRole {
            justify-items: start;
          }

          .mobileBottomNav {
            position: fixed;
            right: 12px;
            left: 12px;
            bottom: 12px;
            z-index: 80;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            padding: 8px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid #eadcff;
            box-shadow: 0 18px 50px rgba(76, 29, 149, 0.18);
            backdrop-filter: blur(16px);
          }

          .mobileBottomNav a {
            text-decoration: none;
            color: #6d28d9;
            display: grid;
            place-items: center;
            gap: 3px;
            border-radius: 18px;
            padding: 8px 4px;
            min-height: 54px;
            background: #fbf8ff;
            border: 1px solid #f0e7ff;
            -webkit-tap-highlight-color: transparent;
          }

          .mobileBottomNav span {
            font-size: 18px;
            line-height: 1;
          }

          .mobileBottomNav b {
            font-size: 10px;
            line-height: 1.5;
          }

          .mobileBottomNav a:first-child {
            color: #fff;
            background: linear-gradient(135deg, #6d28d9, #9333ea);
            border-color: transparent;
          }
        }
      `}</style>
    </main>
  );
}