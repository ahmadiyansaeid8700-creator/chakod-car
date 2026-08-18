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
  images?: RawImage[];
};

type ImagesResponse = {
  success?: boolean;
  message?: string;
  listing?: ListingInfo;
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
  image_id?: number | string;
  image_url?: string;
  is_cover?: boolean;
};

const API_BASE = "https://api.chakod.com";
const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 25_000;
const UPLOAD_TIMEOUT_MS = 90_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getToken() {
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
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
  const coverUrl = normalizeUrl(typeof cover === "string" ? cover : cover?.image_url || "");
  const byUrl = new Map<string, NormalizedImage>();

  raw.forEach((item, index) => {
    const url = normalizeUrl(item.image_url || item.url || "");
    if (!url) return;

    const id = Number(item.image_id ?? item.id ?? 0);
    const next: NormalizedImage = {
      id: Number.isFinite(id) ? id : 0,
      url,
      isCover: Boolean(item.is_cover) || Boolean(coverUrl && url === coverUrl),
      sortOrder: Number(item.sort_order ?? index),
    };

    const current = byUrl.get(url);
    if (!current) {
      byUrl.set(url, next);
      return;
    }

    byUrl.set(url, {
      id: current.id > 0 ? current.id : next.id,
      url,
      isCover: current.isCover || next.isCover,
      sortOrder: Math.min(current.sortOrder, next.sortOrder),
    });
  });

  if (coverUrl && !byUrl.has(coverUrl)) {
    byUrl.set(coverUrl, { id: 0, url: coverUrl, isCover: true, sortOrder: -1 });
  }

  return Array.from(byUrl.values()).sort((a, b) => {
    if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

function uploadImage(
  listingId: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  return new Promise<MutationResponse>((resolve, reject) => {
    const token = getToken();
    const directUpload = Boolean(token);
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      directUpload
        ? `${API_BASE}/api/upload-listing-image.php`
        : "/api/auth/listings/images/upload",
    );
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.withCredentials = !directUpload;

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("X-Session-Token", token);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
      }
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || "{}") as MutationResponse;
        resolve(payload);
      } catch {
        reject(new Error("پاسخ سرور برای آپلود عکس معتبر نبود."));
      }
    };
    xhr.onerror = () => reject(new Error("ارتباط با سرور هنگام آپلود عکس قطع شد."));
    xhr.onabort = () => reject(new Error("آپلود عکس متوقف شد."));
    xhr.ontimeout = () => reject(new Error("آپلود بیش از حد طول کشید؛ دوباره تلاش کنید."));

    const body = new FormData();
    body.append("listing_id", listingId);
    body.append("image", file);
    xhr.send(body);
  });
}

function isTimeoutError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function ListingImagesClient({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [images, setImages] = useState<NormalizedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeImageId, setActiveImageId] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const validId = /^\d+$/.test(listingId) && Number(listingId) > 0;
  const imageCount = images.length;
  const canUpload = imageCount < MAX_IMAGE_COUNT;
  const freeSlots = Math.max(0, MAX_IMAGE_COUNT - imageCount);

  async function loadImages(showLoader = true) {
    if (!validId) {
      setError("شناسه آگهی معتبر نیست.");
      if (showLoader) setLoading(false);
      return false;
    }

    if (showLoader) setLoading(true);
    setError("");

    try {
      const response = await fetchWithTimeout(`/api/auth/listings/images/${listingId}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<ImagesResponse>(response);

      if (response.status === 401) {
        window.location.assign(
          `/login?returnTo=${encodeURIComponent(`/account/listings/${listingId}/images`)}`,
        );
        return false;
      }

      if (!response.ok || !payload?.success || !payload.listing) {
        setError(payload?.message || "عکس‌های آگهی دریافت نشد.");
        return false;
      }

      setListing(payload.listing);
      setImages(normalizeImages(payload));
      return true;
    } catch (loadError) {
      setError(
        isTimeoutError(loadError)
          ? "دریافت عکس‌ها بیش از حد طول کشید. دوباره تلاش کنید."
          : "ارتباط با سرویس عکس‌های آگهی برقرار نشد.",
      );
      return false;
    } finally {
      if (showLoader) setLoading(false);
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
      setError("ظرفیت ۶ عکس این آگهی تکمیل است.");
      return;
    }

    if (invalid) {
      setError("فرمت عکس باید JPG، PNG یا WEBP و حجم هر فایل حداکثر ۶ مگابایت باشد.");
      return;
    }

    setWorking(true);
    setUploadProgress(0);
    setError("");
    setNotice("");
    let uploaded = 0;

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const payload = await uploadImage(listingId, file, (fileProgress) => {
          const overall = Math.round(((index + fileProgress / 100) / files.length) * 100);
          setUploadProgress(overall);
        });

        if (!payload?.success) {
          throw new Error(payload?.message || `آپلود ${file.name} انجام نشد.`);
        }
        uploaded += 1;
      }

      setUploadProgress(100);
      const refreshed = await loadImages(false);
      if (!refreshed) {
        setNotice(`${uploaded.toLocaleString("fa-IR")} عکس آپلود شد؛ برای تازه‌سازی گالری دوباره وارد صفحه شوید.`);
      } else if (selected.length > files.length) {
        setNotice(`${uploaded.toLocaleString("fa-IR")} عکس اضافه شد؛ ظرفیت این آگهی ۶ عکس است.`);
      } else {
        setNotice(`${uploaded.toLocaleString("fa-IR")} عکس با موفقیت اضافه شد.`);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "آپلود عکس‌ها انجام نشد.");
      if (uploaded > 0) {
        await loadImages(false);
      }
    } finally {
      setWorking(false);
      setUploadProgress(0);
    }
  }

  async function setCover(image: NormalizedImage) {
    if (!image.id || image.isCover || working) return;
    setWorking(true);
    setActiveImageId(image.id);
    setError("");
    setNotice("");

    try {
      const response = await fetchWithTimeout("/api/auth/listings/images/cover", {
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
        throw new Error(payload?.message || "تغییر عکس اصلی انجام نشد.");
      }

      setImages((current) => current.map((item) => ({ ...item, isCover: item.id === image.id })));
      setNotice("عکس اصلی آگهی تغییر کرد.");
    } catch (coverError) {
      setError(
        isTimeoutError(coverError)
          ? "تغییر عکس اصلی بیش از حد طول کشید. دوباره تلاش کنید."
          : coverError instanceof Error
            ? coverError.message
            : "تغییر عکس اصلی انجام نشد.",
      );
    } finally {
      setActiveImageId(0);
      setWorking(false);
    }
  }

  async function deleteImage(image: NormalizedImage) {
    if (!image.id || working) return;
    if (!window.confirm("این عکس از آگهی حذف شود؟")) return;

    setWorking(true);
    setActiveImageId(image.id);
    setError("");
    setNotice("");

    try {
      const response = await fetchWithTimeout("/api/auth/listings/images/delete", {
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
        throw new Error(payload?.message || "حذف عکس انجام نشد.");
      }

      setNotice("عکس حذف شد.");
      await loadImages(false);
    } catch (deleteError) {
      setError(
        isTimeoutError(deleteError)
          ? "حذف عکس بیش از حد طول کشید. دوباره تلاش کنید."
          : deleteError instanceof Error
            ? deleteError.message
            : "حذف عکس انجام نشد.",
      );
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
          <Link className={styles.backLink} href={`/account/listings/${listingId}/edit`}>← بازگشت به ویرایش</Link>
          <Link className={styles.brand} href="/" aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده‌سازی عکس‌ها</h1>
            <p>چند لحظه صبر کنید.</p>
          </section>
        )}

        {!loading && error && !listing && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>عکس‌ها در دسترس نیستند</h1>
            <p>{error}</p>
            <button type="button" onClick={() => void loadImages()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && listing && (
          <>
            <section className={styles.titleCard}>
              <div className={styles.titleText}>
                <span>عکس‌های آگهی</span>
                <h1>{listing.title || `آگهی شماره ${listing.id}`}</h1>
                <p>تا ۶ عکس واضح از زوایای مختلف خودرو انتخاب کنید. عکس اصلی روی کارت آگهی دیده می‌شود.</p>
              </div>
              <div className={styles.capacity} aria-label={`${imageCount} عکس از ۶`}>
                <strong>{imageCount.toLocaleString("fa-IR")}</strong>
                <span>از ۶ عکس</span>
              </div>
            </section>

            <div className={styles.progress} aria-hidden="true">
              {Array.from({ length: MAX_IMAGE_COUNT }, (_, index) => (
                <i key={index} className={index < imageCount ? styles.progressFilled : ""} />
              ))}
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {notice && <div className={styles.notice}>{notice}</div>}

            <section className={styles.board}>
              <header className={styles.boardHeader}>
                <div>
                  <span>گالری خودرو</span>
                  <h2>{cover ? "عکس اصلی را مشخص کنید" : "اولین عکس را اضافه کنید"}</h2>
                </div>
                {canUpload ? (
                  <label className={`${styles.addButton} ${working ? styles.disabled : ""}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={working}
                      onChange={(event) => void uploadFiles(event)}
                    />
                    {working
                      ? uploadProgress > 0
                        ? `آپلود ${uploadProgress.toLocaleString("fa-IR")}٪`
                        : "در حال اتصال…"
                      : "+ افزودن عکس"}
                  </label>
                ) : (
                  <span className={styles.fullBadge}>۶/۶ تکمیل</span>
                )}
              </header>

              <div className={styles.slotsGrid}>
                {images.map((image, index) => (
                  <article
                    key={`${image.id}-${image.url}`}
                    className={`${styles.photoSlot} ${image.isCover ? styles.coverSlot : ""}`}
                  >
                    <div className={styles.photoFrame}>
                      <img src={image.url} alt={`عکس ${index + 1} آگهی`} />
                      <span className={styles.slotNumber}>{(index + 1).toLocaleString("fa-IR")}</span>
                      {image.isCover ? <span className={styles.coverBadge}>عکس اصلی</span> : null}
                    </div>
                    <div className={styles.photoActions}>
                      <button
                        type="button"
                        disabled={!image.id || image.isCover || working}
                        onClick={() => void setCover(image)}
                      >
                        {activeImageId === image.id && working
                          ? "در حال ذخیره…"
                          : image.isCover
                            ? "اصلی"
                            : "انتخاب به‌عنوان اصلی"}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        disabled={!image.id || working}
                        onClick={() => void deleteImage(image)}
                        aria-label={`حذف عکس ${index + 1}`}
                      >
                        حذف
                      </button>
                    </div>
                  </article>
                ))}

                {Array.from({ length: freeSlots }, (_, index) => (
                  <label key={`empty-${index}`} className={`${styles.emptySlot} ${working ? styles.disabled : ""}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={working}
                      onChange={(event) => void uploadFiles(event)}
                    />
                    <span className={styles.plus}>＋</span>
                    <strong>{working ? "در حال آپلود…" : "افزودن عکس"}</strong>
                    <small>جایگاه {(imageCount + index + 1).toLocaleString("fa-IR")}</small>
                  </label>
                ))}
              </div>
            </section>

            <section className={styles.hints}>
              <div><b>۱</b><span>عکس اصلی را از نمای مناسب خودرو انتخاب کنید.</span></div>
              <div><b>۲</b><span>عکس تار، اسکرین‌شات و تصویر تکراری استفاده نکنید.</span></div>
              <div><b>۳</b><span>JPG، PNG یا WEBP؛ حداکثر ۶ مگابایت برای هر عکس.</span></div>
            </section>

            <div className={styles.bottomActions}>
              <Link href={`/account/listings/${listingId}/edit`}>تمام؛ بازگشت به ویرایش آگهی</Link>
            </div>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
