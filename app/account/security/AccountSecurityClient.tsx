"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type MeResponse = {
  success?: boolean;
  logged_in?: boolean;
  message?: string;
  user?: {
    id?: number;
    mobile?: string;
    full_name?: string | null;
    display_name?: string | null;
    phone_verified?: boolean;
    mobile_verified?: boolean;
    terms_accepted?: boolean;
    accepted_terms?: boolean;
    profile_completed?: boolean;
    account_type?: string;
  } | null;
};

type LogoutResponse = {
  success?: boolean;
  message?: string;
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

function maskMobile(mobile?: string) {
  if (!mobile) return "ثبت نشده";
  if (mobile.length < 8) return mobile;
  return `${mobile.slice(0, 4)}****${mobile.slice(-3)}`;
}

function clearLocalSession() {
  localStorage.removeItem("chakod_session_token");
  localStorage.removeItem("chakod_user");
  localStorage.removeItem("chakod_identity");
  window.dispatchEvent(new Event("chakod:auth-changed"));
}

export default function AccountSecurityClient() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      window.location.assign("/login?returnTo=%2Faccount%2Fsecurity");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<MeResponse>(response);

      if (response.status === 401 || response.status === 403 || payload?.logged_in === false) {
        clearLocalSession();
        window.location.assign("/login?returnTo=%2Faccount%2Fsecurity");
        return;
      }

      if (!response.ok || !payload?.success || !payload.user) {
        setError(payload?.message || "اطلاعات امنیت حساب دریافت نشد.");
        return;
      }

      setData(payload);
    } catch {
      setError("ارتباط با سرویس امنیت حساب برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (working) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({}),
      });
      const payload = await readJson<LogoutResponse>(response);
      setNotice(payload?.message || "نشست این دستگاه پاک شد.");
    } catch {
      setNotice("نشست محلی این دستگاه پاک شد؛ پاسخ سرور دریافت نشد.");
    } finally {
      clearLocalSession();
      window.setTimeout(() => window.location.assign("/"), 700);
    }
  }

  useEffect(() => { void load(); }, []);

  const user = data?.user;
  const verified = Boolean(user?.phone_verified || user?.mobile_verified);
  const termsAccepted = Boolean(user?.terms_accepted || user?.accepted_terms);
  const displayName = user?.display_name || user?.full_name || "کاربر چاکود";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/account">← حساب من</Link>
            <span>امنیت و نشست</span>
            <h1>کنترل حساب و ورود</h1>
            <p>وضعیت شماره موبایل، نشست جاری و اطلاعات امنیتی حساب را بررسی کنید.</p>
          </div>
          <Link className={styles.profileLink} href="/account/profile">ویرایش پروفایل</Link>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader}/>
            <h2>در حال بررسی نشست</h2>
          </section>
        )}

        {!loading && error && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h2>اطلاعات امنیت در دسترس نیست</h2>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && !error && user && (
          <>
            {notice && <div className={styles.notice}>{notice}</div>}
            <section className={styles.identityCard}>
              <div className={styles.avatar}>چ</div>
              <div>
                <span>هویت فعال</span>
                <h2>{displayName}</h2>
                <p>{maskMobile(user.mobile)} · {user.account_type || "personal"}</p>
              </div>
              <span className={styles.sessionBadge}>نشست فعال</span>
            </section>

            <section className={styles.grid}>
              <article className={verified ? styles.goodCard : styles.warningCard}>
                <span>{verified ? "✓" : "!"}</span>
                <h2>تأیید شماره موبایل</h2>
                <p>{verified ? "شماره موبایل برای عملیات حساس تأیید شده است." : "شماره موبایل هنوز تأیید نشده و برخی عملیات محدود می‌مانند."}</p>
              </article>
              <article className={termsAccepted ? styles.goodCard : styles.warningCard}>
                <span>{termsAccepted ? "✓" : "!"}</span>
                <h2>پذیرش قوانین</h2>
                <p>{termsAccepted ? "قوانین استفاده برای این حساب پذیرفته شده است." : "پیش از ادامه استفاده، قوانین سایت باید پذیرفته شوند."}</p>
              </article>
              <article className={user.profile_completed ? styles.goodCard : styles.warningCard}>
                <span>{user.profile_completed ? "✓" : "•"}</span>
                <h2>کامل‌بودن پروفایل</h2>
                <p>{user.profile_completed ? "اطلاعات پایه حساب کامل است." : "اطلاعات پروفایل را تکمیل کنید تا همه امکانات فعال شوند."}</p>
              </article>
            </section>

            <section className={styles.sessionCard}>
              <div>
                <span>نشست این دستگاه</span>
                <h2>خروج امن از حساب</h2>
                <p>خروج، Cookie نشست و اطلاعات ذخیره‌شده محلی را پاک می‌کند. هیچ Token یا رمز در این صفحه نمایش داده نمی‌شود.</p>
              </div>
              <button type="button" disabled={working} onClick={() => void logout()}>
                {working ? "در حال خروج..." : "خروج از این دستگاه"}
              </button>
            </section>

            <section className={styles.links}>
              <Link href="/privacy"><strong>حریم خصوصی</strong><span>نحوه استفاده و نگهداری اطلاعات</span></Link>
              <Link href="/terms"><strong>شرایط استفاده</strong><span>تعهدات و قواعد حساب کاربری</span></Link>
              <Link href="/support"><strong>پشتیبانی</strong><span>گزارش مشکل ورود یا امنیت حساب</span></Link>
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
