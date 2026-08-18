"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import styles from "./InlineListingImagesManager.module.css";

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
  title?: string | null;
  cover_image?: string | { image_url?: string | null } | null;
  images?: RawImage[];
};

type ImagesResponse = {
  success?: boolean;
  message?: string;
  listing?: ListingInfo;
  images?: RawImage[];
};

type MutationResponse = {
  success?: boolean;
  message?: string;
};

type ImageItem = {
  id: number;
  url: string;
  isCover: boolean;
  sortOrder: number;
};

const MAX_IMAGE_COUNT = 10;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function normalizeImages(payload: ImagesResponse | null): ImageItem[] {
  const raw = [
    ...(Array.isArray(payload?.images) ? payload!.images! : []),
    ...(Array.isArray(payload?.listing?.images) ? payload!.listing!.images! : []),
  ];

  const cover = payload?.listing?.cover_image;
  const coverUrl = typeof cover === "string" ? cover : cover?.image_url || "";
  if (coverUrl) raw.unshift({ image_url: coverUrl, is_cover: true, sort_order: -1 });

  const seen = new Set<string>();
  return raw
    .map((item, index) => ({
      id: Number(item.image_id ?? item.id ?? 0),
      url: normalizeUrl(item.image_url || item.url || ""),
      isCover: Boolean(item.is_cover),
      sortOrder: Number(item.sort_order ?? index),
    }))
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

export default function InlineListingImagesManager({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeImageId, setActiveImageId] = useState(0);

  const validId = /^\d+$/.test(listingId) && Number(listingId) > 0;
  const imageCount = images.length;
  const canUpload = imageCount < MAX_IMAGE_COUNT;
  const cover = useMemo(() => images.find((item) => item.isCover) || images[0] || null, [images]);

  async function loadImages() {
    if (!validId) {
      setError("شناسه آگهی معتبر نیست.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/listings/images/${listingId}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await readJson<ImagesResponse>(response);

      if (!response.ok || !payload?.success || !payload.listing) {
        setError(payload?.message || "تصاویر آگهی دریافت نشد.");
        return;
      }

      setListing(payload.listing);
      setImages(normalizeImages(payload));
      setLoaded(true);
    } catch {
      setError("ارتباط با سرویس تصاویر برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !loaded && !loading) void loadImages();
  }, [open, loaded, loading]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length || working) return;

    const available = Math.max(0, MAX_IMAGE_COUNT - imageCount);
    const files = selected.slice(0, available);
    if (!available) {
      setError("برای هر آگهی حداکثر ۱۰ تصویر قابل ثبت است.");
      return;
    }

    const invalid = files.find(
      (file) => !ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_IMAGE_SIZE,
    );
    if (invalid) {
      setError("فرمت باید JPG، PNG یا WEBP و حجم هر تصویر حداکثر ۶ مگابایت باشد.");
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
          body,
        });
        const payload = await readJson<MutationResponse>(response);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || `آپلود ${file.name} انجام نشد.`);
        }
        uploaded += 1;
      }

      setNotice(`${uploaded.toLocaleString("fa-IR")} تصویر اضافه شد.`);
      await loadImages();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "آپلود تصاویر انجام نشد.");
    } finally {
      setWorking(false);
    }
  }

  async function setCover(image: ImageItem) {
    if (!image.id || image.isCover || working) return;
    setWorking(true);
    setActiveImageId(image.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/listings/images/cover", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: Number(listingId), image_id: image.id }),
      });
      const payload = await readJson<MutationResponse>(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "تغییر عکس اصلی انجام نشد.");
      }

      setImages((current) => current.map((item) => ({ ...item, isCover: item.id === image.id })));
      setNotice("عکس اصلی آگهی تغییر کرد.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تغییر عکس اصلی انجام نشد.");
    } finally {
      setActiveImageId(0);
      setWorking(false);
    }
  }

  async function deleteImage(image: ImageItem) {
    if (!image.id || working) return;
    if (!window.confirm("این تصویر از آگهی حذف شود؟")) return;

    setWorking(true);
    setActiveImageId(image.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/listings/images/delete", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: Number(listingId), image_id: image.id }),
      });
      const payload = await readJson<MutationResponse>(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "حذف تصویر انجام نشد.");
      }

      setNotice("تصویر حذف شد.");
      await loadImages();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "حذف تصویر انجام نشد.");
    } finally {
      setActiveImageId(0);
      setWorking(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.launcher} onClick={() => setOpen(true)}>
        <span aria-hidden="true">▣</span>
        <strong>مدیریت عکس‌ها</strong>
        {loaded ? <small>{imageCount.toLocaleString("fa-IR")}/۱۰</small> : null}
      </button>

      {open ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-label="مدیریت عکس‌های آگهی">
            <header className={styles.header}>
              <div>
                <span>تصاویر آگهی</span>
                <h2>{listing?.title || `آگهی شماره ${listingId}`}</h2>
              </div>
              <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="بستن">×</button>
            </header>

            <div className={styles.toolbar}>
              <div>
                <strong>{imageCount.toLocaleString("fa-IR")} از ۱۰ عکس</strong>
                <small>عکس اصلی روی کارت خودرو نمایش داده می‌شود.</small>
              </div>
              <label className={`${styles.upload} ${!canUpload || working ? styles.disabled : ""}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={!canUpload || working}
                  onChange={(event) => void uploadFiles(event)}
                />
                {working ? "در حال انجام…" : canUpload ? "+ افزودن عکس" : "ظرفیت تکمیل"}
              </label>
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}
            {notice ? <div className={styles.notice}>{notice}</div> : null}

            <div className={styles.content}>
              {loading ? <div className={styles.state}>در حال دریافت تصاویر…</div> : null}
              {!loading && !images.length ? (
                <div className={styles.empty}>
                  <strong>هنوز عکسی برای این آگهی ثبت نشده</strong>
                  <span>از دکمه «افزودن عکس» تصاویر خودرو را اضافه کنید.</span>
                </div>
              ) : null}

              {cover ? (
                <div className={styles.coverStrip}>
                  <img src={cover.url} alt="عکس اصلی آگهی" />
                  <div><small>عکس اصلی فعلی</small><strong>این تصویر روی کارت آگهی دیده می‌شود</strong></div>
                </div>
              ) : null}

              {images.length ? (
                <div className={styles.grid}>
                  {images.map((image, index) => (
                    <article key={`${image.id}-${image.url}`} className={`${styles.card} ${image.isCover ? styles.coverCard : ""}`}>
                      <div className={styles.imageWrap}>
                        <img src={image.url} alt={`تصویر ${index + 1} آگهی`} />
                        {image.isCover ? <span>اصلی</span> : null}
                      </div>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          disabled={!image.id || image.isCover || working}
                          onClick={() => void setCover(image)}
                        >
                          {working && activeImageId === image.id ? "…" : image.isCover ? "عکس اصلی" : "انتخاب اصلی"}
                        </button>
                        <button
                          type="button"
                          className={styles.delete}
                          disabled={!image.id || working}
                          onClick={() => void deleteImage(image)}
                        >حذف</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <footer className={styles.footer}>
              <Link href={`/account/listings/${listingId}/images`}>صفحه کامل مدیریت تصاویر</Link>
              <button type="button" onClick={() => setOpen(false)}>تمام</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
