"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import styles from "./page.module.css";

type GalleryItem = {
  id: string;
  url: string;
  title: string;
  caption: string;
};

type Resume = {
  activity_id: number;
  headline: string;
  about: string;
  specialties: string[];
  gallery: GalleryItem[];
  published: boolean;
  updated_at: string;
};

type ResumeResponse = {
  success?: boolean;
  message?: string;
  resume?: Resume;
  public_url?: string;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  url?: string;
};

function tokenHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeMediaUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    return raw
      .replace(/^http:\/\/api\.chakod\.com\//i, "https://api.chakod.com/")
      .replace(/^https:\/\/api\.chakod\.com\/uploads\//i, "https://chakod.com/uploads/");
  }
  if (raw.startsWith("/uploads/")) return `https://chakod.com${raw}`;
  if (raw.startsWith("uploads/")) return `https://chakod.com/${raw}`;
  if (raw.startsWith("/")) return raw;
  return raw;
}

function newGalleryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function BusinessResumeEditor({ activityId, activityName }: { activityId: number; activityName: string }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resume, setResume] = useState<Resume>({
    activity_id: activityId,
    headline: "",
    about: "",
    specialties: [],
    gallery: [],
    published: true,
    updated_at: "",
  });
  const [publicUrl, setPublicUrl] = useState(`/businesses/activity/${activityId}`);
  const [specialtyDraft, setSpecialtyDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/auth/business-resume/${activityId}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json", ...tokenHeaders() },
        });
        const payload = await readJson<ResumeResponse>(response);
        if (!response.ok || !payload?.success || !payload.resume) {
          throw new Error(payload?.message || "رزومه مجموعه دریافت نشد.");
        }
        setResume(payload.resume);
        if (payload.public_url) setPublicUrl(payload.public_url);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(caught instanceof Error ? caught.message : "رزومه مجموعه دریافت نشد.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [activityId]);

  const galleryCountText = useMemo(
    () => `${new Intl.NumberFormat("fa-IR").format(resume.gallery.length)} از ۱۲ تصویر`,
    [resume.gallery.length],
  );

  async function saveResume(nextResume = resume, successMessage = "رزومه و آلبوم ذخیره شد.") {
    if (saving) return false;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/business-resume/${activityId}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...tokenHeaders(),
        },
        body: JSON.stringify(nextResume),
      });
      const payload = await readJson<ResumeResponse>(response);
      if (!response.ok || !payload?.success || !payload.resume) {
        throw new Error(payload?.message || "ذخیره رزومه انجام نشد.");
      }
      setResume(payload.resume);
      if (payload.public_url) setPublicUrl(payload.public_url);
      setNotice(successMessage);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ذخیره رزومه انجام نشد.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function addSpecialty() {
    const value = specialtyDraft.trim();
    if (!value || resume.specialties.includes(value) || resume.specialties.length >= 12) return;
    setResume((current) => ({ ...current, specialties: [...current.specialties, value] }));
    setSpecialtyDraft("");
  }

  function specialtyKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSpecialty();
  }

  function updateGalleryItem(id: string, patch: Partial<GalleryItem>) {
    setResume((current) => ({
      ...current,
      gallery: current.gallery.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeGalleryItem(id: string) {
    setResume((current) => ({ ...current, gallery: current.gallery.filter((item) => item.id !== id) }));
  }

  function moveGalleryItem(index: number, direction: -1 | 1) {
    setResume((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.gallery.length) return current;
      const gallery = [...current.gallery];
      [gallery[index], gallery[nextIndex]] = [gallery[nextIndex], gallery[index]];
      return { ...current, gallery };
    });
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading || resume.gallery.length >= 12) return;
    if (!file.type.startsWith("image/")) {
      setError("فایل انتخاب‌شده باید تصویر باشد.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("فرمت تصویر باید JPG، PNG یا WebP باشد.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("حجم هر تصویر باید حداکثر ۶ مگابایت باشد.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);

    try {
      const form = new FormData();
      form.set("kind", "gallery");
      form.set("file", file);
      const response = await fetch("/api/auth/professional-profile/upload", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: tokenHeaders(),
        body: form,
        signal: controller.signal,
      });
      const payload = await readJson<UploadResponse>(response);
      if (!response.ok || !payload?.success || !payload.url) {
        throw new Error(payload?.message || "بارگذاری تصویر انجام نشد.");
      }

      const newItem: GalleryItem = {
        id: newGalleryId(),
        url: String(payload.url).trim(),
        title: "",
        caption: "",
      };
      const nextResume = { ...resume, gallery: [...resume.gallery, newItem] };
      setResume(nextResume);
      await saveResume(nextResume, "تصویر به آلبوم اضافه و ذخیره شد.");
    } catch (caught) {
      const isAbort = caught instanceof DOMException && caught.name === "AbortError";
      setError(
        isAbort
          ? "بارگذاری تصویر بیش از حد طول کشید. دوباره تلاش کنید."
          : caught instanceof Error
            ? caught.message
            : "بارگذاری تصویر انجام نشد.",
      );
    } finally {
      window.clearTimeout(timeout);
      setUploading(false);
    }
  }

  return (
    <section className={styles.resumeCard} id="business-resume">
      <div className={styles.resumeHead}>
        <div>
          <span>رزومه کسب‌وکار</span>
          <h2>ویترین و آلبوم {activityName}</h2>
          <p>این محتوا صفحه عمومی مجموعه را می‌سازد؛ همان صفحه‌ای که می‌توانی برای مشتری‌ها بفرستی و بعد تبلیغش کنی.</p>
        </div>
        {resume.updated_at ? <a href={publicUrl} target="_blank" rel="noreferrer">مشاهده صفحه عمومی</a> : null}
      </div>

      {loading ? <div className={styles.resumeState}>در حال دریافت رزومه…</div> : null}
      {error ? <div className={styles.resumeError}>{error}</div> : null}
      {notice ? <div className={styles.resumeNotice}>{notice}</div> : null}

      {!loading ? (
        <>
          <div className={styles.resumeFields}>
            <label>
              <span>تیتر معرفی</span>
              <input
                value={resume.headline}
                onChange={(event) => setResume((current) => ({ ...current, headline: event.target.value }))}
                placeholder="مثلاً فروش تخصصی قطعات بهمن موتور در رشت"
                maxLength={160}
              />
            </label>
            <label>
              <span>درباره مجموعه</span>
              <textarea
                value={resume.about}
                onChange={(event) => setResume((current) => ({ ...current, about: event.target.value }))}
                placeholder="سابقه، مزیت مجموعه، نحوه ارسال، برندهایی که کار می‌کنید و هر چیزی که مشتری باید بداند."
                maxLength={1600}
              />
            </label>
          </div>

          <div className={styles.specialtiesBlock}>
            <div className={styles.resumeSubhead}>
              <div><strong>تخصص‌ها و خدمات</strong><small>حداکثر ۱۲ مورد</small></div>
            </div>
            <div className={styles.specialtyInput}>
              <input
                value={specialtyDraft}
                onChange={(event) => setSpecialtyDraft(event.target.value)}
                onKeyDown={specialtyKeyDown}
                placeholder="مثلاً قطعات بدنه"
                maxLength={70}
              />
              <button type="button" onClick={addSpecialty} disabled={!specialtyDraft.trim() || resume.specialties.length >= 12}>افزودن</button>
            </div>
            {resume.specialties.length ? (
              <div className={styles.specialtyChips}>
                {resume.specialties.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setResume((current) => ({ ...current, specialties: current.specialties.filter((value) => value !== item) }))}
                    title="حذف"
                  >
                    {item}<span>×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.albumBlock}>
            <div className={styles.resumeSubhead}>
              <div><strong>آلبوم و نمونه‌کارها</strong><small>{galleryCountText}</small></div>
              <button
                type="button"
                className={styles.addImageButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || resume.gallery.length >= 12}
              >
                {uploading ? "در حال بارگذاری…" : "+ افزودن تصویر"}
              </button>
              <input
                ref={fileInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void uploadImage(event)}
              />
            </div>

            {resume.gallery.length ? (
              <div className={styles.albumGrid}>
                {resume.gallery.map((item, index) => (
                  <article key={item.id} className={styles.albumItem}>
                    <div className={styles.albumImage}>
                      <img src={normalizeMediaUrl(item.url)} alt={item.title || `تصویر ${index + 1}`} />
                      <span>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                    </div>
                    <div className={styles.albumItemBody}>
                      <input
                        value={item.title}
                        onChange={(event) => updateGalleryItem(item.id, { title: event.target.value })}
                        placeholder="عنوان تصویر"
                        maxLength={100}
                      />
                      <textarea
                        value={item.caption}
                        onChange={(event) => updateGalleryItem(item.id, { caption: event.target.value })}
                        placeholder="توضیح کوتاه"
                        maxLength={260}
                      />
                      <div className={styles.albumControls}>
                        <button type="button" onClick={() => moveGalleryItem(index, -1)} disabled={index === 0}>قبلی</button>
                        <button type="button" onClick={() => moveGalleryItem(index, 1)} disabled={index === resume.gallery.length - 1}>بعدی</button>
                        <button type="button" data-danger="true" onClick={() => removeGalleryItem(item.id)}>حذف</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <button type="button" className={styles.albumEmpty} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <span>＋</span>
                <strong>اولین تصویر مجموعه را اضافه کن</strong>
                <small>فروشگاه، محصولات، تیم، انبار یا نمونه‌کارها</small>
              </button>
            )}
          </div>

          <div className={styles.resumeFooter}>
            <label className={styles.publishToggle}>
              <input
                type="checkbox"
                checked={resume.published}
                onChange={(event) => setResume((current) => ({ ...current, published: event.target.checked }))}
              />
              <span><strong>صفحه عمومی فعال باشد</strong><small>با خاموش کردن، رزومه برای کاربران عمومی نمایش داده نمی‌شود.</small></span>
            </label>
            <button type="button" className={styles.saveResumeButton} disabled={saving || uploading} onClick={() => void saveResume()}>
              {saving ? "در حال ذخیره…" : "ذخیره رزومه و آلبوم"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
