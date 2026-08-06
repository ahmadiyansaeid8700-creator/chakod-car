"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../../../components/MobileBottomNav";
import styles from "./page.module.css";

type RawImage = {
  id?: number | string;
  image_id?: number | string;
  image_url?: string | null;
  url?: string | null;
  is_cover?: boolean | number;
  sort_order?: number | string;
};

type ListingInfo = {
  id: number;
  title?: string;
  cover_image?: string | { image_url?: string } | null;
  image_count?: number;
};

type ImagesResponse = {
  success?: boolean;
  message?: string;
  listing?: ListingInfo & { images?: RawImage[] };
  images?: RawImage[];
};

type NormalizedImage = {
  id: number;
  url: string;
  isCover: boolean;
  sortOrder: number;
};

type MutationResponse = {
  success?: boolean;
  message?: string;
  image_id?: number;
  image_url?: string;
  is_cover?: boolean;
};

const MAX_IMAGE_COUNT = 10;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function normalizeUrl(value?: string | null) {
  if (!value) return "";
  const url = value.trim();
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return path.startsWith("/uploads/")
    ? `https://chakod.com${path}`
    : `https://api.chakod.com${path}`;
}

function normalizeImages(payload: ImagesResponse | null): NormalizedImage[] {
  const raw = [
    ...(Array.isArray(payload?.images) ? payload!.images! : []),
    ...(Array.isArray(payload?.listing?.images) ? payload!.listing!.images! : []),
  ];
  const cover = payload?.listing?.cover_image;
  const coverUrl = typeof cover === "string" ? cover : cover?.image_url || "";
  if (coverUrl) {
    raw.unshift({ image_url: coverUrl, is_cover: true, sort_order: -1 });
  }

  const seen = new Set<string>();
  return raw
    .map((item, index) => {
      const url = normalizeUrl(item.image_url || item.url || "");
      return {
        id: Number(item.image_id ?? item.id ?? 0),
        url,
        isCover: Boolean(item.is_cover),
        sortOrder: Number(item.sort_order ?? index),
      };
    })
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
}

export default function ListingImagesClient({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [images, setImages] = useState<NormalizedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [activeImageId, setActiveImageId] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const validId = /^\d+$/.test(listingId) && Number(listingId) > 0;
  const imageCount = images.length;
  const canUpload = imageCount < MAX_IMAGE_COUNT;

  async function loadImages() {
    if (!validId) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/listings/images/${listingId}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<ImagesResponse>(response);

      if (response.status === 401 || response.status === 403) {
        window.location.assign(
          `/login?returnTo=${encodeURIComponent(`/account/listings/${listingId}/images`)}`,
        );
        return;
      }

      if (!response.ok || !payload?.success || !payload.listing) {
        setError(payload?.message || "تصاویر آگهی دریافت نشد.");
        return;
      }

      setListing(payload.listing);
      setImages(normalizeImages(payload));
    } catch {
      setError("ارتباط با سرویس تصاویر برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadImages();
  }, [listingId]);

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length || working) return;

    const available = Math.max(0, MAX_IMAGE_COUNT - imageCount);
    const files = selected.slice(0, available);
    const invalid = files.find(
      (file) => !ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_IMAGE_SIZE,
    );

    if (!available) {
      setError("برای هر آگهی حداکثر ۱۰ تصویر قابل ثبت است.");
      return;
    }

    if (invalid) {
      setError("فرمت تصاویر باید JPG، PNG یا WEBP و حجم هر فایل حداکثر ۶ مگابایت باشد.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");
    let uploaded = 0;

    try {
      for (const file of files) {
        const body = new FormData();
        body.set("listing_id", listingId);
        body.set("image", file);

        const response = await fetch("/api/auth/listings/images/upload", {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
          body,
        });
        const payload = await readJson<MutationResponse>(response);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || `آپلود تصویر ${file.name} انجام نشد.`);
        }
        uploaded += 1;
      }

      setNotice(`${new Intl.NumberFormat("fa-IR").format(uploaded)} تصویر با موفقیت اضافه شد.`);
      await loadImages();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "آپلود تصاویر انجام نشد.");
    } finally {
      setWorking(false);
    }
  }

  async function setCover(image: NormalizedImage) {
    if (!image.id || image.isCover || working) return;
    setWorking(true);
    setActiveImageId(image.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/listings/images/cover", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ listing_id: Number(listingId), image_id: image.id }),
      });
      const payload = await readJson<MutationResponse>(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "تغییر تصویر اصلی انجام نشد.");
      }

      setImages((current) => current.map((item) => ({ ...item, isCover: item.id === image.id })));
      setNotice("تصویر اصلی آگهی تغییر کرد.");
    } catch (coverError) {
      setError(coverError instanceof Error ? coverError.message : "تغییر تصویر اصلی انجام نشد.");
    } finally {
      setActiveImageId(0);
      setWorking(false);
    }
  }

  async function deleteImage(image: NormalizedImage) {
    if (!image.id || working) return;
    const confirmed = window.confirm("این تصویر از آگهی حذف شود؟");
    if (!confirmed) return;

    setWorking(true);
    setActiveImageId(image.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/listings/images/delete", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ listing_id: Number(listingId), image_id: image.id }),
      });
      const payload = await readJson<MutationResponse>(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "حذف تصویر انجام نشد.");
      }

      setNotice("تصویر از آگهی حذف شد.");
      await loadImages();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "حذف تصویر انجام نشد.");
    } finally {
      setActiveImageId(0);
      setWorking(false);
    }
  }

  const cover = useMemo(() => images.find((image) => image.isCover) || images[0] || null, [images]);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href={`/account/listings/${listingId}`}>← مدیریت آگهی</Link>
          <Link className={styles.brand} href="/">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال دریافت تصاویر آگهی</h1>
          </section>
        )}

        {!loading && error && !listing && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>تصاویر در دسترس نیستند</h1>
            <p>{error}</p>
            <button type="button" onClick={() => void loadImages()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && listing && (
          <>
            <section className={styles.hero}>
              <div>
                <span>مدیریت رسانه آگهی</span>
                <h1>{listing.title || `آگهی شماره ${listing.id}`}</h1>
                <p>تصاویر واضح و واقعی اعتماد خریدار را بیشتر می‌کنند. اولین تصویر اصلی در کارت و صفحه آگهی نمایش داده می‌شود.</p>
              </div>
              <div className={styles.heroStats}>
                <strong>{new Intl.NumberFormat("fa-IR").format(imageCount)}</strong>
                <span>تصویر از {new Intl.NumberFormat("fa-IR").format(MAX_IMAGE_COUNT)}</span>
              </div>
            </section>

            {error && <div className={styles.error}>{error}</div>}
            {notice && <div className={styles.notice}>{notice}</div>}

            <section className={styles.uploadPanel}>
              <div>
                <span>افزودن تصویر</span>
                <h2>تصاویر جدید را انتخاب کنید</h2>
                <p>فرمت‌های JPG، PNG و WEBP با حداکثر حجم ۶ مگابایت برای هر تصویر پذیرفته می‌شوند.</p>
              </div>
              <label className={`${styles.uploadButton} ${!canUpload || working ? styles.disabled : ""}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={!canUpload || working}
                  onChange={(event) => void uploadFiles(event)}
                />
                {working ? "در حال انجام عملیات..." : canUpload ? "انتخاب تصاویر" : "ظرفیت تصاویر تکمیل است"}
              </label>
            </section>

            {cover && (
              <section className={styles.coverPanel}>
                <div className={styles.coverImage}><img src={cover.url} alt="تصویر اصلی آگهی" /></div>
                <div>
                  <span>تصویر اصلی فعلی</span>
                  <h2>این تصویر روی کارت آگهی نمایش داده می‌شود</h2>
                  <p>برای تغییر آن، روی «انتخاب به‌عنوان اصلی» در یکی از تصاویر پایین بزنید.</p>
                </div>
              </section>
            )}

            {images.length ? (
              <section className={styles.imageGrid}>
                {images.map((image, index) => (
                  <article key={`${image.id}-${image.url}`} className={`${styles.imageCard} ${image.isCover ? styles.coverCard : ""}`}>
                    <div className={styles.imageWrap}>
                      <img src={image.url} alt={`تصویر ${index + 1} آگهی`} />
                      {image.isCover && <span>تصویر اصلی</span>}
                    </div>
                    <div className={styles.imageActions}>
                      <button
                        type="button"
                        disabled={!image.id || image.isCover || working}
                        onClick={() => void setCover(image)}
                      >
                        {activeImageId === image.id && working ? "در حال ذخیره..." : image.isCover ? "تصویر اصلی" : "انتخاب به‌عنوان اصلی"}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        disabled={!image.id || working}
                        onClick={() => void deleteImage(image)}
                      >
                        حذف
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className={styles.emptyState}>
                <span>▧</span>
                <h2>هنوز تصویری ثبت نشده است</h2>
                <p>حداقل یک تصویر واقعی از خودرو اضافه کنید تا آگهی برای خریداران قابل اعتمادتر باشد.</p>
              </section>
            )}

            <div className={styles.bottomActions}>
              <Link href={`/account/listings/${listingId}`}>بازگشت به مدیریت آگهی</Link>
              <Link href={`/cars/${listingId}`}>مشاهده نسخه عمومی</Link>
            </div>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
