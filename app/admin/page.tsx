"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { canOpenAdminCommerce } from "../../lib/route-access";
import styles from "./page.module.css";

type AdminMeResponse = {
  success: boolean;
  is_admin?: boolean;
  message?: string;
  user?: {
    id: number;
    mobile?: string | null;
    full_name?: string | null;
    account_type?: string | null;
  };
  admin?: {
    id: number;
    role: string;
    role_title?: string | null;
    status?: string | null;
    display_name?: string | null;
    permissions?: string[];
    can_manage_admins?: boolean;
    can_manage_settings?: boolean;
    can_view_payments?: boolean;
    can_audit_services?: boolean;
  };
};

type AiManagerResponse = {
  success: boolean;
  manager?: {
    version: string;
    requestedEnabled: boolean;
    ready: boolean;
    provider: "disabled" | "openai" | "local";
    providerConfigured: boolean;
    mode: "read_suggest";
    writeActionsAllowed: false;
    listingModeration: {
      preserved: true;
      configured: boolean;
    };
  };
  runtime?: {
    timeoutMs: number;
    model: string | null;
  };
  tools?: {
    summary: {
      total: number;
      available: number;
      registered: number;
      planned: number;
    };
  };
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API خروجی JSON معتبر نداد: ${text.slice(0, 160)}`);
  }
}

function hasPermission(admin: AdminMeResponse["admin"], permission: string) {
  const permissions = admin?.permissions || [];
  return permissions.includes("*") || permissions.includes(permission);
}

function providerLabel(provider?: AiManagerResponse["manager"] extends infer T
  ? T extends { provider: infer P }
    ? P
    : never
  : never) {
  if (provider === "openai") return "OpenAI";
  if (provider === "local") return "Local";
  return "غیرفعال";
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminMeResponse | null>(null);
  const [ai, setAi] = useState<AiManagerResponse | null>(null);
  const [error, setError] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    setError("");
    setRequiresLogin(false);

    const token = getToken();

    if (!token) {
      setRequiresLogin(true);
      setData({
        success: false,
        is_admin: false,
        message: "برای ورود به پنل مدیریت، ابتدا وارد حساب کاربری شوید.",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/me", {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Session-Token": token,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const json = await readJson<AdminMeResponse>(response);

      if (response.status === 401 || response.status === 403) {
        setRequiresLogin(true);
        setData(json);
        setError(json.message || "نشست مدیریت معتبر نیست.");
        return;
      }

      if (!response.ok) {
        setData(null);
        setError(json.message || "سرویس مدیریت فعلاً پاسخ نداد.");
        return;
      }

      setData(json);

      if (!json.success || !json.is_admin) {
        setError(json.message || "دسترسی مدیریت تأیید نشد.");
        return;
      }

      try {
        const aiResponse = await fetch("/api/ai/manager/status", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (aiResponse.ok) {
          setAi(await readJson<AiManagerResponse>(aiResponse));
        } else {
          setAi(null);
        }
      } catch {
        setAi(null);
      }
    } catch (requestError) {
      setData(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "خطا در اتصال به سرور مدیریت.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  if (loading) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.stateCard}>
          <span className={styles.loadingOrb} aria-hidden="true" />
          <div>
            <span className={styles.kicker}>CHAKOD CONTROL</span>
            <h1>در حال آماده‌سازی مرکز فرماندهی...</h1>
            <p>نشست مدیریت، سطح دسترسی و وضعیت AI در حال بررسی است.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!data?.success || !data.is_admin) {
    const connectionProblem = !requiresLogin && data === null;

    return (
      <main className={styles.page} dir="rtl">
        <section className={`${styles.stateCard} ${styles.denied}`}>
          <span className={styles.stateIcon}>!</span>
          <div>
            <span className={styles.kicker}>ACCESS CONTROL</span>
            <h1>
              {connectionProblem
                ? "ارتباط با سرور مدیریت برقرار نشد"
                : "دسترسی مدیریت فعال نیست"}
            </h1>
            <p>{error || data?.message || "شما دسترسی مدیریت سایت را ندارید."}</p>
            <div className={styles.stateActions}>
              {requiresLogin && <Link href="/login">ورود دوباره</Link>}
              <button type="button" onClick={() => void loadAdmin()}>
                بررسی مجدد
              </button>
              <Link className={styles.secondaryAction} href="/">
                بازگشت به سایت
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const admin = data.admin;
  const isSuperAdmin = admin?.role === "super_admin";

  const canManageListings = hasPermission(admin, "listings.manage");
  const canViewListings = canManageListings || hasPermission(admin, "listings.view");
  const canManageBusinesses = hasPermission(admin, "businesses.manage");
  const canViewBusinesses =
    canManageBusinesses || hasPermission(admin, "businesses.view");
  const canOpenCommerce = canOpenAdminCommerce(admin);
  const canManageAdmins = isSuperAdmin && !!admin?.can_manage_admins;
  const canManageSettings = isSuperAdmin && !!admin?.can_manage_settings;
  const canViewPayments = isSuperAdmin && !!admin?.can_view_payments;
  const canAuditServices = isSuperAdmin && !!admin?.can_audit_services;

  const aiManager = ai?.manager;
  const aiReady = !!aiManager?.ready;
  const moderationReady = !!aiManager?.listingModeration.configured;
  const toolsAvailable = ai?.tools?.summary.available || 0;
  const toolsRegistered = ai?.tools?.summary.registered || 0;

  const modules = [
    canViewListings
      ? {
          href: "/admin/listings",
          code: "AD",
          title: "کنترل آگهی‌ها",
          description: "صف بررسی، وضعیت انتشار و نظارت روی آگهی‌های خودرو.",
          meta: canManageListings ? "مدیریت کامل" : "فقط مشاهده",
        }
      : null,
    canViewBusinesses
      ? {
          href: "/admin/businesses",
          code: "BZ",
          title: "کسب‌وکارها",
          description: "نمایشگاه‌ها، تعمیرگاه‌ها، خدمات و فروشگاه‌های قطعات.",
          meta: canManageBusinesses ? "مدیریت کامل" : "فقط مشاهده",
        }
      : null,
    canOpenCommerce
      ? {
          href: "/admin/commerce",
          code: "CM",
          title: "مالی و تجاری",
          description: "تعرفه‌ها، پرداخت‌ها، اشتراک‌ها، بنرها و تنظیمات تجاری.",
          meta: "ماژول تجاری",
        }
      : null,
    {
      href: "/admin/ai",
      code: "AI",
      title: "مرکز هوش مصنوعی",
      description: "Provider، Tool Registry، Moderation و پیشنهادهای Read-only.",
      meta: aiReady ? "آماده" : "در حال پیکربندی",
    },
  ].filter(Boolean) as Array<{
    href: string;
    code: string;
    title: string;
    description: string;
    meta: string;
  }>;

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroMain}>
            <div className={styles.heroTopline}>
              <span className={styles.kicker}>CHAKOD CONTROL CENTER</span>
              <span className={styles.liveBadge}>
                <i aria-hidden="true" /> اتصال مدیریت برقرار
              </span>
            </div>
            <h1>مرکز فرماندهی چاکود</h1>
            <p>
              مدیریت عملیاتی سایت و لایه هوش مصنوعی از یک ساختار واحد؛ AI فقط می‌خواند،
              تحلیل می‌کند و پیشنهاد می‌دهد و هیچ تغییر خودکاری مجاز نیست.
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/admin/ai">
                ورود به مرکز AI
              </Link>
              <button className={styles.refreshButton} type="button" onClick={() => void loadAdmin()}>
                تازه‌سازی وضعیت
              </button>
            </div>
          </div>

          <aside className={styles.identityCard}>
            <span className={styles.identityLabel}>مدیر فعال</span>
            <strong>{admin?.display_name || data.user?.full_name || "ادمین چاکود"}</strong>
            <span>{admin?.role_title || "ادمین سایت"}</span>
            <small>{data.user?.mobile || "شماره تأییدشده"}</small>
            <div className={styles.identityDivider} />
            <div className={styles.identityMeta}>
              <span>Role</span>
              <b>{admin?.role || "admin"}</b>
            </div>
          </aside>
        </header>

        <section className={styles.signalGrid} aria-label="وضعیت‌های اصلی">
          <article className={styles.signalCard}>
            <span className={styles.signalCode}>AI</span>
            <div>
              <small>AI Manager</small>
              <strong>{aiReady ? "آماده" : "غیرفعال / ناقص"}</strong>
              <p>{providerLabel(aiManager?.provider)} · {aiManager?.mode || "read_suggest"}</p>
            </div>
          </article>

          <article className={styles.signalCard}>
            <span className={styles.signalCode}>MD</span>
            <div>
              <small>Moderation</small>
              <strong>{moderationReady ? "پیکربندی شده" : "نیازمند پیکربندی"}</strong>
              <p>سرویس مستقل بررسی محتوای آگهی</p>
            </div>
          </article>

          <article className={styles.signalCard}>
            <span className={styles.signalCode}>TL</span>
            <div>
              <small>Read-only Tools</small>
              <strong>{toolsAvailable} فعال · {toolsRegistered} ثبت‌شده</strong>
              <p>بدون Write Action خودکار</p>
            </div>
          </article>

          <article className={styles.signalCard}>
            <span className={styles.signalCode}>AC</span>
            <div>
              <small>Access</small>
              <strong>{admin?.role_title || "ادمین"}</strong>
              <p>سطح دسترسی از Backend واقعی دریافت شده</p>
            </div>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.modulesPanel}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.kicker}>OPERATIONS</span>
                <h2>ماژول‌های مدیریت</h2>
              </div>
              <span>{modules.length} بخش در دسترس</span>
            </div>

            <div className={styles.moduleGrid}>
              {modules.map((module) => (
                <Link className={styles.moduleCard} href={module.href} key={module.href}>
                  <div className={styles.moduleTop}>
                    <span className={styles.moduleCode}>{module.code}</span>
                    <small>{module.meta}</small>
                  </div>
                  <strong>{module.title}</strong>
                  <p>{module.description}</p>
                  <span className={styles.moduleLink}>باز کردن بخش ←</span>
                </Link>
              ))}
            </div>
          </div>

          <aside className={styles.aiPanel}>
            <div className={styles.aiPanelHeader}>
              <div>
                <span className={styles.kicker}>AI ARCHITECTURE</span>
                <h2>زنجیره تصمیم هوشمند</h2>
              </div>
              <span className={aiReady ? styles.readyPill : styles.offPill}>
                {aiReady ? "READY" : "SAFE OFF"}
              </span>
            </div>

            <div className={styles.aiFlow}>
              <div className={styles.aiStep}>
                <span>01</span>
                <div>
                  <strong>Provider Layer</strong>
                  <p>{providerLabel(aiManager?.provider)} با Timeout و Failure isolation</p>
                </div>
              </div>
              <div className={styles.aiStep}>
                <span>02</span>
                <div>
                  <strong>Read-only Tools</strong>
                  <p>فقط APIهای مدیریتی تأییدشده و بدون تغییر داده</p>
                </div>
              </div>
              <div className={styles.aiStep}>
                <span>03</span>
                <div>
                  <strong>Analysis & Suggestion</strong>
                  <p>خلاصه، اولویت‌بندی، هشدار و پیشنهاد اقدام</p>
                </div>
              </div>
              <div className={styles.aiStep}>
                <span>04</span>
                <div>
                  <strong>Human Approval</strong>
                  <p>هر اقدام تغییردهنده در آینده فقط با تأیید مدیر</p>
                </div>
              </div>
            </div>

            <Link className={styles.aiPanelLink} href="/admin/ai">
              مشاهده معماری و Tool Registry
            </Link>
          </aside>
        </section>

        <section className={styles.permissionsPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>GOVERNANCE</span>
              <h2>کنترل‌های مدیریتی</h2>
            </div>
          </div>

          <div className={styles.permissionList}>
            <span className={canManageAdmins ? styles.permissionOn : styles.permissionOff}>
              مدیریت ادمین‌ها
            </span>
            <span className={canManageSettings ? styles.permissionOn : styles.permissionOff}>
              تنظیمات حساس
            </span>
            <span className={canViewPayments ? styles.permissionOn : styles.permissionOff}>
              مشاهده پرداخت‌ها
            </span>
            <span className={canAuditServices ? styles.permissionOn : styles.permissionOff}>
              Audit سرویس‌ها
            </span>
            <span className={styles.permissionOn}>AI Read-only</span>
            <span className={styles.permissionOff}>AI Auto-write</span>
          </div>
        </section>
      </section>

      <nav className={styles.bottomNav} aria-label="منوی مدیریت">
        <Link className={styles.bottomActive} href="/admin">داشبورد</Link>
        {canViewListings && <Link href="/admin/listings">آگهی‌ها</Link>}
        {canViewBusinesses && <Link href="/admin/businesses">کسب‌وکارها</Link>}
        {canOpenCommerce && <Link href="/admin/commerce">تجاری</Link>}
        <Link href="/admin/ai">AI</Link>
        <Link href="/">سایت</Link>
      </nav>
    </main>
  );
}
