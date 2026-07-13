"use client";

import { useEffect, useState } from "react";

const API_BASE = "https://api.chakod.com";

type User = {
  id?: number;
  mobile?: string;
  full_name?: string | null;
  account_type?: "personal" | "dealer" | "business";
  business_name?: string | null;
  display_name?: string;
  profile_completed?: boolean;
  mobile_verified?: boolean;
  accepted_terms?: boolean;
};

type DashboardStats = {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  inactive: number;
  sold: number;
};

type DashboardResponse = {
  success: boolean;
  message?: string;
  user?: User;
  stats?: Partial<DashboardStats>;
  dealers?: any[];
  recent_listings?: any[];
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

function maskMobile(mobile?: string) {
  if (!mobile) return "ثبت نشده";
  if (mobile.length < 8) return mobile;
  return `${mobile.slice(0, 4)}****${mobile.slice(-3)}`;
}

function accountTypeTitle(type?: string) {
  if (type === "dealer" || type === "business") return "نمایشگاهی";
  return "شخصی";
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    inactive: 0,
    sold: 0,
  });
  const [dealerCount, setDealerCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [error, setError] = useState("");

  async function loadAccount() {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      const meRes = await fetch(`${API_BASE}/api/me.php`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const meJson = await meRes.json();

      if (!meJson.success || !meJson.logged_in || !meJson.user) {
        setLoggedIn(false);
        setUser(null);
        return;
      }

      setLoggedIn(true);
      setUser(meJson.user);
      localStorage.setItem("chakod_user", JSON.stringify(meJson.user));

      try {
        const dashRes = await fetch(`${API_BASE}/api/dashboard-summary.php`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const dashJson: DashboardResponse = await dashRes.json();

        if (dashJson.success) {
          setStats({
            total: Number(dashJson.stats?.total || 0),
            active: Number(dashJson.stats?.active || 0),
            pending: Number(dashJson.stats?.pending || 0),
            rejected: Number(dashJson.stats?.rejected || 0),
            inactive: Number(dashJson.stats?.inactive || 0),
            sold: Number(dashJson.stats?.sold || 0),
          });

          setDealerCount(Array.isArray(dashJson.dealers) ? dashJson.dealers.length : 0);
          setRecentCount(Array.isArray(dashJson.recent_listings) ? dashJson.recent_listings.length : 0);
        }
      } catch {
        // اگر داشبورد خطا داد، خود صفحه حساب باز بماند.
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setLoggedIn(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("chakod_session_token");
    localStorage.removeItem("chakod_user");
    window.location.href = "/";
  }

  useEffect(() => {
    loadAccount();
  }, []);

  const displayName =
    user?.display_name ||
    user?.full_name ||
    user?.business_name ||
    user?.mobile ||
    "کاربر چاکود";

  return (
    <main className="accountPage" dir="rtl">
      <section className="shell">
        <header className="topbar">
          <a href="/" className="brand">
            <div className="logoMark">چ</div>
            <div>
              <strong>چاکود</strong>
              <span>ناحیه کاربری و مدیریت</span>
            </div>
          </a>

          <nav className="navLinks">
            <a href="/">خانه</a>
            <a href="/dashboard">داشبورد</a>
            <a href="/submit">ثبت آگهی</a>
            <a href="/dealers">نمایشگاه</a>
          </nav>
        </header>

        {loading && (
          <div className="centerCard">
            <div className="loader" />
            <h1>در حال آماده‌سازی ناحیه کاربری...</h1>
            <p>اطلاعات حساب، آگهی‌ها و نمایشگاه‌ها در حال دریافت است.</p>
          </div>
        )}

        {!loading && !loggedIn && (
          <div className="centerCard">
            <span className="miniLabel">ناحیه کاربری</span>
            <h1>برای مدیریت حساب وارد شوید</h1>
            <p>
              برای مشاهده داشبورد، آگهی‌های من، نمایشگاه‌ها و تیم نمایشگاه ابتدا وارد حساب کاربری شوید.
            </p>
            <a className="primaryLink" href="/login">
              ورود با شماره موبایل
            </a>
            {error && <div className="message error">{error}</div>}
          </div>
        )}

        {!loading && loggedIn && user && (
          <>
            <section className="hero">
              <div>
                <span className="miniLabel">مرکز مدیریت حساب</span>
                <h1>سلام، {displayName} 👑</h1>
                <p>
                  از اینجا می‌توانید وارد داشبورد مدیریتی شوید، آگهی‌های خود را ببینید، نمایشگاه بسازید،
                  اعضای تیم را مدیریت کنید و آگهی جدید ثبت کنید.
                </p>
              </div>

              <div className="profileCard">
                <div className="avatarBox">👑</div>
                <strong>{displayName}</strong>
                <span>{maskMobile(user.mobile)}</span>

                <div className="profileRows">
                  <div>
                    <small>نوع حساب</small>
                    <b>{accountTypeTitle(user.account_type)}</b>
                  </div>
                  <div>
                    <small>وضعیت موبایل</small>
                    <b>{user.mobile_verified === false ? "نیازمند تأیید" : "تأیید شده"}</b>
                  </div>
                  <div>
                    <small>نمایشگاه‌ها</small>
                    <b>{formatNumber(dealerCount)}</b>
                  </div>
                </div>

                <button className="dangerBtn" onClick={logout}>
                  خروج از حساب
                </button>
              </div>
            </section>

            <section className="mainActions">
              <a href="/dashboard" className="actionCard primaryAction">
                <span>📊</span>
                <div>
                  <strong>داشبورد مدیریتی</strong>
                  <p>آمار، نمودارها، وضعیت آگهی‌ها و عملکرد نمایشگاه</p>
                </div>
              </a>

              <a href="/dashboard#recentListings" className="actionCard">
                <span>📋</span>
                <div>
                  <strong>آگهی‌های من</strong>
                  <p>مشاهده و مدیریت آگهی‌های شخصی و نمایشگاهی</p>
                </div>
              </a>

              <a href="/submit" className="actionCard">
                <span>＋</span>
                <div>
                  <strong>ثبت آگهی جدید</strong>
                  <p>ثبت آگهی شخصی یا آگهی به نام نمایشگاه</p>
                </div>
              </a>

              <a href="/dealers" className="actionCard">
                <span>🏢</span>
                <div>
                  <strong>نمایشگاه و تیم</strong>
                  <p>افزودن نمایشگاه، دعوت کارمند و مدیریت نقش‌ها</p>
                </div>
              </a>
            </section>

            <section className="statsGrid">
              <div className="statCard main">
                <span>کل آگهی‌ها</span>
                <strong>{formatNumber(stats.total)}</strong>
                <small>شخصی + نمایشگاهی</small>
              </div>

              <div className="statCard">
                <span>فعال</span>
                <strong>{formatNumber(stats.active)}</strong>
                <small>منتشر شده</small>
              </div>

              <div className="statCard">
                <span>در انتظار بررسی</span>
                <strong>{formatNumber(stats.pending)}</strong>
                <small>نیازمند تأیید چاکود</small>
              </div>

              <div className="statCard">
                <span>فروخته‌شده</span>
                <strong>{formatNumber(stats.sold)}</strong>
                <small>آگهی‌های موفق</small>
              </div>
            </section>

            <section className="managementGrid">
              <div className="panel">
                <div className="panelHead">
                  <div>
                    <span>مسیر پیشنهادی</span>
                    <h2>از کجا مدیریت را شروع کنم؟</h2>
                  </div>
                </div>

                <div className="guideList">
                  <div>
                    <b>۱</b>
                    <div>
                      <strong>داشبورد را باز کن</strong>
                      <span>برای دیدن آمار، نمودارها و آگهی‌های اخیر.</span>
                    </div>
                    <a href="/dashboard">رفتن</a>
                  </div>

                  <div>
                    <b>۲</b>
                    <div>
                      <strong>نمایشگاه را مدیریت کن</strong>
                      <span>اگر نمایشگاه داری، اعضای تیم و نقش‌ها را تنظیم کن.</span>
                    </div>
                    <a href="/dealers">رفتن</a>
                  </div>

                  <div>
                    <b>۳</b>
                    <div>
                      <strong>آگهی جدید ثبت کن</strong>
                      <span>انتخاب کن آگهی شخصی باشد یا به نام نمایشگاه.</span>
                    </div>
                    <a href="/submit">ثبت</a>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panelHead">
                  <div>
                    <span>خلاصه فعالیت</span>
                    <h2>وضعیت فعلی حساب</h2>
                  </div>
                </div>

                <div className="activityBox">
                  <div>
                    <span>آگهی‌های اخیر داشبورد</span>
                    <strong>{formatNumber(recentCount)}</strong>
                  </div>
                  <div>
                    <span>نمایشگاه‌های قابل مدیریت</span>
                    <strong>{formatNumber(dealerCount)}</strong>
                  </div>
                  <div>
                    <span>آگهی‌های نیازمند توجه</span>
                    <strong>{formatNumber(stats.pending + stats.rejected + stats.inactive)}</strong>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </section>

      <nav className="mobileBottomNav" aria-label="منوی موبایل حساب">
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
          background: #faf7ff;
        }

        .accountPage {
          min-height: 100vh;
          font-family: Tahoma, Arial, sans-serif;
          color: #211335;
          background:
            radial-gradient(circle at 86% 8%, rgba(124, 58, 237, 0.18), transparent 34%),
            radial-gradient(circle at 8% 46%, rgba(168, 85, 247, 0.12), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 48%, #ffffff 100%);
          padding: 24px;
        }

        .shell {
          width: min(1180px, 100%);
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
        .profileCard,
        .actionCard,
        .statCard,
        .panel {
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

        .profileCard {
          border-radius: 30px;
          padding: 24px;
          text-align: center;
        }

        .avatarBox {
          width: 66px;
          height: 66px;
          margin: 0 auto 14px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          font-size: 28px;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
        }

        .profileCard strong {
          display: block;
          font-size: 20px;
          margin-bottom: 8px;
        }

        .profileCard > span {
          color: #7b6a91;
          display: block;
          margin-bottom: 18px;
        }

        .profileRows {
          display: grid;
          gap: 10px;
          margin-bottom: 16px;
        }

        .profileRows div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #f0e7ff;
          padding-bottom: 10px;
        }

        .profileRows small {
          color: #7b6a91;
        }

        .profileRows b {
          color: #211335;
        }

        .mainActions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .actionCard {
          border-radius: 26px;
          padding: 18px;
          text-decoration: none;
          color: #211335;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          transition: 0.2s ease;
        }

        .actionCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 26px 70px rgba(76, 29, 149, 0.14);
        }

        .actionCard > span {
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

        .actionCard strong {
          display: block;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .actionCard p {
          margin: 0;
          color: #7b6a91;
          font-size: 12px;
          line-height: 1.9;
        }

        .primaryAction {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          border-color: transparent;
        }

        .primaryAction > span {
          color: #fff;
          background: rgba(255, 255, 255, 0.18);
        }

        .primaryAction p {
          color: rgba(255, 255, 255, 0.84);
        }

        .statsGrid {
          display: grid;
          grid-template-columns: 1.25fr repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .statCard {
          border-radius: 26px;
          padding: 22px;
        }

        .statCard.main {
          color: #fff;
          border-color: transparent;
          background:
            radial-gradient(circle at 90% 0%, rgba(255, 255, 255, 0.25), transparent 34%),
            linear-gradient(135deg, #3b0764, #7c3aed);
        }

        .statCard span {
          display: block;
          color: #7b6a91;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .statCard.main span,
        .statCard.main small {
          color: rgba(255, 255, 255, 0.82);
        }

        .statCard strong {
          display: block;
          font-size: 32px;
          margin-bottom: 8px;
        }

        .statCard small {
          color: #7b6a91;
          line-height: 1.8;
        }

        .managementGrid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
          align-items: start;
        }

        .panel {
          border-radius: 30px;
          padding: 26px;
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

        .guideList {
          display: grid;
          gap: 12px;
        }

        .guideList > div {
          display: grid;
          grid-template-columns: 40px 1fr auto;
          gap: 12px;
          align-items: center;
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 22px;
          padding: 14px;
        }

        .guideList b {
          width: 40px;
          height: 40px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
        }

        .guideList strong {
          display: block;
          color: #211335;
          margin-bottom: 5px;
        }

        .guideList span {
          color: #7b6a91;
          font-size: 12px;
          line-height: 1.9;
        }

        .guideList a {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 9px 12px;
          text-decoration: none;
          font-size: 12px;
          font-weight: bold;
        }

        .activityBox {
          display: grid;
          gap: 12px;
        }

        .activityBox div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 20px;
          padding: 15px;
        }

        .activityBox span {
          color: #7b6a91;
          font-size: 13px;
        }

        .activityBox strong {
          color: #6d28d9;
          font-size: 20px;
        }

        .primaryLink,
        .dangerBtn {
          width: 100%;
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

        .dangerBtn {
          color: #be123c;
          background: #fff1f2;
          border: 1px solid #fecdd3;
        }

        .message {
          margin-top: 16px;
          border-radius: 16px;
          padding: 13px;
          font-size: 13px;
          line-height: 1.9;
        }

        .error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
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

        @media (max-width: 1050px) {
          .hero,
          .managementGrid {
            grid-template-columns: 1fr;
          }

          .mainActions,
          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .accountPage {
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
          .profileCard,
          .panel,
          .statCard,
          .actionCard {
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
            gap: 14px;
            margin-bottom: 14px;
          }

          .mainActions {
            display: flex;
            overflow-x: auto;
            gap: 10px;
            padding: 2px 2px 8px;
            margin-bottom: 14px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }

          .mainActions::-webkit-scrollbar {
            display: none;
          }

          .actionCard {
            min-width: 245px;
            scroll-snap-align: start;
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

          .managementGrid {
            gap: 14px;
          }

          .guideList > div {
            grid-template-columns: 40px 1fr;
          }

          .guideList a {
            grid-column: 1 / -1;
            text-align: center;
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

          .mobileBottomNav a:nth-child(4) {
            color: #fff;
            background: linear-gradient(135deg, #6d28d9, #9333ea);
            border-color: transparent;
          }
        }
      `}</style>
    </main>
  );
}