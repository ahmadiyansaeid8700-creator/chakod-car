"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type User = {
  mobile?: string;
  full_name?: string | null;
  display_name?: string | null;
  business_name?: string | null;
  account_type?: string;
  profile_completed?: boolean;
  phone_verified?: boolean;
  mobile_verified?: boolean;
};

type MeResponse = { success?: boolean; user?: User | null; message?: string };
type UpdateResponse = { success?: boolean; user?: User | null; message?: string };

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function headers(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

export default function AccountProfileV2Page() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function hydrate(next: User) {
    setUser(next);
    setFullName(next.full_name || next.display_name || "");
  }

  useEffect(() => {
    const cached = localStorage.getItem("chakod_user");
    if (cached) {
      try {
        hydrate(JSON.parse(cached) as User);
      } catch {
        // پاسخ سرور منبع اصلی است.
      }
    }

    void fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json", ...headers() },
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => null)) as MeResponse | null;
        if (response.ok && result?.success && result.user) {
          hydrate(result.user);
          localStorage.setItem("chakod_user", JSON.stringify(result.user));
        } else if (!cached) {
          setError(result?.message || "اطلاعات حساب دریافت نشد.");
        }
      })
      .catch(() => {
        if (!cached) setError("ارتباط با سرور برقرار نشد.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;

    const cleanName = fullName.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...headers(),
        },
        body: JSON.stringify({
          full_name: cleanName,
          account_type: user.account_type || "personal",
          business_name: user.business_name || "",
        }),
      });
      const result = (await response.json().catch(() => null)) as UpdateResponse | null;
      if (!response.ok || !result?.success || !result.user) {
        throw new Error(result?.message || "ذخیره اطلاعات انجام نشد.");
      }

      const next = { ...user, ...result.user };
      hydrate(next);
      localStorage.setItem("chakod_user", JSON.stringify(next));
      window.dispatchEvent(new Event("chakod:auth-changed"));
      setMessage("اطلاعات حساب ذخیره شد.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ذخیره اطلاعات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  const mobileVerified = Boolean(user?.phone_verified || user?.mobile_verified);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/">صفحه اصلی</Link>
          <Link href="/" aria-label="صفحه اصلی چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.titleBlock}>
          <span>حساب اصلی</span>
          <h1>اطلاعات پایه</h1>
          <p>این صفحه فقط اطلاعات شخصی صاحب حساب را نگه می‌دارد. کسب‌وکارها از منوی حساب بالای سایت مستقیم وارد صفحه مدیریت خودشان می‌شوند.</p>
        </section>

        {loading ? <div className={styles.state}>در حال دریافت اطلاعات…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}

        {!loading && user ? (
          <form className={styles.form} onSubmit={save}>
            <label>
              <span>نام و نام خانوادگی</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} autoComplete="name" />
              <small>نام صاحب حساب چاکود.</small>
            </label>

            <div className={styles.readonlyRow}>
              <span><small>نوع حساب اصلی</small><strong>شخصی</strong></span>
              <span><small>شماره موبایل</small><strong dir="ltr">{user.mobile || "ثبت نشده"}</strong></span>
            </div>

            <div className={styles.verifyRow}>
              <span>{mobileVerified ? "شماره موبایل تأیید شده" : "شماره موبایل نیازمند تأیید است"}</span>
            </div>

            <button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button>
          </form>
        ) : null}

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
