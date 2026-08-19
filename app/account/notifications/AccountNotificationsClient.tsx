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

type RefundResponse = {
  success?: boolean;
  message?: string;
  refunds?: Array<{
    id: number;
    order_no?: string;
    amount_toman?: number;
    destination?: string;
    status?: string;
    reason?: string;
    admin_note?: string;
    updated_at?: string;
  }>;
};

type SupportResponse = {
  success?: boolean;
  message?: string;
  tickets?: Array<{
    ticket_no: string;
    subject?: string;
    status?: string;
    priority?: string;
    updated_at?: string;
    replies?: Array<{
      id: number;
      author_type?: string;
      body?: string;
      created_at?: string;
    }>;
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

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

export default function AccountNotificationsClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [finance, setFinance] = useState<FinanceResponse | null>(null);
  const [refunds, setRefunds] = useState<RefundResponse | null>(null);
  const [support, setSupport] = useState<SupportResponse | null>(null);
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

    const headers = { Accept: "application/json", ...authHeaders() };
    const endpoints = [
      "/api/auth/me",
      "/api/auth/dashboard-summary",
      "/api/finance/summary",
      "/api/finance/refunds",
      "/api/support/requests",
    ] as const;

    try {
      const results = await Promise.allSettled(
        endpoints.map((url) =>
          fetch(url, {
            cache: "no-store",
            credentials: "include",
            headers,
          }),
        ),
      );

      const meResult = results[0];
      if (meResult.status !== "fulfilled") {
        setError("وضعیت حساب دریافت نشد.");
        return;
      }

      const mePayload = await readJson<MeResponse>(meResult.value);
      if (
        meResult.value.status === 401 ||
        meResult.value.status === 403 ||
        mePayload?.logged_in === false
      ) {
        window.location.assign("/login?returnTo=%2Faccount%2Fnotifications");
        return;
      }

      if (!meResult.value.ok || !mePayload?.success) {
        setError(mePayload?.message || "وضعیت حساب دریافت نشد.");
        return;
      }

      setMe(mePayload);

      if (results[1].status === "fulfilled") {
        const payload = await readJson<DashboardResponse>(results[1].value);
        if (results[1].value.ok && payload?.success) setDashboard(payload);
      }

      if (results[2].status === "fulfilled") {
        const payload = await readJson<FinanceResponse>(results[2].value);
        if (results[2].value.ok && payload?.success) setFinance(payload);
      }

      if (results[3].status === "fulfilled") {
        const payload = await readJson<RefundResponse>(results[3].value);
        if (results[3].value.ok && payload?.success) setRefunds(payload);
      }

      if (results[4].status === "fulfilled") {
        const payload = await readJson<SupportResponse>(results[4].value);
        if (results[4].value.ok && payload?.success) setSupport(payload);
      }
    } catch {
      setError("ارتباط با سرویس اعلان‌های حساب برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const notices = useMemo<Notice[]>(() => {
    const items: Notice[] = [];
    const user = me?.user;
    const stats = dashboard?.stats || {};
    const orders = finance?.orders || [];
    const refundRows = refunds?.refunds || [];
    const tickets = support?.tickets || [];
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

    const refundRequested = refundRows.filter((refund) => refund.status === "requested");
    const refundApproved = refundRows.filter((refund) => refund.status === "approved");
    const refundProcessing = refundRows.filter((refund) => refund.status === "processing");
    const refundRejected = refundRows.filter((refund) => refund.status === "rejected");

    if (refundRequested.length > 0) {
      const total = refundRequested.reduce((sum, refund) => sum + Number(refund.amount_toman || 0), 0);
      items.push({
        id: "refund-requested",
        level: "info",
        title: `${formatNumber(refundRequested.length)} درخواست بازپرداخت در صف بررسی است`,
        text: `مجموع ${formatToman(total)} برای بررسی مدیر مالی ثبت شده است.`,
        href: "/account/refunds",
        action: "پیگیری بازپرداخت",
      });
    }

    if (refundApproved.length > 0 || refundProcessing.length > 0) {
      items.push({
        id: "refund-processing",
        level: "warning",
        title: "بازپرداخت تأیید شده و در حال اجرا است",
        text: "وضعیت نهایی و مقصد بازپرداخت را از صفحه بازپرداخت‌ها پیگیری کنید.",
        href: "/account/refunds",
        action: "مشاهده وضعیت",
      });
    }

    if (refundRejected.length > 0) {
      const latestRejected = refundRejected[0];
      items.push({
        id: `refund-rejected-${latestRejected.id}`,
        level: "danger",
        title: "یک درخواست بازپرداخت رد شده است",
        text: latestRejected.admin_note || "دلیل یا یادداشت مدیر مالی در صفحه بازپرداخت قابل مشاهده است.",
        href: "/account/refunds",
        action: "مشاهده نتیجه",
      });
    }

    const waitingForUser = tickets.filter((ticket) => ticket.status === "waiting_user");
    if (waitingForUser.length > 0) {
      const latest = waitingForUser[0];
      const adminReplies = (latest.replies || []).filter((reply) => reply.author_type === "admin");
      const latestReply = adminReplies[adminReplies.length - 1];
      items.push({
        id: `support-reply-${latest.ticket_no}`,
        level: "warning",
        title: "پشتیبانی چاکود منتظر پاسخ شماست",
        text: latestReply?.body
          ? latestReply.body.slice(0, 180)
          : latest.subject || "برای ادامه رسیدگی، تیکت پشتیبانی را باز کنید.",
        href: `/support/tickets/${encodeURIComponent(latest.ticket_no)}`,
        action: "مشاهده و پاسخ",
      });
    }

    const urgentOpen = tickets.filter(
      (ticket) =>
        (ticket.priority === "urgent" || ticket.priority === "high") &&
        ["open", "in_progress", "waiting_support"].includes(ticket.status || ""),
    );
    if (urgentOpen.length > 0) {
      const latest = urgentOpen[0];
      items.push({
        id: `support-active-${latest.ticket_no}`,
        level: "info",
        title: "تیکت پشتیبانی شما در حال پیگیری است",
        text: latest.subject || "وضعیت این درخواست از صفحه تیکت قابل پیگیری است.",
        href: `/support/tickets/${encodeURIComponent(latest.ticket_no)}`,
        action: "پیگیری تیکت",
      });
    }

    return items;
  }, [me, dashboard, finance, refunds, support]);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/account">← حساب من</Link>
            <span>مرکز اعلان‌های چاکود</span>
            <h1>موارد نیازمند توجه</h1>
            <p>این صفحه از وضعیت واقعی پروفایل، آگهی‌ها، پرداخت‌ها، بازپرداخت و پشتیبانی ساخته می‌شود.</p>
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
            <p>در حال حاضر آگهی، پرداخت، بازپرداخت، تیکت یا اطلاعات حسابی که نیازمند اقدام شما باشد پیدا نشد.</p>
            <Link href="/account">بازگشت به حساب</Link>
          </section>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
