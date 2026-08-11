"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
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

type UploadResponse = {
  success?: boolean;
  message?: string;
  url?: string;
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

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile || working) return;
    if (!file.type.startsWith("image/")) {
      setError("فایل انتخاب‌شده باید تصویر باشد.");
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      setError("حجم لوگو باید کمتر از ۷ مگابایت باشد.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("kind", "logo");
      form.set("file", file);
      const uploadResponse = await fetch("/api/auth/professional-profile/upload", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: form,
      });
      const upload = await readJson<UploadResponse>(uploadResponse);
      if (!uploadResponse.ok || !upload?.success || !upload.url) {
        throw new Error(upload?.message || "بارگذاری لوگو انجام نشد.");
      }

      const nextProfile: ProfessionalProfile = {
        ...profile,
        ...(requestedDealerId ? { dealer_id: requestedDealerId } : {}),
        logo_url: upload.url,
      };
      const saveResponse = await fetch("/api/auth/professional-profile", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(nextProfile),
      });
      const saved = await readJson<ProfileResponse>(saveResponse);
      if (!saveResponse.ok || !saved?.success || !saved.profile) {
        throw new Error(saved?.message || "ذخیره لوگوی مجموعه انجام نشد.");
      }
      setProfile(saved.profile);
      setNotice("لوگوی مجموعه با موفقیت ذخیره شد.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "بارگذاری لوگو انجام نشد.");
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
              <div className={styles.logoPreview}>
                {profile.logo_url ? <img src={String(profile.logo_url)} alt="لوگوی مجموعه" /> : <span>لوگو</span>}
              </div>
              <div className={styles.copy}>
                <h2>{String(profile.name || "نمایشگاه")}</h2>
                <p>فرمت پیشنهادی PNG یا WebP با پس‌زمینه شفاف و تصویر مربعی است.</p>
              </div>
              <label className={styles.uploadButton}>
                {working ? "در حال بارگذاری و ذخیره…" : profile.logo_url ? "تغییر لوگو" : "بارگذاری لوگو"}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={working} onChange={(event) => void uploadLogo(event)} />
              </label>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
