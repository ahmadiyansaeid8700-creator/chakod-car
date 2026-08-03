"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import MobileBottomNav from "../components/MobileBottomNav";
import ProfileEditor, { type AccountUser } from "./ProfileEditor";
import ProfessionalProfileEditor from "./ProfessionalProfileEditor";
import styles from "./page.module.css";

const LOCAL_DEV_SESSION_TOKEN = "chakod-local-dev-session";
const IS_LOCAL_DEV = process.env.NODE_ENV === "development";

type User = AccountUser;

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
  dealers?: unknown[];
};

type MeResponse = {
  success?: boolean;
  logged_in?: boolean;
  message?: string;
  user?: User | null;
};

type IconProps = { children: ReactNode };

function IconFrame({ children }: IconProps) {
  return <span className={styles.iconFrame}>{children}</span>;
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v7H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 15h6v5H4z" />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v14L12 16.3 5.5 20V6A1.5 1.5 0 0 1 7 4.5Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
    </svg>
  );
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      }
    : {};
}

function clearLocalAuth() {
  localStorage.removeItem("chakod_session_token");
  localStorage.removeItem("chakod_user");
  localStorage.removeItem("chakod_identity");
}

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem("chakod_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function getLocalDevelopmentUser(): User {
  const fallback: User = {
    id: 0,
    mobile: "09120000000",
    full_name: null,
    account_type: "personal",
    business_name: null,
    business_city: null,
    business_location_mode: null,
    business_location_label: null,
    business_location_scopes: null,
    display_name: "کاربر آزمایشی چاکود",
    profile_completed: false,
    phone_verified: true,
    mobile_verified: true,
    terms_accepted: true,
    accepted_terms: true,
  };

  try {
    const raw = localStorage.getItem("chakod_user");
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as User) };
  } catch {
    return fallback;
  }
}

function normalizeUser(user: User): User {
  const fullNameOk = Boolean(user.full_name?.trim().length && user.full_name.trim().length >= 2);
  const type = user.account_type || "personal";
  const businessOk =
    type === "personal" ||
    Boolean(user.business_name?.trim().length && user.business_name.trim().length >= 2);
  const businessLocationOk =
    type === "personal" ||
    Boolean(
      user.business_location_label?.trim().length ||
      user.business_city?.trim().length,
    );

  return {
    ...user,
    phone_verified: user.phone_verified ?? user.mobile_verified ?? false,
    mobile_verified: user.mobile_verified ?? user.phone_verified ?? false,
    terms_accepted: user.terms_accepted ?? user.accepted_terms ?? false,
    accepted_terms: user.accepted_terms ?? user.terms_accepted ?? false,
    profile_completed:
      type === "business" ? false : fullNameOk && businessOk && businessLocationOk,
  };
}

async function readApiResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function formatNumber(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("fa-IR") : "۰";
}

function maskMobile(mobile?: string) {
  if (!mobile) return "ثبت نشده";
  if (mobile.length < 8) return mobile;
  return `${mobile.slice(0, 4)}****${mobile.slice(-3)}`;
}

function accountTypeTitle(type?: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات و لوازم خودرو";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  if (type === "business") return "نیازمند تعیین نوع";
  return "شخصی";
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasLocalSession, setHasLocalSession] = useState(false);
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
  const [error, setError] = useState("");
  const [forceProfileOpen, setForceProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function loadAccount() {
    setLoading(true);
    setError("");

    const token = getToken();
    const cachedUser = readCachedUser();
    setHasLocalSession(Boolean(token));

    if (!token) {
      setLoggedIn(false);
      setUser(null);
      setLoading(false);
      return;
    }

    if (cachedUser) {
      setLoggedIn(true);
      setUser(normalizeUser(cachedUser));
    }

    if (IS_LOCAL_DEV && token === LOCAL_DEV_SESSION_TOKEN) {
      const localUser = normalizeUser(getLocalDevelopmentUser());
      setLoggedIn(true);
      setUser(localUser);
      setStats({ total: 4, active: 2, pending: 1, rejected: 0, inactive: 0, sold: 1 });
      setDealerCount(localUser.account_type === "dealer" ? 1 : 0);
      setLoading(false);
      return;
    }

    try {
      const meResponse = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const meResult = await readApiResponse<MeResponse>(meResponse);

      if (!meResult) {
        throw new Error("INVALID_RESPONSE");
      }

      const sessionRejected =
        meResponse.status === 401 ||
        meResponse.status === 403 ||
        meResult.logged_in === false;

      if (sessionRejected) {
        clearLocalAuth();
        setHasLocalSession(false);
        setLoggedIn(false);
        setUser(null);
        setError(meResult.message || "نشست شما منقضی شده است. دوباره وارد شوید.");
        return;
      }

      if (!meResponse.ok || !meResult.success || !meResult.user) {
        setError(meResult.message || "بررسی نشست فعلاً انجام نشد. اطلاعات ذخیره‌شده نمایش داده می‌شود.");

        if (!cachedUser) {
          setLoggedIn(false);
          setUser(null);
        }
        return;
      }

      const normalizedUser = normalizeUser(meResult.user);
      setLoggedIn(true);
      setUser(normalizedUser);
      localStorage.setItem("chakod_user", JSON.stringify(normalizedUser));

      try {
        const dashboardResponse = await fetch("/api/auth/dashboard-summary", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const dashboardResult = await readApiResponse<DashboardResponse>(dashboardResponse);

        if (dashboardResponse.ok && dashboardResult?.success) {
          setStats({
            total: Number(dashboardResult.stats?.total || 0),
            active: Number(dashboardResult.stats?.active || 0),
            pending: Number(dashboardResult.stats?.pending || 0),
            rejected: Number(dashboardResult.stats?.rejected || 0),
            inactive: Number(dashboardResult.stats?.inactive || 0),
            sold: Number(dashboardResult.stats?.sold || 0),
          });
          setDealerCount(Array.isArray(dashboardResult.dealers) ? dashboardResult.dealers.length : 0);
        }
      } catch {
        // خطای خلاصه داشبورد نباید صفحه حساب را از دسترس خارج کند.
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد. نشست محلی حفظ شده و می‌توانید دوباره تلاش کنید.");

      if (!cachedUser) {
        setLoggedIn(false);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const token = getToken();

    try {
      if (!(IS_LOCAL_DEV && token === LOCAL_DEV_SESSION_TOKEN)) {
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
      }
    } catch {
      // خروج محلی حتی در زمان قطع API انجام می‌شود.
    } finally {
      clearLocalAuth();
      window.dispatchEvent(new Event("chakod:auth-changed"));
      window.location.assign("/");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForceProfileOpen(params.get("complete") === "1" || params.get("setup") === "business");
    void loadAccount();
  }, []);

  const displayName =
    user?.display_name || user?.full_name || user?.business_name || user?.mobile || "کاربر چاکود";
  const hasStartedActivity = stats.total > 0 || dealerCount > 0;
  const showOnboarding = Boolean(user && (!user.profile_completed || !hasStartedActivity));
  const isPartsStore = user?.account_type === "parts_store";
  const isRepairShop = user?.account_type === "repair_shop";
  const isCarService = user?.account_type === "car_service";
  const isBusinessDirectoryAccount = isPartsStore || isRepairShop || isCarService;

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده‌سازی حساب</h1>
            <p>اطلاعات حساب و آگهی‌های شما در حال دریافت است.</p>
          </section>
        )}

        {!loading && !loggedIn && (
          <section className={styles.stateCard}>
            <span className={styles.eyebrow}>ناحیه کاربری</span>
            <h1>{hasLocalSession ? "بررسی نشست انجام نشد" : "برای مدیریت حساب وارد شوید"}</h1>
            <p>
              {hasLocalSession
                ? "توکن ورود روی دستگاه وجود دارد، اما پاسخ سرور دریافت نشد. دوباره بررسی کنید."
                : "آگهی‌ها، نشان‌شده‌ها و مشخصات حساب بعد از ورود در دسترس قرار می‌گیرند."}
            </p>
            {!hasLocalSession && (
              <a className={styles.primaryButton} href="/login">ورود با شماره موبایل</a>
            )}
            {error && <div className={styles.errorMessage}>{error}</div>}
            {(error || hasLocalSession) && (
              <button className={styles.secondaryButton} type="button" onClick={() => void loadAccount()}>
                بررسی دوباره
              </button>
            )}
          </section>
        )}

        {!loading && loggedIn && user && (
          <>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <section className={styles.overview}>
              <div className={styles.welcomeBlock}>
                <Link className={styles.brandLink} href="/" aria-label="صفحه اصلی چاکود">
                  <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
                </Link>
                <h1>سلام، {displayName}</h1>
                <p>پروفایل، آگهی‌ها و فعالیت‌های حرفه‌ای خود را یک‌جا مدیریت کنید.</p>
                <div className={styles.welcomeBadges}>
                  <span>{accountTypeTitle(user.account_type)}</span>
                  <span className={user.profile_completed ? styles.successBadge : styles.warningBadge}>
                    {user.profile_completed ? "پروفایل کامل" : "پروفایل ناقص"}
                  </span>
                  {user.account_type !== "personal" &&
                    (user.business_location_label || user.business_city) && (
                    <span>{user.business_location_label || user.business_city}</span>
                  )}
                </div>
              </div>

              <div className={styles.profileSummary}>
                <div className={styles.avatar}>چ</div>
                <div className={styles.profileIdentity}>
                  <strong>{displayName}</strong>
                  <span>{maskMobile(user.mobile)}</span>
                </div>
                <div className={styles.profileMeta}>
                  <div>
                    <small>موبایل</small>
                    <b>{user.phone_verified || user.mobile_verified ? "تأیید شده" : "تأیید نشده"}</b>
                  </div>
                  <div>
                    <small>آگهی‌ها</small>
                    <b>{formatNumber(stats.total)}</b>
                  </div>
                </div>
                <button
                  className={styles.logoutButton}
                  type="button"
                  disabled={loggingOut}
                  onClick={() => void logout()}
                >
                  {loggingOut ? "در حال خروج" : "خروج"}
                </button>
              </div>
            </section>

            <ProfileEditor
              user={user}
              forceOpen={forceProfileOpen || user.profile_completed === false}
              onSaved={(nextUser) => {
                const normalizedUser = normalizeUser(nextUser);
                setUser(normalizedUser);
                setForceProfileOpen(false);
              }}
            />

            {user.profile_completed && user.account_type !== "personal" && user.account_type !== "business" && (
              <ProfessionalProfileEditor
                user={user}
                onUserUpdated={(nextUser) => {
                  setUser(normalizeUser({ ...user, ...nextUser }));
                }}
              />
            )}

            <section className={styles.actionGrid} aria-label="دسترسی‌های سریع">
              <a className={`${styles.actionCard} ${styles.actionCardPrimary}`} href="/dashboard">
                <IconFrame><DashboardIcon /></IconFrame>
                <div><strong>داشبورد مدیریتی</strong><span>آمار و وضعیت حساب</span></div>
                <span className={styles.cardArrow}><ArrowIcon /></span>
              </a>
              <a className={styles.actionCard} href="/dashboard/listings">
                <IconFrame><ListingsIcon /></IconFrame>
                <div><strong>آگهی‌های من</strong><span>مشاهده و ویرایش</span></div>
                <span className={styles.cardArrow}><ArrowIcon /></span>
              </a>
              {isBusinessDirectoryAccount ? (
                <a className={styles.actionCard} href="/account?setup=business#professional-profile">
                  <IconFrame><AddIcon /></IconFrame>
                  <div>
                    <strong>مدیریت صفحه کسب‌وکار</strong>
                    <span>آدرس، خدمات، تصاویر و ساعت کاری</span>
                  </div>
                  <span className={styles.cardArrow}><ArrowIcon /></span>
                </a>
              ) : (
                <a className={styles.actionCard} href="/submit">
                  <IconFrame><AddIcon /></IconFrame>
                  <div><strong>ثبت آگهی</strong><span>خودرو جدید</span></div>
                  <span className={styles.cardArrow}><ArrowIcon /></span>
                </a>
              )}
              <a className={styles.actionCard} href="/account/saved">
                <IconFrame><BookmarkIcon /></IconFrame>
                <div><strong>نشان‌شده‌ها</strong><span>ذخیره‌ها و مقایسه</span></div>
                <span className={styles.cardArrow}><ArrowIcon /></span>
              </a>
            </section>

            {user.profile_completed && (
              <section className={styles.growthCard} aria-label="رشد و دیده‌شدن بیشتر">
                <div className={styles.growthCopy}>
                  <span>رشد در چاکود</span>
                  <h2>
                    {user.account_type === "personal"
                      ? "آگهی‌تان را بیشتر در معرض دید قرار دهید"
                      : `مجموعه‌تان را در ${user.business_location_label || user.business_city || "محدوده فعالیت"} بیشتر دیده کنید`}
                  </h2>
                  <p>
                    تبلیغ منطقه‌ای و جایگاه‌های ویژه، دقیقاً به کاربرانی نمایش داده می‌شوند که همان محدوده را دنبال می‌کنند.
                  </p>
                </div>
                <div className={styles.growthActions}>
                  <a className={styles.growthPrimary} href="/account/ads">رزرو تبلیغ منطقه‌ای</a>
                  {stats.total > 0 && !isBusinessDirectoryAccount && (
                    <a className={styles.growthSecondary} href="/dashboard/listings">ویژه‌کردن آگهی</a>
                  )}
                </div>
              </section>
            )}

            {showOnboarding && (
              <section className={styles.bottomGrid}>
                <article className={styles.panel}>
                  <header className={styles.panelHeader}>
                    <div><span>شروع سریع</span><h2>قدم بعدی شما</h2></div>
                    <p>این راهنما پس از تکمیل پروفایل و شروع فعالیت، خودکار از صفحه حذف می‌شود.</p>
                  </header>
                  <div className={styles.steps}>
                    <a
                      href="/account?complete=1"
                      className={user.profile_completed ? styles.stepCompleted : ""}
                    >
                      <b>{user.profile_completed ? "✓" : "۱"}</b>
                      <span>
                        <strong>{user.profile_completed ? "پروفایل تکمیل شده" : "پروفایل را کامل کنید"}</strong>
                        <small>{user.account_type === "personal" ? "نام و نوع حساب را ثبت کنید." : "نام، نوع فعالیت و محدوده اصلی را ثبت کنید."}</small>
                      </span>
                      <i><ArrowIcon /></i>
                    </a>
                    <a href="/dashboard/listings">
                      <b>۲</b>
                      <span>
                        <strong>آگهی‌ها را مدیریت کنید</strong>
                        <small>وضعیت انتشار، بررسی و نیاز به اصلاح را ببینید.</small>
                      </span>
                      <i><ArrowIcon /></i>
                    </a>
                    {isBusinessDirectoryAccount ? (
                      <a href="/account?setup=business#professional-profile">
                        <b>۳</b>
                        <span>
                          <strong>صفحه عمومی کسب‌وکار را تکمیل کنید</strong>
                          <small>آدرس، زمینه فعالیت، تلفن، نقشه، ساعات کاری و تصاویر را ثبت کنید.</small>
                        </span>
                        <i><ArrowIcon /></i>
                      </a>
                    ) : (
                      <a href="/submit">
                        <b>۳</b>
                        <span>
                          <strong>آگهی جدید ثبت کنید</strong>
                          <small>خودرو جدید خود را برای بررسی ارسال کنید.</small>
                        </span>
                        <i><ArrowIcon /></i>
                      </a>
                    )}
                  </div>
                </article>
              </section>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
