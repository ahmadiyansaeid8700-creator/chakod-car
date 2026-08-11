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
  profile_completed?: boolean;
  phone_verified?: boolean;
  mobile_verified?: boolean;
};

type Stats = { total: number; active: number; pending: number };
type Activity = {
  id: number;
  type: "dealer" | "parts_store" | "repair_shop" | "car_service" | string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  external_dealer_id?: number | null;
  status: string;
  verification_status: string;
  can_publish_vehicle?: boolean;
};
type Membership = {
  type: string;
  external_dealer_id?: number;
  name: string;
  role?: string;
  can_publish_vehicle?: boolean;
};
type ActivitiesResponse = {
  success?: boolean;
  message?: string;
  activities?: Activity[];
  memberships?: Membership[];
  available_types?: string[];
};

type MeResponse = { success?: boolean; logged_in?: boolean; message?: string; user?: AccountUser | null };
type DashboardResponse = { success?: boolean; stats?: Partial<Stats> };

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}
function clearAuth() {
  localStorage.removeItem("chakod_session_token");
  localStorage.removeItem("chakod_user");
  localStorage.removeItem("chakod_identity");
}
async function readJson<T>(response: Response): Promise<T | null> {
  try { return (await response.json()) as T; } catch { return null; }
}
function formatNumber(value: number) { return new Intl.NumberFormat("fa-IR").format(value); }
function maskMobile(value?: string) {
  const mobile = String(value || "").trim();
  if (!mobile) return "شماره ثبت نشده";
  if (mobile.length < 8) return mobile;
  return `${mobile.slice(0, 4)}••••${mobile.slice(-3)}`;
}
function activityLabel(type: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}
function roleLabel(role?: string) {
  if (role === "owner") return "مالک";
  if (role === "manager") return "مدیر";
  if (role === "sales") return "فروش";
  if (role === "content") return "محتوا";
  if (role === "finance") return "مالی";
  return "عضو مجموعه";
}
function activityManageHref(activity: Activity) {
  if (activity.type === "dealer" && activity.external_dealer_id) return `/account/business?dealer_id=${activity.external_dealer_id}`;
  return `/account-v2/businesses/${activity.id}`;
}
function Icon({ name }: { name: "list" | "plus" | "bookmark" | "chart" | "profile" | "store" | "shield" | "chevron" }) {
  const paths = {
    list: <><path d="M7 6h12M7 12h12M7 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
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
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, pending: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    document.body.dataset.chakodAccountV2 = "true";
    return () => { delete document.body.dataset.chakodAccountV2; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const meResponse = await fetch("/api/auth/me", {
          credentials: "include", cache: "no-store", signal: controller.signal,
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const me = await readJson<MeResponse>(meResponse);
        if (meResponse.status === 401 || meResponse.status === 403 || me?.logged_in === false || !me?.user) {
          clearAuth();
          setUser(null);
          return;
        }
        setUser(me.user);
        localStorage.setItem("chakod_user", JSON.stringify(me.user));

        const [dashboardResponse, activitiesResponse] = await Promise.all([
          fetch("/api/auth/dashboard-summary", {
            credentials: "include", cache: "no-store", signal: controller.signal,
            headers: { Accept: "application/json", ...authHeaders() },
          }).catch(() => null),
          fetch("/api/auth/account-activities", {
            credentials: "include", cache: "no-store", signal: controller.signal,
            headers: { Accept: "application/json", ...authHeaders() },
          }),
        ]);

        if (dashboardResponse) {
          const dashboard = await readJson<DashboardResponse>(dashboardResponse);
          if (dashboardResponse.ok && dashboard?.success) {
            setStats({
              total: Number(dashboard.stats?.total || 0),
              active: Number(dashboard.stats?.active || 0),
              pending: Number(dashboard.stats?.pending || 0),
            });
          }
        }

        const activityPayload = await readJson<ActivitiesResponse>(activitiesResponse);
        if (activitiesResponse.ok && activityPayload?.success) {
          setActivities(Array.isArray(activityPayload.activities) ? activityPayload.activities : []);
          setMemberships(Array.isArray(activityPayload.memberships) ? activityPayload.memberships : []);
          setAvailableTypes(Array.isArray(activityPayload.available_types) ? activityPayload.available_types : []);
        } else {
          setError(activityPayload?.message || "کسب‌وکارهای حساب دریافت نشدند.");
        }
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const displayName = useMemo(() => user?.display_name || user?.full_name || "کاربر چاکود", [user]);
  const verified = Boolean(user?.phone_verified || user?.mobile_verified);
  const personalProfileReady = Boolean((user?.full_name || user?.display_name || "").trim().length >= 2);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({}),
      });
    } catch { /* خروج محلی ادامه پیدا می‌کند */ }
    clearAuth();
    window.dispatchEvent(new Event("chakod:auth-changed"));
    window.location.assign("/");
  }

  if (loading && !user) {
    return <main className={styles.statePage} dir="rtl"><span className={styles.loader} /><strong>در حال آماده‌سازی حساب…</strong></main>;
  }
  if (!user) {
    return (
      <main className={styles.statePage} dir="rtl">
        <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        <section className={styles.loginCard}><h1>حساب چاکود</h1><p>برای مدیریت حساب خود وارد شوید.</p><Link href="/login">ورود با شماره موبایل</Link></section>
      </main>
    );
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.logoLink} aria-label="خانه چاکود"><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
          <button type="button" className={styles.logout} onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? "…" : "خروج"}</button>
        </header>

        {error ? <div className={styles.notice}>{error}</div> : null}

        <section className={styles.identityCard}>
          <div className={styles.identityTop}>
            <div className={styles.avatar}>{displayName.trim().charAt(0) || "چ"}</div>
            <div className={styles.identityCopy}>
              <span className={styles.accountType}>حساب اصلی</span>
              <h1>{displayName}</h1>
              <p>{maskMobile(user.mobile)}</p>
            </div>
          </div>
          <div className={styles.statusRow}>
            <span className={verified ? styles.goodStatus : styles.warnStatus}><Icon name="shield" />{verified ? "شماره تأیید شده" : "شماره نیازمند تأیید"}</span>
            <span className={personalProfileReady ? styles.goodStatus : styles.warnStatus}><Icon name="profile" />{personalProfileReady ? "اطلاعات حساب آماده" : "اطلاعات حساب ناقص"}</span>
          </div>
        </section>

        <section className={styles.section} id="businesses">
          <div className={styles.sectionHead}><h2>مدیریت کسب‌وکار</h2></div>
          <div className={styles.quickGrid}>
            <Link href="/account-v2/profile" className={styles.quickCard}>
              <span className={styles.quickIcon}><Icon name="profile" /></span>
              <span><strong>حساب شخصی</strong><small>{displayName}</small></span>
              <Icon name="chevron" />
            </Link>
            {activities.map((activity) => (
              <Link key={activity.id} href={activityManageHref(activity)} className={styles.quickCard}>
                <span className={styles.quickIcon}><Icon name="store" /></span>
                <span><strong>{activity.name}</strong><small>{activityLabel(activity.type)}</small></span>
                <Icon name="chevron" />
              </Link>
            ))}
            {availableTypes.length > 0 ? (
              <Link href="/account-v2/businesses/new" className={styles.quickCard}>
                <span className={styles.quickIcon}><Icon name="plus" /></span>
                <span><strong>افزودن کسب‌وکار</strong><small>نمایشگاه، قطعات، تعمیرگاه یا خدمات</small></span>
                <Icon name="chevron" />
              </Link>
            ) : null}
          </div>
        </section>

        <section className={styles.stats} aria-label="وضعیت آگهی‌ها">
          <div><strong>{formatNumber(stats.active)}</strong><span>فعال</span></div>
          <div><strong>{formatNumber(stats.pending)}</strong><span>در بررسی</span></div>
          <div><strong>{formatNumber(stats.total)}</strong><span>همه آگهی‌ها</span></div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><h2>دسترسی سریع</h2></div>
          <div className={styles.quickGrid}>
            <Link href="/account/listings" className={styles.quickCard}><span className={styles.quickIcon}><Icon name="list" /></span><span><strong>آگهی‌های من</strong><small>مشاهده و مدیریت</small></span><Icon name="chevron" /></Link>
            <Link href="/account/saved" className={styles.quickCard}><span className={styles.quickIcon}><Icon name="bookmark" /></span><span><strong>نشان‌شده‌ها</strong><small>ذخیره‌های شما</small></span><Icon name="chevron" /></Link>
            <Link href="/dashboard" className={styles.quickCard}><span className={styles.quickIcon}><Icon name="chart" /></span><span><strong>داشبورد</strong><small>آمار و وضعیت</small></span><Icon name="chevron" /></Link>
          </div>
        </section>

        {memberships.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHead}><div><h2>مجموعه‌هایی که در آن‌ها فعالیت می‌کنم</h2><p>عضویت در این مجموعه‌ها مالکیت شما محسوب نمی‌شود.</p></div></div>
            <div style={{ display: "grid", gap: 8 }}>
              {memberships.map((membership) => (
                <Link key={`${membership.type}:${membership.external_dealer_id}:${membership.name}`} href={membership.external_dealer_id ? `/account/business?dealer_id=${membership.external_dealer_id}` : "/account/business"} className={styles.businessCard}>
                  <span className={styles.businessIcon}><Icon name="store" /></span>
                  <span className={styles.businessCopy}><strong>{membership.name}</strong><small>{activityLabel(membership.type)} · {roleLabel(membership.role)}</small></span>
                  <span className={styles.businessState}>عضو</span><Icon name="chevron" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHead}><h2>حساب و پشتیبانی</h2></div>
          <div className={styles.simpleList}>
            <Link href="/support"><span><strong>پشتیبانی چاکود</strong><small>پیگیری درخواست یا گزارش مشکل</small></span><Icon name="chevron" /></Link>
            <Link href="/account/ads"><span><strong>تبلیغات و دیده‌شدن</strong><small>تبلیغات شخصی یا مجموعه‌های مجاز</small></span><Icon name="chevron" /></Link>
          </div>
        </section>

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
