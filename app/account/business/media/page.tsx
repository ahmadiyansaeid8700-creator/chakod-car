"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import styles from "./page.module.css";

type ProfessionalProfile = Record<string, unknown> & {
  dealer_id?: number | null;
  name?: string;
  logo_url?: string;
};

type ProfileResponse = {
  success?: boolean;
  message?: string;
  profile?: ProfessionalProfile;
};

type LogoResponse = {
  success?: boolean;
  message?: string;
  url?: string;
  profile?: ProfessionalProfile;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function BusinessMediaPage() {
  const searchParams = useSearchParams();
  const requestedDealerId = Math.max(0, Math.round(Number(searchParams.get("dealer_id") || 0)));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/auth/professional-profile", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const payload = await readJson<ProfileResponse>(response);
        if (!response.ok || !payload?.success || !payload.profile) {
          throw new Error(payload?.message || "اطلاعات مجموعه دریافت نشد.");
        }
        const profileDealerId = Number(payload.profile.dealer_id || 0);
        if (requestedDealerId && profileDealerId && requestedDealerId !== profileDealerId) {
          throw new Error("این پروفایل به نمایشگاه انتخاب‌شده تعلق ندارد.");
        }
        setProfile(payload.profile);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(caught instanceof Error ? caught.message : "اطلاعات مجموعه دریافت نشد.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [requestedDealerId]);

  function openLogoPicker() {
    if (working) return;
    fileInputRef.current?.click();
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile || working) return;
    if (!requestedDealerId) {
      setError("شناسه نمایشگاه مشخص نیست. از پنل نمایشگاه دوباره وارد بخش لوگو شوید.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("فایل انتخاب‌شده باید تصویر باشد.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("فرمت لوگو باید JPG، PNG یا WebP باشد.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("حجم لوگو باید حداکثر ۶ مگابایت باشد.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("dealer_id", String(requestedDealerId));
      form.set("file", file);

      const response = await fetch("/api/auth/business-logo", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: form,
      });
      const result = await readJson<LogoResponse>(response);
      if (!response.ok || !result?.success || !result.url) {
        throw new Error(result?.message || "بارگذاری و ذخیره لوگو انجام نشد.");
      }

      setProfile(result.profile || { ...profile, dealer_id: requestedDealerId, logo_url: result.url });
      setNotice(result.message || "لوگوی مجموعه با موفقیت ذخیره شد.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "بارگذاری لوگو انجام نشد.";
      setError(message === "Failed to fetch" ? "ارسال لوگو به سرور انجام نشد. دوباره تلاش کنید." : message);
    } finally {
      setWorking(false);
    }
  }

  const dealerId = requestedDealerId || Number(profile?.dealer_id || 0);
  const backHref = dealerId ? `/account/business?dealer_id=${dealerId}&tab=team` : "/account-v2";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href={backHref} className={styles.back}>←</Link>
          <Link href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
          <span />
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>هویت مجموعه</span>
          <h1>لوگوی نمایشگاه</h1>
          <p>لوگو در پنل مدیریت و بخش‌های عمومی نمایشگاه نمایش داده می‌شود.</p>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        <section className={styles.card}>
          {loading ? (
            <div className={styles.loading}>در حال دریافت لوگوی مجموعه…</div>
          ) : profile ? (
            <>
              <button
                type="button"
                className={styles.logoPreview}
                onClick={openLogoPicker}
                disabled={working}
                aria-label={profile.logo_url ? "تغییر لوگوی نمایشگاه" : "بارگذاری لوگوی نمایشگاه"}
              >
                {profile.logo_url ? <img src={String(profile.logo_url)} alt="لوگوی مجموعه" /> : <span>لوگو</span>}
                <span className={styles.logoAction} aria-hidden="true">{working ? "…" : "+"}</span>
              </button>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={working}
                onChange={(event) => void uploadLogo(event)}
              />
              <div className={styles.copy}>
                <h2>{String(profile.name || "نمایشگاه")}</h2>
                <p>فرمت پیشنهادی PNG یا WebP با پس‌زمینه شفاف و تصویر مربعی است.</p>
              </div>
              <p className={styles.uploadHint}>
                {working ? "در حال بارگذاری و ذخیره لوگو…" : profile.logo_url ? "برای تغییر تصویر، روی خود لوگو بزنید." : "برای انتخاب تصویر، روی کادر لوگو بزنید."}
              </p>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
