"use client";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";

import HomeLocationSelector from "../components/HomeLocationSelector";
import {
  DEFAULT_HOME_LOCATION,
  createHomeLocationSelection,
  type HomeLocationScope,
  type HomeLocationSelection,
} from "../components/home-location";
import styles from "./ProfileEditor.module.css";

const LOCAL_DEV_SESSION_TOKEN = "chakod-local-dev-session";
const IS_LOCAL_DEV = process.env.NODE_ENV === "development";

export type AccountUser = {
  id?: number;
  mobile?: string;
  full_name?: string | null;
  account_type?: "personal" | "dealer" | "parts_store" | "repair_shop" | "car_service" | "business";
  business_name?: string | null;
  business_city?: string | null;
  business_location_mode?: HomeLocationSelection["mode"] | null;
  business_location_label?: string | null;
  business_location_scopes?: HomeLocationScope[] | null;
  display_name?: string;
  profile_completed?: boolean;
  phone_verified?: boolean;
  mobile_verified?: boolean;
  terms_accepted?: boolean;
  accepted_terms?: boolean;
};

type ProfileEditorProps = {
  user: AccountUser;
  forceOpen?: boolean;
  onSaved: (user: AccountUser) => void;
};

type UpdateProfileResponse = {
  success?: boolean;
  message?: string;
  user?: AccountUser;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function locationFromUser(user: AccountUser): HomeLocationSelection {
  if (Array.isArray(user.business_location_scopes)) {
    const selection = createHomeLocationSelection(user.business_location_scopes);
    if (selection.mode !== "all" || user.business_location_mode === "all") {
      return selection;
    }
  }

  if (user.business_location_mode === "all") return DEFAULT_HOME_LOCATION;
  return DEFAULT_HOME_LOCATION;
}

function profileIsComplete(user: AccountUser) {
  const fullNameOk = Boolean(user.full_name?.trim().length && user.full_name.trim().length >= 2);
  const accountType = user.account_type || "personal";

  if (!fullNameOk || accountType === "business") return false;
  if (accountType === "personal") return true;

  const businessNameOk = Boolean(
    user.business_name?.trim().length && user.business_name.trim().length >= 2,
  );
  const locationOk = Boolean(
    user.business_location_label?.trim() || user.business_city?.trim(),
  );

  return businessNameOk && locationOk;
}

async function readApiResponse(response: Response): Promise<UpdateProfileResponse> {
  const text = await response.text();
  try {
    return JSON.parse(text) as UpdateProfileResponse;
  } catch {
    return { success: false, message: "پاسخ سرور معتبر نیست. دوباره تلاش کنید." };
  }
}

export default function ProfileEditor({ user, forceOpen = false, onSaved }: ProfileEditorProps) {
  const complete = useMemo(() => profileIsComplete(user), [user]);
  const [open, setOpen] = useState(forceOpen || !complete);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [accountType, setAccountType] = useState<
    "personal" | "dealer" | "parts_store" | "repair_shop" | "car_service" | "business"
  >(user.account_type || "personal");
  const [businessName, setBusinessName] = useState(user.business_name || "");
  const [businessLocation, setBusinessLocation] = useState<HomeLocationSelection>(
    () => locationFromUser(user),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFullName(user.full_name || "");
    setAccountType(user.account_type || "personal");
    setBusinessName(user.business_name || "");
    setBusinessLocation(locationFromUser(user));
  }, [user]);

  useEffect(() => {
    if (forceOpen || !complete) setOpen(true);
  }, [forceOpen, complete]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const cleanFullName = fullName.trim().replace(/\s+/g, " ");
    const cleanBusinessName = businessName.trim().replace(/\s+/g, " ");

    if (cleanFullName.length < 2) {
      setError("نام و نام خانوادگی را کامل‌تر وارد کنید.");
      return;
    }

    if (accountType !== "personal" && cleanBusinessName.length < 2) {
      setError("نام مجموعه یا محل فعالیت را وارد کنید.");
      return;
    }

    if (accountType !== "personal" && !businessLocation.label.trim()) {
      setError("محدوده اصلی فعالیت را انتخاب کنید.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const professionalLocation = accountType === "personal" ? null : businessLocation;

    try {
      if (IS_LOCAL_DEV && getToken() === LOCAL_DEV_SESSION_TOKEN) {
        const nextUser: AccountUser = {
          ...user,
          full_name: cleanFullName,
          account_type: accountType,
          business_name: accountType === "personal" ? null : cleanBusinessName,
          business_city: professionalLocation?.label || null,
          business_location_mode: professionalLocation?.mode || null,
          business_location_label: professionalLocation?.label || null,
          business_location_scopes: professionalLocation?.scopes || null,
          display_name: accountType === "personal" ? cleanFullName : cleanBusinessName || cleanFullName,
          profile_completed: true,
          phone_verified: true,
          mobile_verified: true,
          terms_accepted: true,
          accepted_terms: true,
        };

        localStorage.setItem("chakod_user", JSON.stringify(nextUser));
        window.dispatchEvent(new Event("chakod:auth-changed"));
        window.history.replaceState({}, "", "/account");
        onSaved(nextUser);
        setMessage(
          accountType === "personal"
            ? "اطلاعات اولیه حساب ذخیره شد."
            : "اطلاعات اولیه ثبت شد. در مرحله بعد می‌توانید پروفایل حرفه‌ای مجموعه را کامل کنید.",
        );
        setOpen(false);
        return;
      }

      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          full_name: cleanFullName,
          account_type: accountType,
          business_name: accountType === "personal" ? "" : cleanBusinessName,
          business_location_mode: professionalLocation?.mode || "",
          business_location_label: professionalLocation?.label || "",
          business_location_scopes: professionalLocation?.scopes || [],
        }),
      });

      const result = await readApiResponse(response);
      if (!response.ok || !result.success || !result.user) {
        setError(result.message || "ذخیره اطلاعات اولیه انجام نشد.");
        return;
      }

      const nextUser: AccountUser = { ...user, ...result.user };
      localStorage.setItem("chakod_user", JSON.stringify(nextUser));
      window.dispatchEvent(new Event("chakod:auth-changed"));
      window.history.replaceState({}, "", "/account");
      onSaved(nextUser);
      setMessage(
        result.message ||
          (accountType === "personal"
            ? "اطلاعات اولیه حساب ذخیره شد."
            : "اطلاعات اولیه ثبت شد. در مرحله بعد می‌توانید پروفایل حرفه‌ای مجموعه را کامل کنید."),
      );
      setOpen(false);
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`${styles.panel} ${!complete ? styles.incomplete : ""}`} aria-labelledby="profile-editor-title">
      <div className={styles.summary}>
        <div>
          <span className={styles.eyebrow}>اطلاعات اولیه حساب</span>
          <h2 id="profile-editor-title">
            {complete ? "مشخصات اصلی شما" : "اطلاعات اولیه را ثبت کنید"}
          </h2>
          <p>
            {complete
              ? "این اطلاعات یک‌بار ثبت می‌شوند و در بخش‌های مختلف چاکود استفاده خواهند شد."
              : "برای شروع فقط نام، نوع حساب و محدوده اصلی فعالیت را ثبت کنید؛ جزئیات هر آگهی جداگانه گرفته می‌شود."}
          </p>
        </div>

        <div className={styles.summaryActions}>
          <span className={complete ? styles.completeBadge : styles.pendingBadge}>
            {complete ? "اطلاعات ثبت‌شده" : "نیازمند ثبت"}
          </span>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => {
              setOpen((value) => !value);
              setError("");
              setMessage("");
            }}
          >
            {open ? "بستن فرم" : complete ? "ویرایش اطلاعات" : "ثبت اطلاعات"}
          </button>
        </div>
      </div>

      {open && (
        <form className={styles.form} onSubmit={submitProfile}>
          <label className={styles.field}>
            <span>نام و نام خانوادگی</span>
            <input
              value={fullName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFullName(event.target.value);
                setError("");
              }}
              maxLength={120}
              autoComplete="name"
              placeholder="مثلاً سعید گلشن"
              required
            />
          </label>

          <fieldset className={styles.accountTypes}>
            <legend>نوع حساب</legend>

            <button
              type="button"
              className={accountType === "personal" ? styles.selectedType : ""}
              aria-pressed={accountType === "personal"}
              onClick={() => {
                setAccountType("personal");
                setError("");
                setMessage("");
              }}
            >
              <strong>شخصی</strong>
              <span>برای خرید، فروش و مدیریت آگهی‌های شخصی</span>
            </button>

            <button
              type="button"
              className={accountType === "dealer" ? styles.selectedType : ""}
              aria-pressed={accountType === "dealer"}
              onClick={() => {
                setAccountType("dealer");
                setError("");
                setMessage("");
              }}
            >
              <strong>نمایشگاه خودرو</strong>
              <span>برای مالک یا عضو نمایشگاه خودرو</span>
            </button>

            <button
              type="button"
              className={accountType === "parts_store" ? styles.selectedType : ""}
              aria-pressed={accountType === "parts_store"}
              onClick={() => {
                setAccountType("parts_store");
                setError("");
                setMessage("");
              }}
            >
              <strong>فروشگاه قطعات و لوازم خودرو</strong>
              <span>برای فروش قطعات و تجهیزات خودرو</span>
            </button>

            <button
              type="button"
              className={accountType === "repair_shop" ? styles.selectedType : ""}
              aria-pressed={accountType === "repair_shop"}
              onClick={() => {
                setAccountType("repair_shop");
                setError("");
                setMessage("");
              }}
            >
              <strong>تعمیرگاه خودرو</strong>
              <span>برای خدمات فنی، تعمیرات، برق، جلوبندی و سرویس خودرو</span>
            </button>

            <button
              type="button"
              className={accountType === "car_service" ? styles.selectedType : ""}
              aria-pressed={accountType === "car_service"}
              onClick={() => {
                setAccountType("car_service");
                setError("");
                setMessage("");
              }}
            >
              <strong>مرکز خدمات خودرو</strong>
              <span>برای کارواش، دیتیلینگ، شیشه دودی، کاور، سرامیک و خدمات زیبایی</span>
            </button>
          </fieldset>

          {accountType !== "personal" && (
            <div className={styles.businessFields}>
              <label className={styles.field}>
                <span>
                  {accountType === "dealer"
                    ? "نام نمایشگاه"
                    : accountType === "parts_store"
                      ? "نام فروشگاه قطعات و لوازم خودرو"
                      : accountType === "repair_shop"
                        ? "نام تعمیرگاه"
                        : accountType === "car_service"
                          ? "نام مرکز خدمات خودرو"
                          : "نام کسب‌وکار"}
                </span>
                <input
                  value={businessName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setBusinessName(event.target.value);
                    setError("");
                  }}
                  maxLength={180}
                  autoComplete="organization"
                  placeholder={
                    accountType === "dealer"
                      ? "مثلاً نمایشگاه چاکود"
                      : accountType === "parts_store"
                        ? "مثلاً یدک چاکود"
                        : accountType === "car_service"
                          ? "مثلاً مرکز دیتیلینگ چاکود"
                          : "مثلاً تعمیرگاه چاکود"
                  }
                  required
                />
              </label>

              <div className={styles.locationField}>
                <span>محدوده اصلی فعالیت</span>
                <HomeLocationSelector
                  value={businessLocation}
                  onChange={(selection) => {
                    setBusinessLocation(selection);
                    setError("");
                  }}
                  persist={false}
                  triggerTitle="محدوده فعالیت"
                  dialogEyebrow="پروفایل حرفه‌ای"
                  dialogTitle="انتخاب محدوده فعالیت"
                />
                <small>می‌توانید سراسر ایران، کل یک استان یا شهرهای مشخص را انتخاب کنید و بعداً آن را تغییر دهید.</small>
              </div>
            </div>
          )}

          {accountType !== "personal" && (
            <div className={styles.professionalNote}>
              <strong>مرحله بعدی، پروفایل حرفه‌ای مجموعه است</strong>
              <span>آدرس دقیق، نقشه، ساعات کاری، خدمات، لوگو و تصاویر مجموعه بعداً یک‌بار تکمیل می‌شوند و در همه آگهی‌ها قابل استفاده‌اند.</span>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}

          <div className={styles.formActions}>
            <button type="submit" disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره اطلاعات اولیه"}
            </button>
            {complete && (
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setOpen(false);
                  setFullName(user.full_name || "");
                  setAccountType(user.account_type || "personal");
                  setBusinessName(user.business_name || "");
                  setBusinessLocation(locationFromUser(user));
                  setError("");
                  setMessage("");
                }}
              >
                انصراف
              </button>
            )}
          </div>
        </form>
      )}

      {!open && message && <div className={styles.success}>{message}</div>}
    </section>
  );
}
