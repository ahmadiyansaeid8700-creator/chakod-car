"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type AccountType = "personal" | "dealer" | "parts_store" | "repair_shop" | "car_service" | "business";
type SelectableAccountType = Exclude<AccountType, "business">;

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

const accountTypes: Array<{ value: SelectableAccountType; label: string }> = [
  { value: "personal", label: "حساب شخصی" },
  { value: "dealer", label: "نمایشگاه خودرو" },
  { value: "parts_store", label: "فروشگاه قطعات" },
  { value: "repair_shop", label: "تعمیرگاه خودرو" },
  { value: "car_service", label: "خدمات خودرو" },
];

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

function isSelectableAccountType(type?: string | null): type is SelectableAccountType {
  return type === "personal" || type === "dealer" || type === "parts_store" || type === "repair_shop" || type === "car_service";
}

function isBusinessType(type?: string | null): type is Exclude<SelectableAccountType, "personal"> {
  return type === "dealer" || type === "parts_store" || type === "repair_shop" || type === "car_service";
}

export default function AccountProfileV2Page() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [selectedType, setSelectedType] = useState<SelectableAccountType | "">("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function hydrate(next: User) {
    setUser(next);
    setFullName(next.full_name || "");
    setSelectedType(isSelectableAccountType(next.account_type) ? next.account_type : "");
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
    const cleanBusinessName = businessName.trim().replace(/\s+/g, " ");

    if (cleanName.length < 2) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }

    if (!selectedType) {
      setError("نوع حساب را انتخاب کنید.");
      return;
    }

    if (isBusinessType(selectedType) && cleanBusinessName.length < 2) {
      setError("نام مجموعه را وارد کنید.");
      return;
    }

    const currentType = isSelectableAccountType(user.account_type) ? user.account_type : null;
    const typeChanged = currentType !== selectedType;

    if (typeChanged) {
      const extraNote =
        selectedType === "personal"
          ? "\n\nتوجه: این کار نوع حساب اصلی را به شخصی تغییر می‌دهد؛ رکورد مستقل نمایشگاه یا کسب‌وکار، اگر وجود داشته باشد، با این عملیات حذف دائمی نمی‌شود."
          : "";
      const confirmed = window.confirm(
        `نوع حساب از «${typeLabel(user.account_type)}» به «${typeLabel(selectedType)}» تغییر کند؟${extraNote}`,
      );
      if (!confirmed) return;
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
          account_type: selectedType,
          business_name: isBusinessType(selectedType) ? cleanBusinessName : "",
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
      setMessage(typeChanged ? "نوع حساب و اطلاعات پایه با موفقیت تغییر کرد." : "اطلاعات حساب ذخیره شد.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ذخیره اطلاعات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  const typeChanged = Boolean(user && selectedType && user.account_type !== selectedType);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account">بازگشت</Link>
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </header>

        <section className={styles.titleBlock}>
          <span>حساب من</span>
          <h1>اطلاعات پایه</h1>
          <p>نام و نوع حساب را اینجا مدیریت کنید. نوع حساب هر زمان قابل تغییر است.</p>
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

            <label className={styles.spacedField}>
              <span>نوع حساب</span>
              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(event.target.value as SelectableAccountType | "");
                  setError("");
                  setMessage("");
                }}
              >
                <option value="">انتخاب کنید</option>
                {accountTypes.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <small>می‌توانید بین حساب شخصی، نمایشگاه، قطعات، تعمیرگاه و خدمات خودرو جابه‌جا شوید.</small>
            </label>

            {isBusinessType(selectedType) ? (
              <label className={styles.spacedField}>
                <span>نام مجموعه</span>
                <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={180} autoComplete="organization" />
              </label>
            ) : null}

            {typeChanged ? (
              <div className={styles.changeNotice}>
                پس از ذخیره، ابزارهای حساب متناسب با نوع جدید نمایش داده می‌شوند.
                {selectedType === "personal" ? " این تغییر به‌تنهایی رکورد مستقل نمایشگاه یا کسب‌وکار را حذف دائمی نمی‌کند." : ""}
              </div>
            ) : null}

            <div className={styles.readonlyRow}>
              <span><small>نوع فعلی حساب</small><strong>{typeLabel(user.account_type)}</strong></span>
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
