"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type AccountType = "personal" | "dealer" | "parts_store" | "repair_shop" | "car_service" | "business";

type User = {
  mobile?: string;
  full_name?: string | null;
  display_name?: string | null;
  business_name?: string | null;
  account_type?: AccountType | string;
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

function typeLabel(type?: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "خدمات خودرو";
  if (type === "business") return "نوع کسب‌وکار تعیین نشده";
  return "حساب شخصی";
}

function isFinalBusinessType(type?: string): type is Exclude<AccountType, "personal" | "business"> {
  return type === "dealer" || type === "parts_store" || type === "repair_shop" || type === "car_service";
}

export default function AccountProfileV2Page() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [selectedType, setSelectedType] = useState<AccountType>("personal");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function hydrate(next: User) {
    setUser(next);
    setFullName(next.full_name || "");
    setSelectedType((next.account_type as AccountType) || "personal");
    setBusinessName(next.business_name || "");
  }

  useEffect(() => {
    const cached = localStorage.getItem("chakod_user");
    if (cached) {
      try {
        hydrate(JSON.parse(cached) as User);
      } catch {
        // ادامه با پاسخ سرور.
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
    const unresolvedBusiness = user.account_type === "business";
    const nextType = unresolvedBusiness ? selectedType : (user.account_type || "personal");
    const cleanBusinessName = businessName.trim().replace(/\s+/g, " ");

    if (cleanName.length < 2) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }

    if (unresolvedBusiness && !isFinalBusinessType(nextType)) {
      setError("نوع کسب‌وکار را مشخص کنید.");
      return;
    }

    if (isFinalBusinessType(nextType) && cleanBusinessName.length < 2) {
      setError("نام مجموعه را وارد کنید.");
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
          account_type: nextType,
          business_name: isFinalBusinessType(nextType) ? cleanBusinessName : "",
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

  const unresolvedBusiness = user?.account_type === "business";
  const finalBusiness = isFinalBusinessType(user?.account_type);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account-v2">بازگشت</Link>
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </header>

        <section className={styles.titleBlock}>
          <span>حساب من</span>
          <h1>اطلاعات پایه</h1>
          <p>{unresolvedBusiness ? "نوع کسب‌وکار را یک‌بار مشخص کنید تا ابزارهای درست نمایش داده شوند." : "فقط اطلاعات مربوط به خود حساب اینجا نگهداری می‌شود."}</p>
        </section>

        {loading ? <div className={styles.state}>در حال دریافت اطلاعات…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}

        {!loading && user ? (
          <form className={styles.form} onSubmit={save}>
            <label>
              <span>نام و نام خانوادگی</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} autoComplete="name" />
              <small>این نام برای مدیریت داخلی حساب است.</small>
            </label>

            {unresolvedBusiness ? (
              <>
                <label className={styles.spacedField}>
                  <span>نوع کسب‌وکار</span>
                  <select value={selectedType} onChange={(event) => setSelectedType(event.target.value as AccountType)}>
                    <option value="business">انتخاب کنید</option>
                    <option value="dealer">نمایشگاه خودرو</option>
                    <option value="parts_store">فروشگاه قطعات</option>
                    <option value="repair_shop">تعمیرگاه خودرو</option>
                    <option value="car_service">خدمات خودرو</option>
                  </select>
                  <small>بعد از انتخاب، صفحه حساب و ابزارها متناسب با همین نوع فعالیت می‌شوند.</small>
                </label>

                {isFinalBusinessType(selectedType) ? (
                  <label className={styles.spacedField}>
                    <span>نام مجموعه</span>
                    <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={180} autoComplete="organization" />
                  </label>
                ) : null}
              </>
            ) : finalBusiness ? (
              <label className={styles.spacedField}>
                <span>نام مجموعه</span>
                <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={180} autoComplete="organization" />
              </label>
            ) : null}

            <div className={styles.readonlyRow}>
              <span><small>نوع حساب</small><strong>{unresolvedBusiness ? typeLabel(selectedType) : typeLabel(user.account_type)}</strong></span>
              <span><small>شماره موبایل</small><strong dir="ltr">{user.mobile || "ثبت نشده"}</strong></span>
            </div>

            <div className={styles.verifyRow}>
              <span>{user.phone_verified || user.mobile_verified ? "شماره موبایل تأیید شده" : "شماره موبایل نیازمند تأیید است"}</span>
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
