"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type MeResponse = {
  success?: boolean;
  logged_in?: boolean;
  message?: string;
  user?: {
    full_name?: string | null;
    display_name?: string | null;
    profile_completed?: boolean;
    phone_verified?: boolean;
    mobile_verified?: boolean;
  } | null;
};

type DashboardResponse = {
  success?: boolean;
  message?: string;
  stats?: {
    pending?: number;
    rejected?: number;
    expired?: number;
    inactive?: number;
  };
};

type FinanceResponse = {
  success?: boolean;
  message?: string;
  orders?: Array<{
    id: number;
    orderNo?: string;
    status?: string;
    finalAmountToman?: number;
  }>;
};

type Notice = {
  id: string;
  level: "info" | "warning" | "danger" | "success";
  title: string;
  text: string;
  href: string;
  action: string;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

export default function AccountNotificationsClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [finance, setFinance] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      window.location.assign("/login?returnTo=%2Faccount%2Fnotifications");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all([
        fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        }),
        fetch("/api/auth/dashboard-summary", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        }),
        fetch("/api/finance/summary", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        }),
      ]);
      const [mePayload, dashboardPayload, financePayload] = await Promise.all([
        readJson<MeResponse>(responses[0]),
        readJson<DashboardResponse>(responses[1]),
        readJson<FinanceResponse>(responses[2]),
      ]);

      if (responses[0].status === 401 || responses[0].status === 403 || mePayload?.logged_in === false) {
        window.location.assign("/login?returnTo=%2Faccount%2Fnotifications");
        return;
      }

      if (!responses[0].ok || !mePayload?.success) {
        setError(mePayload?.message || "وضعیت حساب دریافت نشد.");
        return;
      }

      setMe(mePayload);
      if (responses[1].ok && dashboardPayload?.success) setDashboard(dashboardPayload);
      if (responses[2].ok && financePayload?.success) setFinance(financePayload);
    } catch {
      setError("ارتباط با سرویس اعلان‌های حساب برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const notices = useMemo<Notice[]>(() => {
    const items: Notice[] = [];
    const user = me?.user;
    const stats = dashboard?.stats || {};
    const orders = finance?.orders || [];
    const pendingOrders = orders.filter((order) => order.status === "pending_payment").length;
    const failedOrders = orders.filter((order) => order.status === "payment_failed").length;

    if (user && user.profile_completed === false) {
      items.push({
        id: "profile",
        level: "warning",
        title: "پروفایل حساب کامل نیست",
        text: "برای ثبت آگهی، ساخت صفحه کسب‌وکار و دریافت خدمات مالی، اطلاعات حساب را کامل کنید.",
        href: "/account/profile",
        action: "تکمیل پروفایل",
      });
    }

    if (user && !(user.phone_verified || user.mobile_verified)) {
      items.push({
        id: "mobile",
        level: "danger",
        title: "شماره موبایل تأیید نشده است",
        text: "عملیات حساس و مدیریت کسب‌وکار فقط برای شماره تأییدشده فعال می‌شود.",
        href: "/account/security",
        action: "بررسی امنیت",
      });
    }

    if (Number(stats.pending || 0) > 0) {
      items.push({
        id: "pending-listings",
        level: "info",
        title: `${formatNumber(Number(stats.pending || 0))} آگهی در انتظار بررسی است`,
        text: "پس از بررسی مدیریت، وضعیت انتشار در صفحه آگهی‌های من به‌روزرسانی می‌شود.",
        href: "/account/listings?status=pending",
        action: "مشاهده آگهی‌ها",
      });
    }

    if (Number(stats.rejected || 0) > 0) {
      items.push({
        id: "rejected-listings",
        level: "danger",
        title: `${formatNumber(Number(stats.rejected || 0))} آگهی نیازمند اصلاح است`,
        text: "علت رد را در صفحه مدیریت آگهی ببینید و اطلاعات یا تصاویر را اصلاح کنید.",
        href: "/account/listings?status=rejected",
        action: "اصلاح آگهی",
      });
    }

    if (Number(stats.expired || 0) + Number(stats.inactive || 0) > 0) {
      items.push({
        id: "inactive-listings",
        level: "warning",
        title: "برخی آگهی‌ها غیرفعال یا منقضی شده‌اند",
        text: "از مرکز خدمات، تمدید یا انتشار دوباره آگهی را انتخاب کنید.",
        href: "/account/services?tab=listing",
        action: "تمدید آگهی",
      });
    }

    if (pendingOrders > 0) {
      items.push({
        id: "pending-orders",
        level: "warning",
        title: `${formatNumber(pendingOrders)} سفارش در انتظار پرداخت است`,
        text: "سفارش‌های نیمه‌تمام را از مرکز پرداخت‌ها بررسی کنید.",
        href: "/account/payments",
        action: "مشاهده پرداخت‌ها",
      });
    }

    if (failedOrders > 0) {
      items.push({
        id: "failed-orders",
        level: "danger",
        title: `${formatNumber(failedOrders)} پرداخت ناموفق ثبت شده است`,
        text: "مبلغ ناموفق به‌عنوان پرداخت موفق ثبت نشده و می‌توانید سفارش را دوباره آغاز کنید.",
        href: "/account/payments",
        action: "بررسی سفارش",
      });
    }

    return items;
  }, [me, dashboard, finance]);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/account">← حساب من</Link>
            <span>مرکز اعلان‌های چاکود</span>
            <h1>موارد نیازمند توجه</h1>
            <p>این صفحه از وضعیت واقعی پروفایل، آگهی‌ها و سفارش‌های مالی ساخته می‌شود.</p>
          </div>
          <button type="button" onClick={() => void load()}>به‌روزرسانی</button>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h2>در حال بررسی وضعیت حساب</h2>
          </section>
        )}

        {!loading && error && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h2>اعلان‌ها در دسترس نیستند</h2>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && !error && notices.length > 0 && (
          <section className={styles.noticeList}>
            {notices.map((notice) => (
              <article key={notice.id} className={`${styles.noticeCard} ${styles[notice.level]}`}>
                <span className={styles.noticeIcon}>
                  {notice.level === "success" ? "✓" : notice.level === "danger" ? "!" : notice.level === "warning" ? "•" : "i"}
                </span>
                <div>
                  <h2>{notice.title}</h2>
                  <p>{notice.text}</p>
                </div>
                <Link href={notice.href}>{notice.action}</Link>
              </article>
            ))}
          </section>
        )}

        {!loading && !error && notices.length === 0 && (
          <section className={styles.successCard}>
            <span>✓</span>
            <h2>همه‌چیز مرتب است</h2>
            <p>در حال حاضر آگهی، پرداخت یا اطلاعات حسابی که نیازمند اقدام شما باشد پیدا نشد.</p>
            <Link href="/account">بازگشت به حساب</Link>
          </section>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
