"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../components/MobileBottomNav";
import styles from "./page.module.css";

type AccountUser = {
  id?: number;
  mobile?: string;
  full_name?: string | null;
  display_name?: string | null;
  business_name?: string | null;
  business_city?: string | null;
  business_location_label?: string | null;
  account_type?: "personal" | "dealer" | "parts_store" | "repair_shop" | "car_service" | "business" | string;
  profile_completed?: boolean;
  phone_verified?: boolean;
  mobile_verified?: boolean;
};

type Stats = {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  inactive: number;
  sold: number;
};

type MeResponse = {
  success?: boolean;
  logged_in?: boolean;
  message?: string;
  user?: AccountUser | null;
};

type DashboardResponse = {
  success?: boolean;
  message?: string;
  stats?: Partial<Stats>;
  dealers?: unknown[];
};

const EMPTY_STATS: Stats = {
  total: 0,
  active: 0,
  pending: 0,
  rejected: 0,
  inactive: 0,
  sold: 0,
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function clearAuth() {
  localStorage.removeItem("chakod_session_token");
  localStorage.removeItem("chakod_user");
  localStorage.removeItem("chakod_identity");
}

function readCachedUser(): AccountUser | null {
  try {
    const raw = localStorage.getItem("chakod_user");
    return raw ? (JSON.parse(raw) as AccountUser) : null;
  } catch {
    return null;
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function maskMobile(value?: string) {
  const mobile = String(value || "").trim();
  if (!mobile) return "شماره ثبت نشده";
  if (mobile.length < 8) return mobile;
  return `${mobile.slice(0, 4)}••••${mobile.slice(-3)}`;
}

function accountTypeLabel(type?: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "خدمات خودرو";
  if (type === "business") return "کسب‌وکار";
  return "حساب شخصی";
}

function isBusinessAccount(type?: string) {
  return Boolean(type && type !== "personal");
}

function Icon({ name }: { name: "list" | "plus" | "bookmark" | "chart" | "profile" | "store" | "shield" | "chevron" }) {
  const paths = {
    list: <><path d="M7 6h12M7 12h12M7 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bookmark: <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v14L12 16.4 5.5 20V6A1.5 1.5 0 0 1 7 4.5Z" />,
    chart: <><path d="M5 19V9M12 19V5M19 19v-7" /><path d="M3.5 19.5h17" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5" /></>,
    store: <><path d="M4 10h16l-1.5-5h-13L4 10Z" /><path d="M5.5 10v9h13v-9M9 19v-5h6v5" /></>,
    shield: <><path d="M12 3.8 19 7v4.8c0 4.1-2.4 7-7 8.4-4.6-1.4-7-4.3-7-8.4V7l7-3.2Z" /><path d="m9 12 2 2 4-4" /></>,
    chevron: <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function AccountV2Page() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [dealerCount, setDealerCount] = useState(0);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    document.body.dataset.chakodAccountV2 = "true";
    return () => {
      delete document.body.dataset.chakodAccountV2;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const token = getToken();
      const cached = readCachedUser();

      if (cached) setUser(cached);

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const meResponse = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const me = await readJson<MeResponse>(meResponse);

        if (meResponse.status === 401 || meResponse.status === 403 || me?.logged_in === false) {
          clearAuth();
          setUser(null);
          setError("نشست شما منقضی شده است. دوباره وارد شوید.");
          return;
        }

        if (meResponse.ok && me?.success && me.user) {
          setUser(me.user);
          localStorage.setItem("chakod_user", JSON.stringify(me.user));
        } else if (!cached) {
          setError(me?.message || "اطلاعات حساب دریافت نشد.");
        }

        try {
          const dashboardResponse = await fetch("/api/auth/dashboard-summary", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
            headers: { Accept: "application/json", ...authHeaders() },
          });
          const dashboard = await readJson<DashboardResponse>(dashboardResponse);

          if (dashboardResponse.ok && dashboard?.success) {
            setStats({
              total: Number(dashboard.stats?.total || 0),
              active: Number(dashboard.stats?.active || 0),
              pending: Number(dashboard.stats?.pending || 0),
              rejected: Number(dashboard.stats?.rejected || 0),
              inactive: Number(dashboard.stats?.inactive || 0),
              sold: Number(dashboard.stats?.sold || 0),
            });
            setDealerCount(Array.isArray(dashboard.dealers) ? dashboard.dealers.length : 0);
          }
        } catch {
          // خلاصه آماری برای نمایش صفحه ضروری نیست.
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        if (!cached) setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.business_name || user.display_name || user.full_name || "کاربر چاکود";
  }, [user]);

  const business = isBusinessAccount(user?.account_type);
  const verified = Boolean(user?.phone_verified || user?.mobile_verified);
  const profileReady = Boolean(user?.profile_completed);
  const location = user?.business_location_label || user?.business_city || "";
  const hasActivity = stats.total > 0 || dealerCount > 0;

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({}),
      });
    } catch {
      // خروج محلی حتی در قطعی API انجام می‌شود.
    } finally {
      clearAuth();
      window.dispatchEvent(new Event("chakod:auth-changed"));
      window.location.assign("/");
    }
  }

  if (loading && !user) {
    return (
      <main className={styles.statePage} dir="rtl">
        <span className={styles.loader} />
        <strong>در حال آماده‌سازی حساب…</strong>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.statePage} dir="rtl">
        <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        <section className={styles.loginCard}>
          <h1>حساب چاکود</h1>
          <p>{error || "برای مدیریت آگهی‌ها و حساب خود وارد شوید."}</p>
          <Link href="/login">ورود با شماره موبایل</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.logoLink} aria-label="خانه چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
          <button type="button" className={styles.logout} onClick={() => void logout()} disabled={loggingOut}>
            {loggingOut ? "…" : "خروج"}
          </button>
        </header>

        {error ? <div className={styles.notice}>{error}</div> : null}

        <section className={styles.identityCard}>
          <div className={styles.identityTop}>
            <div className={styles.avatar}>{displayName.trim().charAt(0) || "چ"}</div>
            <div className={styles.identityCopy}>
              <span className={styles.accountType}>{accountTypeLabel(user.account_type)}</span>
              <h1>{displayName}</h1>
              <p>{maskMobile(user.mobile)}{location ? ` · ${location}` : ""}</p>
            </div>
          </div>

          <div className={styles.statusRow}>
            <span className={verified ? styles.goodStatus : styles.warnStatus}>
              <Icon name="shield" />
              {verified ? "شماره تأیید شده" : "شماره نیازمند تأیید"}
            </span>
            <span className={profileReady ? styles.goodStatus : styles.warnStatus}>
              <Icon name="profile" />
              {profileReady ? "پروفایل آماده" : "پروفایل ناقص"}
            </span>
          </div>
        </section>

        <section className={styles.primaryAction}>
          <div>
            <span>کار اصلی</span>
            <h2>{stats.total > 0 ? "آگهی بعدی‌ات را ثبت کن" : "اولین آگهی‌ات را ثبت کن"}</h2>
            <p>ثبت خودرو کوتاه و مرحله‌ای انجام می‌شود.</p>
          </div>
          <Link href="/account/listings/new">
            <Icon name="plus" />
            ثبت آگهی
          </Link>
        </section>

        <section className={styles.stats} aria-label="وضعیت آگهی‌ها">
          <div><strong>{formatNumber(stats.active)}</strong><span>فعال</span></div>
          <div><strong>{formatNumber(stats.pending)}</strong><span>در بررسی</span></div>
          <div><strong>{formatNumber(stats.total)}</strong><span>همه آگهی‌ها</span></div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>دسترسی سریع</h2>
          </div>
          <div className={styles.quickGrid}>
            <Link href="/account/listings" className={styles.quickCard}>
              <span className={styles.quickIcon}><Icon name="list" /></span>
              <span><strong>آگهی‌های من</strong><small>مشاهده و مدیریت</small></span>
              <Icon name="chevron" />
            </Link>
            <Link href="/account/saved" className={styles.quickCard}>
              <span className={styles.quickIcon}><Icon name="bookmark" /></span>
              <span><strong>نشان‌شده‌ها</strong><small>ذخیره‌های شما</small></span>
              <Icon name="chevron" />
            </Link>
            <Link href="/dashboard" className={styles.quickCard}>
              <span className={styles.quickIcon}><Icon name="chart" /></span>
              <span><strong>داشبورد</strong><small>آمار و وضعیت</small></span>
              <Icon name="chevron" />
            </Link>
            <Link href="/account?complete=1" className={styles.quickCard}>
              <span className={styles.quickIcon}><Icon name="profile" /></span>
              <span><strong>اطلاعات حساب</strong><small>ویرایش مشخصات پایه</small></span>
              <Icon name="chevron" />
            </Link>
          </div>
        </section>

        {business ? (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2>مدیریت مجموعه</h2>
                <p>اطلاعات عمومی کسب‌وکار جدا از صفحه حساب مدیریت می‌شود.</p>
              </div>
            </div>
            <Link href="/account?setup=business#professional-profile" className={styles.businessCard}>
              <span className={styles.businessIcon}><Icon name="store" /></span>
              <span className={styles.businessCopy}>
                <strong>{user.business_name || "پروفایل مجموعه"}</strong>
                <small>{profileReady ? "ویرایش صفحه عمومی، تماس و موقعیت" : "اطلاعات مجموعه را تکمیل کنید"}</small>
              </span>
              <span className={styles.businessState}>{profileReady ? "آماده" : "تکمیل"}</span>
              <Icon name="chevron" />
            </Link>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHead}><h2>حساب و پشتیبانی</h2></div>
          <div className={styles.simpleList}>
            <Link href="/support">
              <span><strong>پشتیبانی چاکود</strong><small>پیگیری درخواست یا گزارش مشکل</small></span>
              <Icon name="chevron" />
            </Link>
            <Link href="/account/ads">
              <span><strong>تبلیغات و دیده‌شدن</strong><small>{hasActivity ? "مدیریت تبلیغات حساب" : "بعد از شروع فعالیت فعال می‌شود"}</small></span>
              <Icon name="chevron" />
            </Link>
          </div>
        </section>

        <div className={styles.bottomSpace} />
      </div>

      <MobileBottomNav />
    </main>
  );
}
