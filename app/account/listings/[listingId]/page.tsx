"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API_BASE = "https://api.chakod.com";

type ListingImage = {
  id: number;
  listing_id: number;
  image_url: string;
  is_cover: boolean;
  sort_order?: number;
  created_at?: string;
};

type ManagedListing = {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  mileage_km?: string | number | null;
  price_toman?: string | number | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  location_label?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  category_code?: string;
  color?: string;
  body_status?: string;
  transmission?: string;
  fuel_type?: string;
  description?: string;
  status: {
    code: string;
    title: string;
    raw?: string;
  };
  is_active?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

type ManageResponse = {
  success: boolean;
  message?: string;
  access?: {
    can_view: boolean;
    can_manage: boolean;
    reason?: string;
  };
  listing?: ManagedListing;
  images?: ListingImage[];
};

type UploadItem = {
  localId: string;
  file: File;
  previewUrl: string;
  status: "selected" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function formatNumber(value: number | string | null | undefined) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "۰";
  return n.toLocaleString("fa-IR");
}

function formatPrice(value: number | string | null | undefined) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return "قیمت توافقی";
  }

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${n.toLocaleString("fa-IR")} تومان`;
}

function statusClass(code?: string) {
  switch (code) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "sold":
      return "sold";
    case "inactive":
    case "expired":
    case "deleted":
      return "inactive";
    default:
      return "pending";
  }
}


type ManageAction =
  | "mark_sold"
  | "disable_listing"
  | "reactivate_listing"
  | "delete_listing";

type LoadOptions = {
  preserveFeedback?: boolean;
};

const MAIN_SITE = "https://chakod.com";

function buildImageCandidates(value?: string | null) {
  const raw = String(value || "").trim().replace(/\\/g, "/");
  const candidates: string[] = [];

  const push = (candidate?: string | null) => {
    const clean = String(candidate || "").trim();
    if (clean && !candidates.includes(clean)) candidates.push(clean);
  };

  if (raw) {
    if (raw.startsWith("//")) {
      push(`https:${raw}`);
    } else if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
      push(raw);

      try {
        const parsed = new URL(raw);
        const path = `${parsed.pathname}${parsed.search}`;

        if (parsed.hostname === "api.chakod.com") push(`${MAIN_SITE}${path}`);
        if (parsed.hostname === "chakod.com" || parsed.hostname === "www.chakod.com") {
          push(`${API_BASE}${path}`);
        }
      } catch {
        // The original URL remains the first candidate.
      }
    } else {
      const cleanPath = raw.replace(/^\.\//, "");
      const path = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
      push(`${API_BASE}${path}`);
      push(`${MAIN_SITE}${path}`);
    }
  }

  push("/brand/chakod-logo-full.png");
  return candidates;
}

function ListingImage({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const candidates = buildImageCandidates(src);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const safeIndex = Math.min(candidateIndex, candidates.length - 1);
  const currentSrc = candidates[safeIndex] || "/brand/chakod-logo-full.png";
  const isFallback = currentSrc.includes("/brand/chakod-logo-full.png");

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`${className} ${isFallback ? "imageFallback" : ""}`.trim()}
      onError={() => {
        setCandidateIndex((current) => Math.min(current + 1, candidates.length - 1));
      }}
    />
  );
}

function statusDescription(code?: string) {
  switch (String(code || "").toLowerCase()) {
    case "active":
      return "آگهی در سایت منتشر است و کاربران می‌توانند آن را ببینند.";
    case "pending":
      return "آگهی ثبت شده و در صف بررسی کارشناسی قرار دارد.";
    case "rejected":
      return "آگهی نیاز به اصلاح دارد؛ بعد از اصلاح دوباره ارسالش کنید.";
    case "sold":
      return "آگهی به‌عنوان فروخته‌شده از چرخه فروش خارج شده است.";
    case "inactive":
    case "expired":
      return "نمایش آگهی متوقف است و با بازفعال‌سازی دوباره بررسی می‌شود.";
    case "deleted":
      return "آگهی بایگانی شده و در سایت نمایش داده نمی‌شود.";
    default:
      return "وضعیت آگهی از همین صفحه قابل پیگیری است.";
  }
}

function isActionAvailable(status: string, action: ManageAction) {
  const code = String(status || "pending").toLowerCase();

  if (code === "active") {
    return action === "mark_sold" || action === "disable_listing" || action === "delete_listing";
  }

  if (code === "pending") {
    return action === "disable_listing" || action === "delete_listing";
  }

  if (code === "rejected" || code === "inactive" || code === "expired") {
    return action === "reactivate_listing" || action === "delete_listing";
  }

  if (code === "sold" || code === "deleted") {
    return action === "reactivate_listing";
  }

  return action === "reactivate_listing" || action === "delete_listing";
}

function actionCopy(action: ManageAction, status: string) {
  const code = String(status || "pending").toLowerCase();

  if (action === "mark_sold") {
    return { icon: "✓", title: "فروخته شد", text: "آگهی از نتایج فروش خارج می‌شود." };
  }

  if (action === "disable_listing") {
    return { icon: "Ⅱ", title: "توقف موقت", text: "نمایش آگهی بدون حذف اطلاعات متوقف می‌شود." };
  }

  if (action === "delete_listing") {
    return { icon: "×", title: "حذف / بایگانی", text: "آگهی از چرخه نمایش و مدیریت روزمره خارج می‌شود." };
  }

  if (code === "sold") {
    return { icon: "↻", title: "بازگرداندن به فروش", text: "آگهی دوباره برای بررسی و انتشار ارسال می‌شود." };
  }

  if (code === "deleted") {
    return { icon: "↻", title: "بازیابی آگهی", text: "آگهی از بایگانی خارج و دوباره بررسی می‌شود." };
  }

  if (code === "rejected") {
    return { icon: "↻", title: "ارسال دوباره", text: "آگهی اصلاح‌شده دوباره برای بررسی ارسال می‌شود." };
  }

  return { icon: "↻", title: "بازفعال‌سازی", text: "آگهی دوباره برای بررسی و انتشار ارسال می‌شود." };
}

function actionConfirmation(action: ManageAction) {
  switch (action) {
    case "mark_sold":
      return "آگهی به‌عنوان فروخته‌شده ثبت شود؟";
    case "disable_listing":
      return "نمایش این آگهی موقتاً متوقف شود؟";
    case "delete_listing":
      return "این آگهی حذف و بایگانی شود؟ اطلاعات آن از صفحه عمومی خارج می‌شود.";
    default:
      return "";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "ثبت نشده";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function uploadImageWithProgress(
  listingId: number,
  item: UploadItem,
  token: string,
  onProgress: (progress: number) => void
): Promise<{ success?: boolean; message?: string; [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE}/api/upload-listing-image.php`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        onProgress(50);
      }
    };

    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("پاسخ سرور برای آپلود تصویر معتبر نبود."));
      }
    };

    xhr.onerror = () => {
      reject(new Error("ارتباط با سرور هنگام آپلود تصویر قطع شد."));
    };

    const formData = new FormData();
    formData.append("listing_id", String(listingId));
    formData.append("image", item.file);

    xhr.send(formData);
  });
}

export default function ListingManagePage() {
  const params = useParams<{ listingId: string }>();
  const listingId = Number(params?.listingId || 0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coverLoadingId, setCoverLoadingId] = useState<number | null>(null);

  const [listing, setListing] = useState<ManagedListing | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [canManage, setCanManage] = useState(false);

  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  async function loadListing(options: LoadOptions = {}) {
    if (!listingId) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!options.preserveFeedback) {
      setError("");
      setMessage("");
    }

    try {
      const token = getToken();

      const res = await fetch(
        `${API_BASE}/api/listing-manage.php?listing_id=${encodeURIComponent(listingId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        }
      );

      const json: ManageResponse = await res.json();

      if (!json.success) {
        setError(json.message || "اطلاعات آگهی دریافت نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }

      setListing(json.listing || null);
      setImages(Array.isArray(json.images) ? json.images : []);
      setCanManage(Boolean(json.access?.can_manage));
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setListing(null);
      setImages([]);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListing();
  }, [listingId]);

  async function runAction(action: ManageAction) {
    if (!listingId || !canManage || !listing) return;

    const currentStatus = String(listing.status?.code || "pending").toLowerCase();

    if (!isActionAvailable(currentStatus, action)) {
      setError("این عملیات برای وضعیت فعلی آگهی قابل انجام نیست.");
      return;
    }

    const confirmation = actionConfirmation(action);
    if (confirmation && !window.confirm(confirmation)) return;

    setActionLoading(action);
    setMessage("");
    setError("");

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/listing-manage.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listing_id: listingId,
          action,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.message || "عملیات انجام نشد.");
        return;
      }

      setMessage(json.message || "عملیات با موفقیت انجام شد.");
      await loadListing({ preserveFeedback: true });
    } catch {
      setError("ارتباط با سرور برای انجام عملیات برقرار نشد.");
    } finally {
      setActionLoading("");
    }
  }

  async function setCoverImage(imageId: number) {
    if (!listingId || !imageId || !canManage) return;

    setCoverLoadingId(imageId);
    setUploadMessage("");
    setUploadError("");

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/set-listing-cover-image.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listing_id: listingId,
          image_id: imageId,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setUploadError(json.message || "تغییر عکس اصلی انجام نشد.");
        return;
      }

      setUploadMessage("عکس اصلی آگهی تغییر کرد.");
      await loadListing({ preserveFeedback: true });
    } catch {
      setUploadError("ارتباط با سرور برای تغییر عکس اصلی برقرار نشد.");
    } finally {
      setCoverLoadingId(null);
    }
  }

  function handleImageSelect(files: FileList | null) {
    setUploadMessage("");
    setUploadError("");

    if (!files || files.length === 0) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 6 * 1024 * 1024;

    const validItems: UploadItem[] = [];

    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type)) {
        setUploadError("فرمت تصویر باید JPG، PNG یا WEBP باشد.");
        continue;
      }

      if (file.size > maxSize) {
        setUploadError("حجم هر تصویر نباید بیشتر از ۶ مگابایت باشد.");
        continue;
      }

      validItems.push({
        localId: makeLocalId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "selected",
        progress: 0,
      });
    }

    setUploads((prev) => [...prev, ...validItems]);
  }

  function removeUpload(localId: string) {
    if (uploading) return;

    setUploads((prev) => {
      const found = prev.find((item) => item.localId === localId);

      if (found) {
        URL.revokeObjectURL(found.previewUrl);
      }

      return prev.filter((item) => item.localId !== localId);
    });
  }

  async function uploadSelectedImages() {
    if (!listingId || uploads.length === 0 || !canManage) return;

    setUploading(true);
    setUploadMessage("");
    setUploadError("");

    const token = getToken();
    let failed = 0;
    let uploaded = 0;

    for (const item of uploads) {
      if (item.status === "uploaded") continue;

      setUploads((prev) =>
        prev.map((upload) =>
          upload.localId === item.localId
            ? { ...upload, status: "uploading", progress: 5, error: "" }
            : upload
        )
      );

      try {
        const json = await uploadImageWithProgress(listingId, item, token, (progress) => {
          setUploads((prev) =>
            prev.map((upload) =>
              upload.localId === item.localId
                ? { ...upload, progress: Math.max(5, Math.min(progress, 99)) }
                : upload
            )
          );
        });

        if (json.success) {
          uploaded += 1;

          setUploads((prev) =>
            prev.map((upload) =>
              upload.localId === item.localId
                ? { ...upload, status: "uploaded", progress: 100, error: "" }
                : upload
            )
          );
        } else {
          failed += 1;

          setUploads((prev) =>
            prev.map((upload) =>
              upload.localId === item.localId
                ? {
                    ...upload,
                    status: "error",
                    progress: 0,
                    error: json.message || "آپلود تصویر انجام نشد.",
                  }
                : upload
            )
          );
        }
      } catch (err) {
        failed += 1;

        setUploads((prev) =>
          prev.map((upload) =>
            upload.localId === item.localId
              ? {
                  ...upload,
                  status: "error",
                  progress: 0,
                  error: err instanceof Error ? err.message : "آپلود تصویر انجام نشد.",
                }
              : upload
          )
        );
      }
    }

    setUploading(false);

    if (failed > 0) {
      setUploadError(`${failed} تصویر آپلود نشد.`);
    }

    if (uploaded > 0) {
      setUploadMessage(`${uploaded} تصویر با موفقیت آپلود شد.`);
      await loadListing({ preserveFeedback: true });
    }
  }

  const coverImage = images.find((item) => item.is_cover) || images[0] || null;

  const currentStatus = String(listing?.status?.code || "pending").toLowerCase();
  const actions: ManageAction[] = [
    "mark_sold",
    "disable_listing",
    "reactivate_listing",
    "delete_listing",
  ];
  const locationText =
    listing?.location_label ||
    [listing?.province, listing?.city, listing?.neighborhood].filter(Boolean).join("، ") ||
    "موقعیت ثبت نشده";

  return (
    <main className="managePage" dir="rtl">
      <section className="shell">
        <header className="pageBar">
          <a href="/dashboard" className="backLink" aria-label="بازگشت به داشبورد">
            <span aria-hidden="true">‹</span>
            <b>داشبورد</b>
          </a>

          <Link href="/" className="pageBrand" aria-label="صفحه اصلی چاکود">
            <img src="/brand/chakod-symbol.png" alt="چاکود" />
            <div>
              <strong>مدیریت آگهی</strong>
              <small>چاکود</small>
            </div>
          </Link>

          <nav className="pageLinks" aria-label="دسترسی‌های مدیریت">
            <a href="/account/listings/new">ثبت آگهی جدید</a>
            <a href="/account/listings">آگهی‌های من</a>
            <a href="/account">حساب</a>
          </nav>
        </header>

        {loading && (
          <div className="centerCard">
            <div className="loader" />
            <h1>در حال دریافت آگهی...</h1>
            <p>اطلاعات آگهی و تصاویر در حال آماده‌سازی است.</p>
          </div>
        )}

        {!loading && error && !listing && (
          <div className="centerCard">
            <span className="miniLabel">مدیریت آگهی</span>
            <h1>آگهی قابل مدیریت نیست</h1>
            <p>{error}</p>
            <div className="centerActions">
              <a className="primaryLink" href="/dashboard">
                بازگشت به داشبورد
              </a>
              <button className="secondaryBtn" onClick={() => loadListing()}>
                تلاش دوباره
              </button>
            </div>
          </div>
        )}

        {!loading && listing && (
          <>
            <section className="heroCard">
              <div className="heroMedia">
                <ListingImage key={coverImage?.image_url || "hero-fallback"} src={coverImage?.image_url} alt={listing.title || "تصویر آگهی"} />
                <div className="heroMediaShade" />
                <span className="imageCount">{formatNumber(images.length)} تصویر</span>
                {coverImage && <span className="mainImageTag">عکس اصلی</span>}
              </div>

              <div className="heroContent">
                <div className="heroEyebrow">
                  <span>آگهی شماره {formatNumber(listing.id)}</span>
                  <b className={`statusBadge ${statusClass(currentStatus)}`}>
                    {listing.status?.title || "در انتظار بررسی"}
                  </b>
                </div>

                <h1>{listing.title || "آگهی بدون عنوان"}</h1>
                <p className="vehicleLine">
                  {[listing.brand, listing.model, listing.year].filter(Boolean).join("، ") ||
                    "مشخصات خودرو ثبت نشده"}
                </p>

                <div className="factGrid">
                  <div>
                    <span>قیمت</span>
                    <strong>{formatPrice(listing.price_toman)}</strong>
                  </div>
                  <div>
                    <span>کارکرد</span>
                    <strong>{formatNumber(listing.mileage_km)} کیلومتر</strong>
                  </div>
                  <div className="locationFact">
                    <span>موقعیت</span>
                    <strong>{locationText}</strong>
                  </div>
                </div>

                <div className="sellerRow">
                  <div className="sellerAvatar">{listing.listing_owner_type === "dealer" ? "ن" : "ش"}</div>
                  <div>
                    <span>{listing.listing_owner_type === "dealer" ? "آگهی نمایشگاهی" : "آگهی شخصی"}</span>
                    <b>{listing.seller_display_name || "کاربر چاکود"}</b>
                  </div>
                </div>
              </div>

              <aside className="statusCard">
                <div className="statusCardTop">
                  <span>وضعیت فعلی</span>
                  <strong className={`statusBadge ${statusClass(currentStatus)}`}>
                    {listing.status?.title || "در انتظار بررسی"}
                  </strong>
                </div>
                <p>{statusDescription(currentStatus)}</p>
                <div className={`permissionTag ${canManage ? "allowed" : "readonly"}`}>
                  {canManage ? "دسترسی کامل مدیریت" : "فقط امکان مشاهده"}
                </div>
                {currentStatus === "active" ? (
                  <a className="publicLink" href={`/cars/${listing.id}`} target="_blank" rel="noreferrer">
                    مشاهده آگهی عمومی
                  </a>
                ) : (
                  <div className="publicLink disabled">نسخه عمومی پس از انتشار فعال می‌شود</div>
                )}
              </aside>
            </section>

            <section className="statsGrid" aria-label="خلاصه آگهی">
              <article className="statCard accent">
                <span>تصاویر</span>
                <strong>{formatNumber(images.length)}</strong>
                <small>عکس ثبت‌شده</small>
              </article>
              <article className="statCard">
                <span>نوع آگهی</span>
                <strong>{listing.listing_owner_type === "dealer" ? "نمایشگاهی" : "شخصی"}</strong>
                <small>مالکیت آگهی</small>
              </article>
              <article className="statCard">
                <span>وضعیت</span>
                <strong>{listing.status?.title || "در انتظار"}</strong>
                <small>وضعیت انتشار</small>
              </article>
              <article className="statCard">
                <span>آخرین بروزرسانی</span>
                <strong>{formatDate(listing.updated_at || listing.created_at)}</strong>
                <small>شناسه {formatNumber(listing.id)}</small>
              </article>
            </section>

            <section className="layoutGrid">
              <section className="mainColumn">
                <section className="panel actionPanel">
                  <div className="panelHead">
                    <div>
                      <span>عملیات مدیریتی</span>
                      <h2>کنترل وضعیت آگهی</h2>
                      <p>فقط عملیات مناسب وضعیت فعلی فعال است.</p>
                    </div>
                    <b className={`statusBadge ${statusClass(currentStatus)}`}>
                      {listing.status?.title || "در انتظار"}
                    </b>
                  </div>

                  {!canManage && (
                    <div className="message hint">شما اجازه تغییر وضعیت این آگهی را ندارید.</div>
                  )}

                  <div className="feedbackStack" aria-live="polite">
                    {actionLoading && <div className="message hint">در حال انجام عملیات...</div>}
                    {message && <div className="message success">✓ {message}</div>}
                    {error && <div className="message error">{error}</div>}
                  </div>

                  {canManage && (
                    <div className="actionGrid">
                      {actions.map((action) => {
                        const copy = actionCopy(action, currentStatus);
                        const available = isActionAvailable(currentStatus, action);
                        const busy = actionLoading === action;

                        return (
                          <button
                            key={action}
                            type="button"
                            className={`actionBtn ${action} ${!available ? "unavailable" : ""}`}
                            disabled={Boolean(actionLoading) || !available}
                            onClick={() => runAction(action)}
                            title={!available ? "این عملیات برای وضعیت فعلی آگهی فعال نیست." : copy.title}
                            aria-busy={busy}
                          >
                            <span className="actionIcon" aria-hidden="true">{busy ? "…" : copy.icon}</span>
                            <span className="actionText">
                              <strong>{busy ? "در حال انجام..." : copy.title}</strong>
                              <small>{copy.text}</small>
                            </span>
                            {!available && <em>غیرفعال</em>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="panel imagePanel">
                  <div className="panelHead imagePanelHead">
                    <div>
                      <span>تصاویر آگهی</span>
                      <h2>مدیریت عکس‌ها و تصویر اصلی</h2>
                      <p>تصویر اصلی در کارت آگهی و صفحه جزئیات نمایش داده می‌شود.</p>
                    </div>
                    <button className="refreshBtn" type="button" onClick={() => loadListing({ preserveFeedback: true })}>
                      بازخوانی
                    </button>
                  </div>

                  {images.length === 0 && (
                    <div className="emptyBox">
                      <img src="/brand/chakod-symbol.png" alt="چاکود" />
                      <strong>هنوز تصویری ثبت نشده است</strong>
                      <span>از بخش پایین، تصاویر خودرو را اضافه کنید.</span>
                    </div>
                  )}

                  {images.length > 0 && (
                    <div className="imageGrid">
                      {images.map((image, index) => (
                        <article className={`imageCard ${image.is_cover ? "isCover" : ""}`} key={image.id}>
                          <div className="imageVisual">
                            <ListingImage key={`${image.id}-${image.image_url}`} src={image.image_url} alt={`تصویر ${formatNumber(index + 1)} آگهی`} />
                            <span className="imageOrder">{formatNumber(index + 1)}</span>
                            {image.is_cover && <b className="coverBadge">عکس اصلی</b>}
                          </div>

                          <div className="imageCardFooter">
                            {image.is_cover ? (
                              <div className="coverCurrent">✓ تصویر اصلی آگهی</div>
                            ) : canManage ? (
                              <button
                                type="button"
                                className="coverBtn"
                                disabled={coverLoadingId === image.id}
                                onClick={() => setCoverImage(image.id)}
                              >
                                {coverLoadingId === image.id ? "در حال تغییر..." : "انتخاب به‌عنوان اصلی"}
                              </button>
                            ) : (
                              <span className="readonlyImage">تصویر آگهی</span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {canManage && (
                    <div className="uploadBox">
                      <div className="uploadIntro">
                        <div>
                          <span>افزودن عکس جدید</span>
                          <strong>تصاویر واضح و افقی، بازدید بیشتری می‌گیرند</strong>
                        </div>
                        <small>JPG، PNG یا WEBP — حداکثر ۶ مگابایت</small>
                      </div>

                      <label className="uploadPicker">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(event) => {
                            handleImageSelect(event.target.files);
                            event.target.value = "";
                          }}
                          disabled={uploading}
                        />
                        <span aria-hidden="true">＋</span>
                        <div>
                          <strong>انتخاب تصویر</strong>
                          <small>برای انتخاب چند عکس کلیک کنید</small>
                        </div>
                      </label>

                      {uploads.length > 0 && (
                        <div className="uploadPreviewGrid">
                          {uploads.map((item) => (
                            <article className={`uploadPreview ${item.status}`} key={item.localId}>
                              <img src={item.previewUrl} alt="تصویر انتخابی" />
                              {item.status === "selected" && (
                                <button type="button" onClick={() => removeUpload(item.localId)}>حذف</button>
                              )}
                              {item.status === "uploading" && (
                                <div className="uploadOverlay">
                                  <span>{formatNumber(item.progress)}٪</span>
                                  <em><i style={{ width: `${item.progress}%` }} /></em>
                                </div>
                              )}
                              {item.status === "uploaded" && <b>آپلود شد</b>}
                              {item.status === "error" && <b className="bad">خطا</b>}
                            </article>
                          ))}
                        </div>
                      )}

                      {uploads.length > 0 && (
                        <button className="primaryBtn" type="button" disabled={uploading} onClick={uploadSelectedImages}>
                          {uploading ? "در حال آپلود تصاویر..." : `آپلود ${formatNumber(uploads.filter((item) => item.status !== "uploaded").length)} تصویر انتخاب‌شده`}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="feedbackStack" aria-live="polite">
                    {uploadMessage && <div className="message success">✓ {uploadMessage}</div>}
                    {uploadError && <div className="message error">{uploadError}</div>}
                  </div>
                </section>
              </section>

              <aside className="sideColumn">
                <section className="panel detailPanel">
                  <div className="panelHead compact">
                    <div>
                      <span>مشخصات آگهی</span>
                      <h2>جزئیات ثبت‌شده</h2>
                    </div>
                  </div>
                  <div className="detailList">
                    <div><span>برند</span><b>{listing.brand || "ثبت نشده"}</b></div>
                    <div><span>مدل</span><b>{listing.model || "ثبت نشده"}</b></div>
                    <div><span>سال</span><b>{listing.year || "ثبت نشده"}</b></div>
                    <div><span>رنگ</span><b>{listing.color || "ثبت نشده"}</b></div>
                    <div><span>بدنه</span><b>{listing.body_status || "ثبت نشده"}</b></div>
                    <div><span>گیربکس</span><b>{listing.transmission || "ثبت نشده"}</b></div>
                    <div><span>سوخت</span><b>{listing.fuel_type || "ثبت نشده"}</b></div>
                    <div><span>موقعیت</span><b>{locationText}</b></div>
                  </div>
                </section>

                <section className="panel descriptionPanel">
                  <div className="panelHead compact">
                    <div>
                      <span>توضیحات</span>
                      <h2>متن آگهی</h2>
                    </div>
                  </div>
                  <p className="descriptionText">{listing.description || "توضیحاتی برای این آگهی ثبت نشده است."}</p>
                </section>

                <section className="panel quickPanel">
                  <div className="panelHead compact">
                    <div>
                      <span>دسترسی سریع</span>
                      <h2>مسیرهای مدیریتی</h2>
                    </div>
                  </div>
                  <div className="quickLinks">
                    <a href="/dashboard">داشبورد</a>
                    <a href="/dashboard#recentListings">آگهی‌های من</a>
                    <a href="/account/listings/new">ثبت آگهی جدید</a>
                    <a href="/dealers">نمایشگاه‌ها</a>
                  </div>
                </section>
              </aside>
            </section>
          </>
        )}
      </section>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8f6fc; }
        button, input { font: inherit; }

        .managePage {
          --ink: #211335;
          --muted: #77668d;
          --purple: #6d28d9;
          --purple2: #9333ea;
          --line: #eadfff;
          --panel: rgba(255, 255, 255, 0.96);
          min-height: 100vh;
          color: var(--ink);
          font-family: Tahoma, Arial, sans-serif;
          padding: 20px 22px 64px;
          background:
            radial-gradient(circle at 88% 6%, rgba(124, 58, 237, 0.15), transparent 28%),
            radial-gradient(circle at 8% 46%, rgba(168, 85, 247, 0.10), transparent 28%),
            linear-gradient(180deg, #fff 0%, #faf7ff 52%, #fff 100%);
        }

        .shell { width: min(1280px, 100%); margin: 0 auto; }

        .pageBar {
          min-height: 64px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          padding: 10px 14px;
          border: 1px solid rgba(228, 213, 255, 0.9);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(18px);
          box-shadow: 0 14px 40px rgba(76, 29, 149, 0.08);
        }

        .backLink, .pageBrand, .pageLinks a, .publicLink, .quickLinks a, .primaryLink {
          text-decoration: none;
        }

        .backLink {
          justify-self: start;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--ink);
          padding: 8px 10px;
          border-radius: 13px;
          transition: background .2s ease;
        }
        .backLink:hover { background: #f4edff; }
        .backLink span { font-size: 25px; line-height: 1; color: var(--purple); transform: rotate(180deg); }
        .backLink b { font-size: 12px; }

        .pageBrand { display: flex; align-items: center; gap: 9px; color: var(--ink); }
        .pageBrand img { width: 38px; height: 38px; object-fit: contain; }
        .pageBrand div { display: grid; gap: 1px; }
        .pageBrand strong { font-size: 14px; }
        .pageBrand small { color: var(--muted); font-size: 10px; }

        .pageLinks { justify-self: end; display: flex; align-items: center; gap: 7px; }
        .pageLinks a {
          color: #5b3d7d;
          background: #f7f1ff;
          border: 1px solid #eadcff;
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 800;
        }

        .centerCard {
          width: min(540px, 100%);
          margin: 80px auto 0;
          padding: 34px;
          text-align: center;
          border: 1px solid var(--line);
          border-radius: 28px;
          background: var(--panel);
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.12);
        }
        .centerCard h1 { margin: 14px 0 8px; font-size: 24px; }
        .centerCard p { margin: 0; color: var(--muted); line-height: 2; font-size: 13px; }
        .centerActions { display: flex; justify-content: center; gap: 9px; margin-top: 20px; }
        .primaryLink, .secondaryBtn {
          border: 0; border-radius: 13px; padding: 11px 15px; font-size: 12px; font-weight: 900; cursor: pointer;
        }
        .primaryLink { color: #fff; background: linear-gradient(135deg, var(--purple), var(--purple2)); }
        .secondaryBtn { color: var(--purple); background: #f2eaff; }
        .loader { width: 38px; height: 38px; margin: 0 auto; border: 4px solid #eadcff; border-top-color: var(--purple); border-radius: 50%; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .heroCard {
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr) 245px;
          gap: 22px;
          align-items: stretch;
          padding: 18px;
          margin-bottom: 14px;
          border: 1px solid var(--line);
          border-radius: 30px;
          background: var(--panel);
          box-shadow: 0 22px 65px rgba(76, 29, 149, 0.11);
          overflow: hidden;
        }

        .heroMedia {
          position: relative;
          min-height: 245px;
          border-radius: 22px;
          overflow: hidden;
          background: #f4edff;
        }
        .heroMedia > img { width: 100%; height: 100%; display: block; object-fit: cover; }
        .heroMedia > img.imageFallback { object-fit: contain; padding: 28px; background: #f4edff; }
        .heroMediaShade { position: absolute; inset: auto 0 0; height: 45%; background: linear-gradient(180deg, transparent, rgba(27, 11, 50, .46)); pointer-events: none; }
        .imageCount, .mainImageTag {
          position: absolute; z-index: 2; bottom: 12px; border-radius: 999px; padding: 7px 10px; font-size: 10px; font-weight: 900; backdrop-filter: blur(10px);
        }
        .imageCount { right: 12px; color: #fff; background: rgba(33, 19, 53, .55); }
        .mainImageTag { left: 12px; color: #176b38; background: rgba(230, 255, 238, .93); }

        .heroContent { min-width: 0; padding: 8px 0; display: flex; flex-direction: column; justify-content: center; }
        .heroEyebrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .heroEyebrow > span, .miniLabel {
          display: inline-flex; width: fit-content; color: var(--purple); background: #f3ebff; border-radius: 999px; padding: 7px 10px; font-size: 10px; font-weight: 900;
        }
        .heroContent h1 { margin: 0; font-size: clamp(25px, 3vw, 36px); line-height: 1.45; letter-spacing: -.5px; }
        .vehicleLine { margin: 7px 0 0; color: var(--muted); font-size: 13px; line-height: 1.9; }

        .factGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 18px; }
        .factGrid > div { min-width: 0; padding: 11px 12px; border: 1px solid #ece2ff; border-radius: 15px; background: #fbf9ff; }
        .factGrid .locationFact { grid-column: 1 / -1; }
        .factGrid span { display: block; margin-bottom: 5px; color: #8a789f; font-size: 9px; }
        .factGrid strong { display: block; color: #342047; font-size: 12px; line-height: 1.75; overflow-wrap: anywhere; }

        .sellerRow { display: flex; align-items: center; gap: 9px; margin-top: 12px; }
        .sellerAvatar { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border-radius: 13px; color: #fff; font-weight: 900; background: linear-gradient(135deg, var(--purple), var(--purple2)); }
        .sellerRow > div:last-child { display: grid; gap: 2px; }
        .sellerRow span { color: var(--muted); font-size: 9px; }
        .sellerRow b { font-size: 11px; }

        .statusCard {
          padding: 17px;
          border: 1px solid #e9dcff;
          border-radius: 22px;
          background: linear-gradient(160deg, #fbf7ff, #f4ecff);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .statusCardTop { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .statusCardTop > span { color: var(--muted); font-size: 10px; }
        .statusCard p { margin: 13px 0; color: #6f5c84; font-size: 11px; line-height: 1.9; }
        .statusBadge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 7px 10px; font-size: 10px; font-weight: 900; white-space: nowrap; }
        .statusBadge.active { color: #176b38; background: #e7f9ed; }
        .statusBadge.pending { color: #8a5a00; background: #fff2c9; }
        .statusBadge.rejected { color: #a3212e; background: #ffe4e7; }
        .statusBadge.sold { color: #1d4f91; background: #e5f0ff; }
        .statusBadge.inactive { color: #665d72; background: #ece8f1; }
        .permissionTag { border-radius: 12px; padding: 9px 10px; text-align: center; font-size: 10px; font-weight: 900; }
        .permissionTag.allowed { color: #176b38; background: #e7f9ed; }
        .permissionTag.readonly { color: #7b5b00; background: #fff3ce; }
        .publicLink { margin-top: 9px; border-radius: 12px; padding: 10px; text-align: center; color: #fff; background: linear-gradient(135deg, var(--purple), var(--purple2)); font-size: 10px; font-weight: 900; }
        .publicLink.disabled { color: #8a789f; background: rgba(255,255,255,.65); border: 1px dashed #ddcff7; }

        .statsGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
        .statCard { min-width: 0; min-height: 112px; padding: 16px; border: 1px solid var(--line); border-radius: 21px; background: var(--panel); box-shadow: 0 12px 34px rgba(76, 29, 149, .07); }
        .statCard.accent { color: #fff; border: 0; background: linear-gradient(135deg, var(--purple), var(--purple2)); }
        .statCard span { display: block; margin-bottom: 9px; color: #8a789f; font-size: 9px; }
        .statCard.accent span, .statCard.accent small { color: rgba(255,255,255,.78); }
        .statCard strong { display: block; margin-bottom: 5px; font-size: 20px; line-height: 1.45; overflow-wrap: anywhere; }
        .statCard small { color: var(--muted); font-size: 9px; line-height: 1.65; }

        .layoutGrid { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 14px; align-items: start; }
        .mainColumn, .sideColumn { display: grid; gap: 14px; min-width: 0; }
        .sideColumn { position: sticky; top: 18px; }
        .panel { min-width: 0; padding: 22px; border: 1px solid var(--line); border-radius: 26px; background: var(--panel); box-shadow: 0 16px 46px rgba(76, 29, 149, .08); }
        .panelHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
        .panelHead > div { min-width: 0; }
        .panelHead span { display: inline-flex; width: fit-content; margin-bottom: 7px; padding: 6px 9px; border-radius: 999px; color: var(--purple); background: #f3ebff; font-size: 9px; font-weight: 900; }
        .panelHead h2 { margin: 0; font-size: 19px; line-height: 1.6; }
        .panelHead p { margin: 5px 0 0; color: var(--muted); font-size: 10px; line-height: 1.8; }
        .panelHead.compact { margin-bottom: 12px; }
        .panelHead.compact h2 { font-size: 16px; }

        .feedbackStack { display: grid; gap: 7px; margin-bottom: 10px; }
        .message { padding: 11px 13px; border-radius: 13px; font-size: 11px; line-height: 1.8; }
        .message.success { color: #176b38; background: #e8faee; border: 1px solid #bfe7cb; }
        .message.error { color: #a3212e; background: #fff0f1; border: 1px solid #f0c8cd; }
        .message.hint { color: #6b4a88; background: #f5efff; border: 1px solid #e4d5ff; }

        .actionGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .actionBtn {
          position: relative;
          min-height: 110px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: right;
          border: 1px solid #e5d8f7;
          border-radius: 18px;
          padding: 14px;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          background: #fff;
          color: var(--ink);
        }
        .actionBtn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(76, 29, 149, .10); }
        .actionIcon { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border-radius: 14px; font-size: 20px; font-weight: 900; }
        .actionText { min-width: 0; display: grid; gap: 5px; }
        .actionText strong { font-size: 13px; line-height: 1.6; }
        .actionText small { color: #746286; font-size: 10px; line-height: 1.7; }
        .actionBtn em { position: absolute; left: 10px; top: 9px; font-style: normal; color: #8d8098; background: #eeeaf2; border-radius: 999px; padding: 4px 7px; font-size: 8px; }
        .actionBtn.mark_sold { border-color: #cbe0ff; background: #f6faff; }
        .actionBtn.mark_sold .actionIcon { color: #1d4f91; background: #e6f0ff; }
        .actionBtn.disable_listing { border-color: #dcd6e6; background: #faf9fc; }
        .actionBtn.disable_listing .actionIcon { color: #665d72; background: #eeeaf2; }
        .actionBtn.reactivate_listing { border-color: #f1d58d; background: #fffaf0; }
        .actionBtn.reactivate_listing .actionIcon { color: #8a5a00; background: #fff0c5; }
        .actionBtn.delete_listing { border-color: #f2c8cd; background: #fff7f7; }
        .actionBtn.delete_listing .actionIcon { color: #a3212e; background: #ffe5e8; }
        .actionBtn:disabled { cursor: not-allowed; opacity: .58; transform: none; box-shadow: none; }
        .actionBtn.unavailable { filter: grayscale(.15); }

        .imagePanelHead { align-items: center; }
        .refreshBtn { flex: 0 0 auto; border: 1px solid #dfd0f6; border-radius: 12px; padding: 9px 11px; color: var(--purple); background: #f7f1ff; font-size: 10px; font-weight: 900; cursor: pointer; }
        .imageGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .imageCard { min-width: 0; padding: 6px; border: 1px solid #e6daf7; border-radius: 18px; background: #fbf9ff; }
        .imageCard.isCover { border-color: #72d89b; box-shadow: 0 0 0 2px rgba(59, 190, 110, .12); background: #f5fff8; }
        .imageVisual { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 13px; background: #f2eaff; }
        .imageVisual img { width: 100%; height: 100%; display: block; object-fit: cover; }
        .imageVisual img.imageFallback { object-fit: contain; padding: 16px; background: #f3edff; }
        .coverBadge, .imageOrder { position: absolute; top: 7px; z-index: 2; border-radius: 999px; padding: 5px 7px; font-size: 8px; font-weight: 900; backdrop-filter: blur(8px); }
        .coverBadge { right: 7px; color: #fff; background: #217a45; }
        .imageOrder { left: 7px; color: #fff; background: rgba(33, 19, 53, .58); }
        .imageCardFooter { margin-top: 6px; }
        .coverBtn, .coverCurrent, .readonlyImage { width: 100%; min-height: 36px; display: grid; place-items: center; border-radius: 11px; padding: 8px 6px; text-align: center; font-size: 9px; font-weight: 900; }
        .coverBtn { border: 1px solid #dccaf6; color: var(--purple); background: #f4edff; cursor: pointer; }
        .coverBtn:disabled { opacity: .65; cursor: wait; }
        .coverCurrent { color: #176b38; background: #e6f9ed; border: 1px solid #bfe7cb; }
        .readonlyImage { color: var(--muted); background: #f2eff5; }

        .emptyBox { min-height: 190px; display: grid; place-items: center; align-content: center; gap: 8px; padding: 22px; text-align: center; border: 1px dashed #d8c8ee; border-radius: 19px; background: #fbf9ff; color: var(--muted); }
        .emptyBox img { width: 54px; height: 54px; object-fit: contain; }
        .emptyBox strong { color: var(--ink); font-size: 13px; }
        .emptyBox span { font-size: 10px; }

        .uploadBox { margin-top: 14px; padding: 14px; border: 1px dashed #d8c8ee; border-radius: 20px; background: linear-gradient(180deg, #fcfaff, #f8f3ff); }
        .uploadIntro { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 11px; }
        .uploadIntro > div { display: grid; gap: 3px; }
        .uploadIntro span { color: var(--purple); font-size: 9px; font-weight: 900; }
        .uploadIntro strong { font-size: 12px; line-height: 1.7; }
        .uploadIntro > small { color: var(--muted); font-size: 9px; }
        .uploadPicker { min-height: 86px; display: flex; align-items: center; justify-content: center; gap: 12px; border: 1px solid #e4d7f8; border-radius: 16px; background: #fff; cursor: pointer; }
        .uploadPicker input { display: none; }
        .uploadPicker > span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px; color: #fff; background: linear-gradient(135deg, var(--purple), var(--purple2)); font-size: 24px; }
        .uploadPicker > div { display: grid; gap: 3px; }
        .uploadPicker strong { font-size: 12px; }
        .uploadPicker small { color: var(--muted); font-size: 9px; }
        .uploadPreviewGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
        .uploadPreview { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 13px; background: #eee6fa; }
        .uploadPreview img { width: 100%; height: 100%; object-fit: cover; }
        .uploadPreview > button, .uploadPreview > b { position: absolute; bottom: 6px; right: 6px; border: 0; border-radius: 999px; padding: 5px 8px; color: #fff; background: #b42334; font-size: 8px; font-weight: 900; cursor: pointer; }
        .uploadPreview > b { background: #217a45; }
        .uploadPreview > b.bad { background: #b42334; }
        .uploadOverlay { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 8px; color: #fff; background: rgba(33,19,53,.70); }
        .uploadOverlay span { font-size: 12px; font-weight: 900; }
        .uploadOverlay em { width: 74%; height: 5px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.25); }
        .uploadOverlay i { display: block; height: 100%; border-radius: inherit; background: #fff; }
        .primaryBtn { width: 100%; min-height: 46px; margin-top: 10px; border: 0; border-radius: 14px; color: #fff; background: linear-gradient(135deg, var(--purple), var(--purple2)); font-size: 11px; font-weight: 900; cursor: pointer; }
        .primaryBtn:disabled { opacity: .65; cursor: wait; }

        .detailList { display: grid; gap: 0; }
        .detailList > div { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #e8ddf4; }
        .detailList > div:last-child { border-bottom: 0; padding-bottom: 0; }
        .detailList span { color: #8b7a9e; font-size: 10px; }
        .detailList b { max-width: 65%; text-align: left; color: #38264b; font-size: 10px; line-height: 1.75; overflow-wrap: anywhere; }
        .descriptionText { margin: 0; color: #6f5d83; font-size: 11px; line-height: 2.05; white-space: pre-line; }
        .quickLinks { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; }
        .quickLinks a { padding: 10px 8px; border: 1px solid #e4d6f8; border-radius: 12px; text-align: center; color: var(--purple); background: #f6efff; font-size: 9px; font-weight: 900; }

        @media (max-width: 1080px) {
          .heroCard { grid-template-columns: 285px minmax(0, 1fr); }
          .statusCard { grid-column: 1 / -1; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 10px; }
          .statusCardTop { display: contents; }
          .statusCard p { margin: 0; }
          .permissionTag, .publicLink { margin: 0; }
          .layoutGrid { grid-template-columns: minmax(0, 1fr) 290px; }
          .imageGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 820px) {
          .managePage { padding: 10px 10px calc(112px + env(safe-area-inset-bottom)); }
          .pageBar { position: sticky; top: 6px; z-index: 40; min-height: 56px; grid-template-columns: auto 1fr; padding: 7px 9px; margin-bottom: 9px; border-radius: 17px; }
          .pageBrand { justify-self: end; }
          .pageBrand img { width: 34px; height: 34px; }
          .pageBrand strong { font-size: 12px; }
          .pageBrand small { font-size: 8px; }
          .pageLinks { display: none; }
          .backLink { padding: 7px 8px; }
          .backLink b { font-size: 10px; }

          .centerCard { margin-top: 36px; padding: 22px; border-radius: 21px; }
          .centerActions { flex-direction: column; }

          .heroCard { grid-template-columns: 1fr; gap: 12px; padding: 10px; border-radius: 22px; margin-bottom: 9px; }
          .heroMedia { min-height: 0; aspect-ratio: 16 / 9; border-radius: 16px; }
          .heroMedia > img.imageFallback { padding: 22px; }
          .imageCount, .mainImageTag { bottom: 8px; padding: 5px 8px; font-size: 8px; }
          .imageCount { right: 8px; }
          .mainImageTag { left: 8px; }
          .heroContent { padding: 2px 3px; }
          .heroEyebrow { margin-bottom: 8px; }
          .heroEyebrow > span { font-size: 8px; padding: 6px 8px; }
          .heroContent h1 { font-size: 22px; line-height: 1.55; }
          .vehicleLine { margin-top: 4px; font-size: 10px; }
          .factGrid { gap: 6px; margin-top: 11px; }
          .factGrid > div { padding: 9px; border-radius: 12px; }
          .factGrid span { font-size: 8px; }
          .factGrid strong { font-size: 10px; }
          .sellerRow { margin-top: 9px; }
          .sellerAvatar { width: 34px; height: 34px; flex-basis: 34px; border-radius: 11px; font-size: 11px; }
          .sellerRow span { font-size: 8px; }
          .sellerRow b { font-size: 10px; }

          .statusCard { grid-column: auto; display: flex; padding: 12px; border-radius: 16px; }
          .statusCardTop { display: flex; }
          .statusCard p { margin: 9px 0; font-size: 9px; }
          .permissionTag, .publicLink { margin-top: 0; font-size: 9px; padding: 8px; }

          .statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-bottom: 9px; }
          .statCard { min-height: 94px; padding: 12px; border-radius: 17px; }
          .statCard span { margin-bottom: 6px; font-size: 8px; }
          .statCard strong { font-size: 16px; }
          .statCard small { font-size: 8px; }

          .layoutGrid { grid-template-columns: 1fr; gap: 9px; }
          .mainColumn, .sideColumn { gap: 9px; }
          .sideColumn { position: static; }
          .panel { padding: 14px; border-radius: 20px; }
          .panelHead { margin-bottom: 12px; gap: 8px; }
          .panelHead span { margin-bottom: 5px; padding: 5px 7px; font-size: 8px; }
          .panelHead h2 { font-size: 15px; }
          .panelHead p { font-size: 9px; }
          .panelHead > .statusBadge { display: none; }

          .actionGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
          .actionBtn { min-height: 112px; align-items: flex-start; flex-direction: column; gap: 8px; padding: 11px; border-radius: 15px; }
          .actionIcon { width: 34px; height: 34px; flex-basis: 34px; border-radius: 11px; font-size: 16px; }
          .actionText { gap: 3px; }
          .actionText strong { font-size: 11px; }
          .actionText small { font-size: 8px; line-height: 1.65; }
          .actionBtn em { left: 7px; top: 7px; font-size: 7px; }
          .message { padding: 9px 10px; font-size: 9px; }

          .imagePanelHead { align-items: flex-start; }
          .refreshBtn { padding: 7px 9px; font-size: 8px; }
          .imageGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
          .imageCard { padding: 4px; border-radius: 14px; }
          .imageVisual { border-radius: 10px; }
          .imageVisual img.imageFallback { padding: 12px; }
          .coverBadge, .imageOrder { top: 5px; padding: 4px 6px; font-size: 7px; }
          .coverBadge { right: 5px; }
          .imageOrder { left: 5px; }
          .coverBtn, .coverCurrent, .readonlyImage { min-height: 34px; padding: 7px 4px; border-radius: 9px; font-size: 8px; }

          .uploadBox { margin-top: 10px; padding: 10px; border-radius: 16px; }
          .uploadIntro { align-items: flex-start; flex-direction: column; gap: 4px; margin-bottom: 8px; }
          .uploadIntro strong { font-size: 10px; }
          .uploadIntro > small { font-size: 8px; }
          .uploadPicker { min-height: 72px; border-radius: 13px; }
          .uploadPicker > span { width: 36px; height: 36px; border-radius: 11px; font-size: 20px; }
          .uploadPicker strong { font-size: 10px; }
          .uploadPicker small { font-size: 8px; }
          .uploadPreviewGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
          .primaryBtn { min-height: 44px; font-size: 10px; }

          .detailList > div { padding: 8px 0; }
          .detailList span, .detailList b { font-size: 9px; }
          .descriptionText { font-size: 10px; }
          .quickLinks a { padding: 9px 6px; font-size: 8px; }
        }

        @media (max-width: 370px) {
          .actionGrid, .factGrid { grid-template-columns: 1fr; }
          .factGrid .locationFact { grid-column: auto; }
          .uploadPreviewGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </main>
  );
}
