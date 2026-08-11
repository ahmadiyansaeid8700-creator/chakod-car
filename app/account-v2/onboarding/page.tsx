"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type AccountType = "personal" | "dealer" | "parts_store" | "repair_shop" | "car_service";

type User = {
  mobile?: string;
  full_name?: string | null;
  account_type?: string | null;
  business_name?: string | null;
  phone_verified?: boolean;
  mobile_verified?: boolean;
};

type ApiResponse = {
  success?: boolean;
  user?: User | null;
  message?: string;
};

const accountTypes: Array<{
  value: AccountType;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    value: "personal",
    title: "حساب شخصی",
    description: "برای خرید، فروش و استفاده شخصی از چاکود",
    icon: "👤",
  },
  {
    value: "dealer",
    title: "نمایشگاه خودرو",
    description: "برای نمایشگاه‌ها و فروشندگان حرفه‌ای خودرو",
    icon: "🚘",
  },
  {
    value: "parts_store",
    title: "فروشگاه قطعات",
    description: "برای فروشگاه‌های قطعات و لوازم خودرو",
    icon: "⚙️",
  },
  {
    value: "repair_shop",
    title: "تعمیرگاه خودرو",
    description: "برای تعمیرگاه‌ها و مراکز فنی خودرو",
    icon: "🔧",
  },
  {
    value: "car_service",
    title: "خدمات خودرو",
    description: "برای مراکز خدماتی و سرویس‌های خودرو",
    icon: "🛠️",
  },
];

function isBusinessType(type: AccountType | null): type is Exclude<AccountType, "personal"> {
  return Boolean(type && type !== "personal");
}

export default function FirstLoginOnboardingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    void fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => null)) as ApiResponse | null;

        if (!alive) return;

        if (response.status === 401 || response.status === 403) {
          window.location.replace("/login?returnTo=/account-v2/onboarding");
          return;
        }

        if (!response.ok || !result?.success || !result.user) {
          setError(result?.message || "اطلاعات حساب دریافت نشد.");
          return;
        }

        const nextUser = result.user;
        const existingName = nextUser.full_name?.trim() || "";

        // این صفحه فقط برای راه‌اندازی اولیه است. کاربر تکمیل‌شده مستقیم وارد حساب می‌شود.
        if (existingName.length >= 2) {
          window.location.replace("/account-v2");
          return;
        }

        setUser(nextUser);
        setFullName(existingName);
      })
      .catch(() => {
        if (alive) setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const selectedOption = useMemo(
    () => accountTypes.find((item) => item.value === accountType) || null,
    [accountType],
  );

  const cleanName = fullName.trim().replace(/\s+/g, " ");
  const cleanBusinessName = businessName.trim().replace(/\s+/g, " ");
  const canSubmit =
    cleanName.length >= 2 &&
    Boolean(accountType) &&
    (!isBusinessType(accountType) || cleanBusinessName.length >= 2) &&
    !saving;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !accountType || !canSubmit) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: cleanName,
          account_type: accountType,
          business_name: isBusinessType(accountType) ? cleanBusinessName : "",
        }),
      });

      const result = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok || !result?.success || !result.user) {
        throw new Error(result?.message || "ثبت اطلاعات انجام نشد.");
      }

      localStorage.setItem("chakod_user", JSON.stringify(result.user));
      window.dispatchEvent(new Event("chakod:auth-changed"));
      window.location.replace("/account-v2");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ثبت اطلاعات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.brandBar}>
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          <span>راه‌اندازی حساب</span>
        </header>

        <section className={styles.intro}>
          <span className={styles.step}>فقط یک‌بار</span>
          <h1>حسابت را در چند ثانیه آماده کن</h1>
          <p>نامت را وارد کن و بگو چطور از چاکود استفاده می‌کنی. بعداً همه این اطلاعات از داخل حساب قابل مدیریت است.</p>
        </section>

        {loading ? <div className={styles.state}>در حال آماده‌سازی حساب…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {!loading && user ? (
          <form className={styles.form} onSubmit={submit}>
            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <span>۱</span>
                <div>
                  <h2>نام شما</h2>
                  <p>برای شخصی‌سازی حساب و ارتباط با چاکود</p>
                </div>
              </div>

              <label className={styles.field}>
                <span>نام و نام خانوادگی</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="مثلاً سعید احمدیان"
                  maxLength={120}
                  autoComplete="name"
                  autoFocus
                />
              </label>

              {user.mobile ? (
                <div className={styles.mobileRow}>
                  <span>شماره تأییدشده</span>
                  <strong dir="ltr">{user.mobile}</strong>
                </div>
              ) : null}
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <span>۲</span>
                <div>
                  <h2>نوع حساب</h2>
                  <p>گزینه‌ای را انتخاب کن که بیشتر به فعالیتت نزدیک است.</p>
                </div>
              </div>

              <div className={styles.typeGrid} role="radiogroup" aria-label="نوع حساب">
                {accountTypes.map((item) => {
                  const active = accountType === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`${styles.typeCard} ${active ? styles.typeCardActive : ""}`}
                      onClick={() => {
                        setAccountType(item.value);
                        setError("");
                        if (item.value === "personal") setBusinessName("");
                      }}
                      role="radio"
                      aria-checked={active}
                    >
                      <span className={styles.typeIcon} aria-hidden="true">{item.icon}</span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </button>
                  );
                })}
              </div>

              {selectedOption ? (
                <div className={styles.completionPanel}>
                  <div className={styles.completionTitle}>
                    <span>✓</span>
                    <div>
                      <strong>{selectedOption.title}</strong>
                      <small>{isBusinessType(accountType) ? "فقط نام مجموعه را وارد کن؛ جزئیات بیشتر بعداً داخل حساب تکمیل می‌شود." : "برای حساب شخصی اطلاعات دیگری لازم نیست."}</small>
                    </div>
                  </div>

                  {isBusinessType(accountType) ? (
                    <label className={styles.field}>
                      <span>نام مجموعه</span>
                      <input
                        value={businessName}
                        onChange={(event) => setBusinessName(event.target.value)}
                        placeholder="نام نمایشگاه، فروشگاه یا مجموعه"
                        maxLength={180}
                        autoComplete="organization"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </section>

            <div className={styles.submitWrap}>
              <button type="submit" disabled={!canSubmit}>
                {saving ? "در حال ساخت حساب…" : "ورود به حساب من"}
              </button>
              <p>این مرحله بعد از تکمیل دیگر هنگام ورود نمایش داده نمی‌شود.</p>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
