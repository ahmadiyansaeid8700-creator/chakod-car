"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API_BASE = "https://api.chakod.com";

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

function getToken() {
  if (typeof window === "undefined") return "";

  return localStorage.getItem("chakod_session_token") || "";
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `API خروجی JSON معتبر نداد: ${text.slice(0, 180)}`
    );
  }
}

function hasPermission(
  admin: AdminMeResponse["admin"],
  permission: string
) {
  const permissions = admin?.permissions || [];

  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminMeResponse | null>(
    null
  );
  const [error, setError] = useState("");

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getToken();

    if (!token) {
      setData({
        success: false,
        is_admin: false,
        message:
          "برای ورود به پنل مدیریت، ابتدا وارد حساب کاربری شوید.",
      });

      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/admin-me.php`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Session-Token": token,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const json =
        await readJson<AdminMeResponse>(response);

      setData(json);

      if (
        !response.ok ||
        !json.success ||
        !json.is_admin
      ) {
        setError(
          json.message || "دسترسی مدیریت تأیید نشد."
        );
      }
    } catch (requestError) {
      setData(null);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "خطا در اتصال به سرور مدیریت."
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
      <main className="adminPage" dir="rtl">
        <section className="stateCard">
          <div
            className="spinner"
            aria-hidden="true"
          />

          <h1>در حال بررسی دسترسی مدیریت...</h1>

          <p>
            اطلاعات نشست و سطح دسترسی در حال بررسی
            است.
          </p>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  if (!data?.success || !data.is_admin) {
    return (
      <main className="adminPage" dir="rtl">
        <section className="stateCard denied">
          <div
            className="lockIcon"
            aria-hidden="true"
          >
            🔒
          </div>

          <h1>دسترسی مدیریت فعال نیست</h1>

          <p>
            {error ||
              data?.message ||
              "شما دسترسی مدیریت سایت را ندارید."}
          </p>

          <div className="stateActions">
            <Link href="/login">ورود دوباره</Link>

            <button
              type="button"
              onClick={() => void loadAdmin()}
            >
              بررسی مجدد
            </button>

            <Link
              className="secondary"
              href="/"
            >
              بازگشت به سایت
            </Link>
          </div>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  const admin = data.admin;

  const canManageListings = hasPermission(
    admin,
    "listings.manage"
  );

  const canViewListings =
    canManageListings ||
    hasPermission(admin, "listings.view");

  return (
    <main className="adminPage" dir="rtl">
      <header className="adminHeader">
        <div>
          <span className="eyebrow">
            اتاق فرمان چاکود
          </span>

          <h1>داشبورد مدیریت و نظارت</h1>

          <p>
            بررسی صف انتشار آگهی‌ها و مشاهده وضعیت
            دسترسی‌های مدیریتی.
          </p>
        </div>

        <div className="adminIdentity">
          <strong>
            {admin?.display_name ||
              data.user?.full_name ||
              "مدیر چاکود"}
          </strong>

          <span>{data.user?.mobile || "—"}</span>

          <em>
            {admin?.role_title || "ادمین"}
          </em>
        </div>
      </header>

      <section className="adminCards">
        <article>
          <span>نقش شما</span>

          <strong>
            {admin?.role_title || "ادمین"}
          </strong>

          <p>
            سطح دسترسی از API مدیریت دریافت شده
            است.
          </p>
        </article>

        <article>
          <span>بررسی آگهی‌ها</span>

          <strong>
            {canManageListings
              ? "فعال"
              : canViewListings
                ? "فقط مشاهده"
                : "محدود"}
          </strong>

          <p>
            تأیید، رد یا ارسال آگهی برای اصلاح.
          </p>
        </article>

        <article>
          <span>پرداخت‌ها</span>

          <strong>
            {admin?.can_view_payments
              ? "قابل مشاهده"
              : "محدود"}
          </strong>

          <p>
            صفحه مستقل این بخش در مرحله بعد ساخته
            می‌شود.
          </p>
        </article>

        <article>
          <span>تنظیمات حساس</span>

          <strong>
            {admin?.can_manage_settings
              ? "مدیر اصلی"
              : "محافظت‌شده"}
          </strong>

          <p>
            تغییرات حساس فقط برای مدیر اصلی فعال
            است.
          </p>
        </article>
      </section>

      <section className="adminModules">
        {canViewListings ? (
          <Link
            className="module active"
            href="/admin/listings"
          >
            <span className="moduleIcon">
              ✓
            </span>

            <b>صف تأیید آگهی‌ها</b>

            <p>
              آگهی‌های قدیمی و جدید را بررسی و تعیین
              وضعیت کن.
            </p>

            <em>ورود به بخش</em>
          </Link>
        ) : (
          <article
            className="module disabled"
            aria-disabled="true"
          >
            <span className="moduleIcon">
              ×
            </span>

            <b>صف تأیید آگهی‌ها</b>

            <p>
              نقش فعلی شما به این بخش دسترسی ندارد.
            </p>

            <em>محدود</em>
          </article>
        )}

        <article
          className="module disabled"
          aria-disabled="true"
        >
          <span className="moduleIcon">
            ⌁
          </span>

          <b>پرداخت‌ها</b>

          <p>
            صفحه مستقل این بخش هنوز ساخته نشده است.
          </p>

          <em>به‌زودی</em>
        </article>

        <article
          className="module disabled"
          aria-disabled="true"
        >
          <span className="moduleIcon">
            !
          </span>

          <b>گزارش‌های کاربران</b>

          <p>
            پس از ساخت API گزارش‌ها به داشبورد متصل
            می‌شود.
          </p>

          <em>به‌زودی</em>
        </article>

        <article
          className="module disabled"
          aria-disabled="true"
        >
          <span className="moduleIcon small">
            AI
          </span>

          <b>نظارت هوشمند</b>

          <p>
            نسخه‌بندی مدل و بازخورد ادمین در مرحله
            بعد فعال می‌شود.
          </p>

          <em>به‌زودی</em>
        </article>
      </section>

      <section className="connectionCard">
        <div>
          <span
            className="connectionDot"
            aria-hidden="true"
          />

          <div>
            <strong>
              اتصال مدیریت برقرار است
            </strong>

            <p>
              نشست کاربری و نقش مدیریتی با موفقیت
              تأیید شدند.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAdmin()}
        >
          بررسی مجدد اتصال
        </button>
      </section>

      <nav
        className="adminBottomNav"
        aria-label="منوی مدیریت"
      >
        <Link
          className="active"
          href="/admin"
        >
          داشبورد
        </Link>

        <Link href="/admin/listings">
          آگهی‌ها
        </Link>

        <Link href="/">سایت</Link>
      </nav>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .adminPage {
    min-height: 100vh;
    padding: 24px 24px 105px;
    color: #211335;
    font-family: Tahoma, Arial, sans-serif;
    background:
      radial-gradient(
        circle at top right,
        rgba(124, 58, 237, 0.17),
        transparent 34%
      ),
      linear-gradient(
        180deg,
        #fbf8ff 0%,
        #ffffff 46%,
        #f7f2ff 100%
      );
  }

  .adminHeader,
  .adminCards,
  .adminModules,
  .connectionCard {
    width: min(1240px, 100%);
    margin-inline: auto;
  }

  .adminHeader {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) 285px;
    gap: 18px;
    align-items: stretch;
    margin-bottom: 20px;
  }

  .eyebrow {
    display: inline-flex;
    margin-bottom: 8px;
    padding: 7px 11px;
    color: #6d28d9;
    font-size: 12px;
    font-weight: 900;
    border: 1px solid #e4d4ff;
    border-radius: 999px;
    background: #f4ecff;
  }

  .adminHeader h1 {
    margin: 0;
    color: #1e1230;
    font-size: 31px;
    line-height: 1.55;
  }

  .adminHeader p {
    margin: 6px 0 0;
    color: #725f86;
    font-size: 14px;
    line-height: 2;
  }

  .adminIdentity,
  .adminCards article,
  .module,
  .connectionCard,
  .stateCard {
    border: 1px solid #eadcff;
    background: rgba(
      255,
      255,
      255,
      0.94
    );
    box-shadow:
      0 18px 50px
      rgba(76, 29, 149, 0.08);
  }

  .adminIdentity {
    display: grid;
    align-content: center;
    gap: 8px;
    padding: 18px;
    border-radius: 24px;
  }

  .adminIdentity strong {
    font-size: 17px;
  }

  .adminIdentity span {
    color: #725f86;
    direction: ltr;
    text-align: right;
  }

  .adminIdentity em {
    width: fit-content;
    padding: 6px 10px;
    color: #6d28d9;
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
    border-radius: 999px;
    background: #f4ecff;
  }

  .adminCards,
  .adminModules {
    display: grid;
    grid-template-columns:
      repeat(
        4,
        minmax(0, 1fr)
      );
    gap: 14px;
    margin-bottom: 20px;
  }

  .adminCards article,
  .module {
    padding: 18px;
    border-radius: 22px;
  }

  .adminCards span {
    color: #7b6a91;
    font-size: 12px;
  }

  .adminCards strong {
    display: block;
    margin-top: 8px;
    font-size: 20px;
  }

  .adminCards p,
  .module p,
  .connectionCard p {
    margin: 7px 0 0;
    color: #806f93;
    font-size: 12px;
    line-height: 1.9;
  }

  .module {
    display: flex;
    min-height: 190px;
    flex-direction: column;
    color: inherit;
    text-decoration: none;
  }

  .module.active {
    transition:
      transform 0.18s ease,
      border-color 0.18s ease;
  }

  .module.active:hover {
    transform: translateY(-2px);
    border-color: #c4a3ff;
  }

  .module.disabled {
    opacity: 0.72;
  }

  .moduleIcon {
    display: grid;
    width: 42px;
    height: 42px;
    margin-bottom: 14px;
    place-items: center;
    color: #fff;
    font-size: 20px;
    font-weight: 900;
    border-radius: 14px;
    background:
      linear-gradient(
        135deg,
        #6d28d9,
        #a855f7
      );
  }

  .moduleIcon.small {
    font-size: 12px;
  }

  .module b {
    font-size: 15px;
  }

  .module em {
    margin-top: auto;
    padding-top: 16px;
    color: #6d28d9;
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
  }

  .connectionCard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 18px;
    border-radius: 22px;
  }

  .connectionCard > div {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .connectionDot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #10b981;
    box-shadow:
      0 0 0 6px
      rgba(16, 185, 129, 0.12);
  }

  .connectionCard button,
  .stateActions button,
  .stateActions a {
    padding: 11px 15px;
    color: #fff;
    font-family: inherit;
    font-size: 12px;
    font-weight: 900;
    text-decoration: none;
    cursor: pointer;
    border: 0;
    border-radius: 13px;
    background: #6d28d9;
  }

  .stateCard {
    width: min(520px, 100%);
    margin: 70px auto;
    padding: 30px;
    text-align: center;
    border-radius: 28px;
  }

  .stateCard h1 {
    margin: 0;
    font-size: 22px;
  }

  .stateCard p {
    color: #725f86;
    line-height: 2;
  }

  .spinner {
    width: 48px;
    height: 48px;
    margin: 0 auto 18px;
    border: 4px solid #eadcff;
    border-top-color: #6d28d9;
    border-radius: 50%;
    animation:
      spin 0.9s linear infinite;
  }

  .lockIcon {
    margin-bottom: 12px;
    font-size: 40px;
  }

  .stateActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 9px;
    margin-top: 18px;
  }

  .stateActions .secondary {
    color: #6d28d9;
    background: #f4ecff;
  }

  .adminBottomNav {
    display: none;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 900px) {
    .adminPage {
      padding:
        16px 16px 100px;
    }

    .adminHeader {
      grid-template-columns: 1fr;
    }

    .adminCards,
    .adminModules {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .adminHeader h1 {
      font-size: 25px;
    }

    .adminBottomNav {
      position: fixed;
      right: 12px;
      bottom: 12px;
      left: 12px;
      z-index: 100;
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 7px;
      padding: 8px;
      border:
        1px solid #eadcff;
      border-radius: 20px;
      background:
        rgba(
          255,
          255,
          255,
          0.94
        );
      box-shadow:
        0 18px 50px
        rgba(
          76,
          29,
          149,
          0.16
        );
      backdrop-filter: blur(14px);
    }

    .adminBottomNav a {
      padding: 10px 6px;
      color: #6d28d9;
      font-size: 11px;
      font-weight: 900;
      text-align: center;
      text-decoration: none;
      border-radius: 13px;
      background: #f8f3ff;
    }

    .adminBottomNav a.active {
      color: #fff;
      background: #6d28d9;
    }
  }

  @media (max-width: 560px) {
    .adminCards,
    .adminModules {
      grid-template-columns: 1fr;
    }

    .connectionCard {
      align-items: stretch;
      flex-direction: column;
    }

    .connectionCard button {
      width: 100%;
    }
  }
`;