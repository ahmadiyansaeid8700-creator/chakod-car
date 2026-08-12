"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type ListingStatus = { code?: string; title?: string; raw?: string };
type ListingImage = { id?: number; image_id?: number; image_url?: string; is_cover?: boolean };
type ManagedListing = {
  id: number;
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  brand_name?: string | null;
  model?: string | null;
  model_name?: string | null;
  year?: string | number | null;
  production_year?: string | number | null;
  price_toman?: string | number | null;
  mileage_km?: string | number | null;
  province?: string | null;
  province_name?: string | null;
  city?: string | null;
  city_name?: string | null;
  neighborhood?: string | null;
  category_code?: string | null;
  color?: string | null;
  body_status?: string | null;
  body_condition?: string | null;
  transmission?: string | null;
  gearbox?: string | null;
  fuel_type?: string | null;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string | null;
  dealer_id?: number | null;
  status?: ListingStatus | string | null;
  cover_image?: ListingImage | null;
  images?: ListingImage[];
  image_count?: number;
  rejection_reason?: string | null;
  moderation_note?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ManagerResponse = {
  success?: boolean;
  message?: string;
  access?: { can_view?: boolean; can_manage?: boolean; reason?: string };
  listing?: ManagedListing;
  images?: ListingImage[];
  data?: ManagedListing[];
};

type DetailResponse = {
  success?: boolean;
  listing?: ManagedListing;
  message?: string;
};

type ManageAction = "mark_sold" | "disable_listing" | "reactivate_listing" | "delete_listing";
type LoadOptions = { preserveFeedback?: boolean };
type IconName =
  | "arrow"
  | "edit"
  | "image"
  | "spark"
  | "pin"
  | "gauge"
  | "calendar"
  | "user"
  | "shield"
  | "tag"
  | "fuel"
  | "gear"
  | "palette"
  | "car"
  | "chevronLeft"
  | "chevronRight";

const STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  pending: "در انتظار بررسی",
  rejected: "نیازمند اصلاح",
  sold: "فروخته‌شده",
  inactive: "غیرفعال",
  expired: "منقضی‌شده",
  deleted: "بایگانی‌شده",
  draft: "پیش‌نویس",
};

function Icon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "arrow") return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>;
  if (name === "edit") return <svg {...common}><path d="m4 20 4.2-1 9.9-9.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m13.8 7.2 3 3" /></svg>;
  if (name === "image") return <svg {...common}><rect x="3.5" y="4" width="17" height="16" rx="3" /><circle cx="9" cy="9" r="1.5" /><path d="m5.5 17 4.2-4.2 3 3 2.4-2.4 3.4 3.6" /></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>;
  if (name === "pin") return <svg {...common}><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
  if (name === "gauge") return <svg {...common}><path d="M5 18a8 8 0 1 1 14 0" /><path d="m12 13 4-4" /><path d="M7 18h10" /></svg>;
  if (name === "calendar") return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "tag") return <svg {...common}><path d="M20 13 12.8 20.2a2 2 0 0 1-2.8 0L3.8 14a2 2 0 0 1 0-2.8L11 4h7a2 2 0 0 1 2 2v7Z" /><circle cx="16" cy="8" r="1" /></svg>;
  if (name === "fuel") return <svg {...common}><path d="M6 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M5 21h12M8 7h6M16 8h2l2 2v7a2 2 0 0 1-2 2h-2" /></svg>;
  if (name === "gear") return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>;
  if (name === "palette") return <svg {...common}><path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4l-.4-.4a1.8 1.8 0 0 1 1.3-3.1H17a4 4 0 0 0 4-4c0-4.2-4-7.1-9-7.1Z" /><circle cx="7.5" cy="10" r=".8" /><circle cx="10" cy="6.8" r=".8" /><circle cx="15" cy="7.4" r=".8" /></svg>;
  if (name === "car") return <svg {...common}><path d="m5 16-1 2v2M19 16l1 2v2M4 16h16l-1.4-5.2A2.5 2.5 0 0 0 16.2 9H7.8a2.5 2.5 0 0 0-2.4 1.8L4 16Z" /><path d="M6 16v3h12v-3M7 13h.01M17 13h.01" /></svg>;
  if (name === "chevronLeft") return <svg {...common}><path d="m14 6-6 6 6 6" /></svg>;
  return <svg {...common}><path d="m10 6 6 6-6 6" /></svg>;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function formatNumber(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("fa-IR") : "۰";
}

function formatPrice(value: number | string | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";
  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیارد تومان`;
  }
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} میلیون تومان`;
  }
  return `${number.toLocaleString("fa-IR")} تومان`;
}

function formatDate(value?: string) {
  if (!value) return "ثبت نشده";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "ثبت نشده"
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function categoryTitle(code?: string | null) {
  const titles: Record<string, string> = {
    zero: "صفر و آماده تحویل",
    used: "کارکرده",
    preorder: "حواله و پیش‌فروش",
    freezone: "منطقه آزاد",
    classic: "کلاسیک و کلکسیونی",
  };
  return code ? titles[code] || "سایر" : "خودرو";
}

function getStatusCode(status: ManagedListing["status"]) {
  if (typeof status === "string") return status.toLowerCase();
  return String(status?.code || "pending").toLowerCase();
}

function getStatusTitle(status: ManagedListing["status"]) {
  const code = getStatusCode(status);
  if (STATUS_LABELS[code]) return STATUS_LABELS[code];
  if (typeof status === "object" && status?.title && !/[A-Za-z]/.test(status.title)) return status.title;
  return "وضعیت نامشخص";
}

function statusTone(code: string) {
  if (code === "active") return styles.statusActive;
  if (code === "rejected") return styles.statusRejected;
  if (code === "sold") return styles.statusSold;
  if (["inactive", "expired", "deleted", "draft"].includes(code)) return styles.statusMuted;
  return styles.statusPending;
}

function statusDescription(code: string) {
  switch (code) {
    case "active": return "آگهی منتشر شده و در چرخه فروش قرار دارد.";
    case "pending": return "آگهی ثبت شده و در صف بررسی کارشناسی چاکود است.";
    case "rejected": return "آگهی نیاز به اصلاح دارد و پس از ویرایش دوباره بررسی می‌شود.";
    case "sold": return "این خودرو فروخته‌شده ثبت شده و از چرخه فروش خارج است.";
    case "inactive": return "نمایش آگهی متوقف شده اما اطلاعات آن حفظ شده است.";
    case "expired": return "اعتبار نمایش آگهی پایان یافته و قابل تمدید است.";
    case "deleted": return "آگهی بایگانی شده و در نمایش عمومی حضور ندارد.";
    case "draft": return "آگهی هنوز پیش‌نویس است و برای انتشار ارسال نشده است.";
    default: return "وضعیت انتشار این آگهی از همین صفحه مدیریت می‌شود.";
  }
}

function isActionAvailable(status: string, action: ManageAction) {
  if (status === "active") return action === "mark_sold" || action === "disable_listing" || action === "delete_listing";
  if (status === "pending") return action === "disable_listing" || action === "delete_listing";
  if (["rejected", "inactive", "expired"].includes(status)) return action === "reactivate_listing" || action === "delete_listing";
  if (status === "sold" || status === "deleted") return action === "reactivate_listing";
  return action === "reactivate_listing" || action === "delete_listing";
}

function actionCopy(action: ManageAction, status: string) {
  if (action === "mark_sold") return { symbol: "✓", title: "فروخته شد", text: "خودرو را فروخته‌شده ثبت می‌کند." };
  if (action === "disable_listing") return { symbol: "Ⅱ", title: "توقف موقت", text: "نمایش آگهی را موقتاً متوقف می‌کند." };
  if (action === "delete_listing") return { symbol: "×", title: "بایگانی", text: "آگهی را بدون حذف اطلاعات بایگانی می‌کند." };
  if (status === "sold") return { symbol: "↻", title: "بازگشت به فروش", text: "آگهی دوباره وارد چرخه فروش می‌شود." };
  if (status === "deleted") return { symbol: "↻", title: "بازیابی آگهی", text: "آگهی از بایگانی خارج می‌شود." };
  if (status === "rejected") return { symbol: "↻", title: "ارسال دوباره", text: "نسخه اصلاح‌شده دوباره بررسی می‌شود." };
  return { symbol: "↻", title: "فعال‌سازی دوباره", text: "آگهی دوباره برای انتشار ارسال می‌شود." };
}

function actionConfirmation(action: ManageAction) {
  if (action === "mark_sold") return "این آگهی به عنوان فروخته‌شده ثبت شود؟";
  if (action === "disable_listing") return "نمایش این آگهی موقتاً متوقف شود؟";
  if (action === "delete_listing") return "این آگهی بایگانی شود؟ اطلاعات آن حفظ می‌شود.";
  return "";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ListingManagerClient({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<ManagedListing | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<ManageAction | "">("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const validId = /^\d+$/.test(listingId);

  async function loadListing(options: LoadOptions = {}) {
    if (!validId) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    if (!options.preserveFeedback) {
      setActionError("");
      setActionMessage("");
    }

    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/account/listings/${listingId}`)}`);
      return;
    }

    try {
      const response = await fetch(`/api/auth/listings/manage/${listingId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<ManagerResponse>(response);

      if (response.status === 401) {
        window.location.assign(`/login?returnTo=${encodeURIComponent(`/account/listings/${listingId}`)}`);
        return;
      }

      if (!response.ok || !payload?.success) {
        setError(payload?.message || "اطلاعات آگهی دریافت نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }

      const direct = payload.listing;
      const fromCollection = Array.isArray(payload.data)
        ? payload.data.find((item) => String(item.id) === listingId) || payload.data[0]
        : undefined;
      const managed = direct || fromCollection || null;

      if (!managed || String(managed.id) !== listingId) {
        setError("این آگهی در فهرست آگهی‌های قابل مدیریت شما پیدا نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }

      let detail: ManagedListing | null = null;
      try {
        const detailResponse = await fetch(`/api/auth/listings/edit/${listingId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const detailPayload = await readJson<DetailResponse>(detailResponse);
        if (detailResponse.ok && detailPayload?.success && detailPayload.listing) {
          detail = detailPayload.listing;
        }
      } catch {
        detail = null;
      }

      setListing({ ...managed, ...(detail || {}), id: managed.id, status: managed.status || detail?.status });
      setImages(Array.isArray(payload.images) ? payload.images : managed.images || detail?.images || []);
      setCanManage(payload.access?.can_manage !== false);
      setActiveImageIndex(0);
    } catch {
      setError("ارتباط با سرویس مدیریت آگهی برقرار نشد.");
      setListing(null);
      setImages([]);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListing();
  }, [listingId]);

  async function runAction(action: ManageAction) {
    if (!listing || !canManage || actionLoading) return;
    const currentStatus = getStatusCode(listing.status);

    if (!isActionAvailable(currentStatus, action)) {
      setActionError("این عملیات برای وضعیت فعلی آگهی قابل انجام نیست.");
      return;
    }

    const confirmation = actionConfirmation(action);
    if (confirmation && !window.confirm(confirmation)) return;

    setActionLoading(action);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(`/api/auth/listings/manage/${listing.id}`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action }),
      });
      const payload = await readJson<ManagerResponse>(response);

      if (response.status === 401) {
        window.location.assign(`/login?returnTo=${encodeURIComponent(`/account/listings/${listing.id}`)}`);
        return;
      }

      if (!response.ok || !payload?.success) {
        setActionError(payload?.message || "عملیات مدیریت آگهی انجام نشد.");
        return;
      }

      setActionMessage(payload.message || "وضعیت آگهی با موفقیت به‌روز شد.");
      await loadListing({ preserveFeedback: true });
    } catch {
      setActionError("ارتباط با سرور برای انجام عملیات برقرار نشد.");
    } finally {
      setActionLoading("");
    }
  }

  const galleryImages = useMemo(() => {
    const source = images.length ? images : listing?.images || [];
    const cover = listing?.cover_image?.image_url;
    const urls: ListingImage[] = [];
    if (cover) urls.push({ image_url: cover, is_cover: true });
    for (const image of source) {
      if (!image.image_url) continue;
      if (!urls.some((item) => item.image_url === image.image_url)) urls.push(image);
    }
    return urls;
  }, [images, listing]);

  const activeImage = galleryImages[activeImageIndex]?.image_url || "";
  const locationLabel = useMemo(
    () => [listing?.province || listing?.province_name, listing?.city || listing?.city_name, listing?.neighborhood]
      .filter(Boolean)
      .join("، ") || "موقعیت ثبت نشده",
    [listing],
  );

  const currentStatus = getStatusCode(listing?.status);
  const currentStatusLabel = getStatusTitle(listing?.status);
  const rejectionText = listing?.rejection_reason || listing?.moderation_note || "";
  const availableActions = (["mark_sold", "disable_listing", "reactivate_listing", "delete_listing"] as ManageAction[])
    .filter((action) => isActionAvailable(currentStatus, action));
  const renewServiceKey = listing?.listing_owner_type === "dealer" ? "listing_dealer_renew" : "listing_personal_renew";
  const canRenew = ["active", "inactive", "expired"].includes(currentStatus);
  const listingTitle = listing?.title || [listing?.brand_name || listing?.brand, listing?.model_name || listing?.model].filter(Boolean).join(" ") || "آگهی خودرو";
  const brand = listing?.brand_name || listing?.brand || "برند ثبت نشده";
  const model = listing?.model_name || listing?.model || "مدل ثبت نشده";
  const productionYear = listing?.production_year || listing?.year;
  const sellerName = listing?.listing_owner_type === "dealer" ? listing.seller_display_name || "نمایشگاه" : "شخصی";
  const description = String(listing?.description || "").trim();

  function showPreviousImage() {
    if (galleryImages.length < 2) return;
    setActiveImageIndex((index) => (index - 1 + galleryImages.length) % galleryImages.length);
  }

  function showNextImage() {
    if (galleryImages.length < 2) return;
    setActiveImageIndex((index) => (index + 1) % galleryImages.length);
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.appbar}>
          <Link href="/account/listings" className={styles.backButton}>
            <Icon name="arrow" />
            <span>آگهی‌های من</span>
          </Link>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
          <span className={styles.appbarBalance} />
        </header>

        {loading ? (
          <section className={styles.stateBox}>
            <span className={styles.spinner} />
            <h1>در حال آماده‌سازی آگهی</h1>
            <p>اطلاعات کامل آگهی در حال دریافت است.</p>
          </section>
        ) : null}

        {!loading && error ? (
          <section className={styles.stateBox}>
            <span className={styles.stateMark}>!</span>
            <h1>آگهی در دسترس نیست</h1>
            <p>{error}</p>
            <div className={styles.stateButtons}>
              <button type="button" onClick={() => void loadListing()}>تلاش دوباره</button>
              <Link href="/account/listings">بازگشت به آگهی‌ها</Link>
            </div>
          </section>
        ) : null}

        {!loading && !error && listing ? (
          <>
            {rejectionText ? (
              <section className={styles.reviewAlert}>
                <span>!</span>
                <div><strong>این آگهی نیاز به اصلاح دارد</strong><p>{rejectionText}</p></div>
                {canManage ? <Link href={`/account/listings/${listing.id}/edit`}>اصلاح آگهی</Link> : null}
              </section>
            ) : null}

            <div className={styles.marketLayout}>
              <div className={styles.mediaColumn}>
                <section className={styles.galleryPanel}>
                  <div className={styles.mainImage}>
                    {activeImage ? (
                      <img src={activeImage} alt={listingTitle} />
                    ) : (
                      <div className={styles.emptyImage}>
                        <Icon name="image" />
                        <strong>تصویری ثبت نشده</strong>
                        <p>برای این آگهی هنوز تصویری وجود ندارد.</p>
                      </div>
                    )}
                    <span className={styles.imageCounter}>{formatNumber(galleryImages.length || listing.image_count || 0)} تصویر</span>
                    {galleryImages.length > 1 ? (
                      <>
                        <button type="button" className={`${styles.galleryArrow} ${styles.galleryPrev}`} onClick={showPreviousImage} aria-label="تصویر قبلی"><Icon name="chevronRight" /></button>
                        <button type="button" className={`${styles.galleryArrow} ${styles.galleryNext}`} onClick={showNextImage} aria-label="تصویر بعدی"><Icon name="chevronLeft" /></button>
                      </>
                    ) : null}
                  </div>

                  {galleryImages.length > 1 ? (
                    <div className={styles.thumbnails}>
                      {galleryImages.slice(0, 8).map((image, index) => (
                        <button
                          key={image.image_id || image.id || image.image_url || index}
                          type="button"
                          className={index === activeImageIndex ? styles.thumbActive : styles.thumbButton}
                          onClick={() => setActiveImageIndex(index)}
                        >
                          {image.image_url ? <img src={image.image_url} alt={`تصویر ${formatNumber(index + 1)}`} /> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className={styles.descriptionSection}>
                  <div className={styles.sectionTitleRow}>
                    <h2>توضیحات</h2>
                    {canManage ? <Link href={`/account/listings/${listing.id}/edit`}>ویرایش</Link> : null}
                  </div>
                  <p className={description ? styles.descriptionText : styles.emptyText}>
                    {description || "برای این آگهی توضیحی ثبت نشده است."}
                  </p>
                </section>

                <section className={styles.locationSection}>
                  <div className={styles.sectionTitleRow}><h2>موقعیت</h2></div>
                  <div className={styles.mapPreview} aria-hidden="true"><span><Icon name="pin" /></span></div>
                  <div className={styles.locationLine}><Icon name="pin" /><strong>{locationLabel}</strong></div>
                </section>
              </div>

              <aside className={styles.detailColumn}>
                <div className={styles.infoTopline}>
                  <span className={`${styles.statusBadge} ${statusTone(currentStatus)}`}>{currentStatusLabel}</span>
                  <span className={styles.metaBadge}>شناسه {formatNumber(listing.id)}</span>
                  <span className={styles.metaBadge}>{categoryTitle(listing.category_code)}</span>
                </div>

                <h1>{listingTitle}</h1>
                <p className={styles.subTitle}>{brand} · {model}{productionYear ? ` · مدل ${formatNumber(productionYear)}` : ""}</p>

                <div className={styles.noticeLine}>
                  <Icon name="shield" />
                  <span>{statusDescription(currentStatus)}</span>
                </div>

                <div className={styles.ownerActions}>
                  {canManage ? <Link href={`/account/listings/${listing.id}/edit`} className={styles.primaryAction}><Icon name="edit" />ویرایش آگهی</Link> : null}
                  {canManage ? <Link href={`/account/listings/${listing.id}/images`} className={styles.secondaryAction}><Icon name="image" />تصاویر</Link> : null}
                  {canManage ? <Link href={`/account/listings/${listing.id}/promote`} className={styles.iconAction} aria-label="ارتقای آگهی"><Icon name="spark" /></Link> : null}
                </div>

                <div className={styles.heroFacts}>
                  <div><span>کارکرد</span><strong>{formatNumber(listing.mileage_km)} کیلومتر</strong></div>
                  <div><span>مدل</span><strong>{productionYear ? formatNumber(productionYear) : "ثبت نشده"}</strong></div>
                  <div><span>رنگ</span><strong>{listing.color || "ثبت نشده"}</strong></div>
                </div>

                <section className={styles.rowsSection}>
                  <DetailRow label="برند و مدل" value={`${brand} ${model}`} />
                  <DetailRow label="وضعیت بدنه" value={listing.body_status || listing.body_condition || "ثبت نشده"} />
                  <DetailRow label="گیربکس" value={listing.transmission || listing.gearbox || "ثبت نشده"} />
                  <DetailRow label="نوع سوخت" value={listing.fuel_type || "ثبت نشده"} />
                  <DetailRow label="دسته‌بندی" value={categoryTitle(listing.category_code)} />
                </section>

                <section className={styles.priceSection}>
                  <span>قیمت آگهی</span>
                  <strong>{formatPrice(listing.price_toman)}</strong>
                </section>

                <section className={styles.sellerSection}>
                  <div className={styles.sellerHeading}>
                    <span className={styles.sellerIcon}><Icon name="user" /></span>
                    <div><small>فروشنده</small><strong>{sellerName}</strong></div>
                  </div>
                  <div className={styles.sellerMeta}>
                    <span>ثبت آگهی: {formatDate(listing.created_at)}</span>
                    <span>آخرین ویرایش: {formatDate(listing.updated_at)}</span>
                  </div>
                </section>

                <section className={styles.manageSection}>
                  <div className={styles.manageHeading}>
                    <div><small>مدیریت انتشار</small><strong>{currentStatusLabel}</strong></div>
                    {canRenew ? <Link href={`/account/payments/checkout?type=service&service_key=${renewServiceKey}&listing_id=${listing.id}`}>تمدید</Link> : null}
                  </div>

                  {actionMessage ? <div className={styles.successMessage}>{actionMessage}</div> : null}
                  {actionError ? <div className={styles.errorMessage}>{actionError}</div> : null}

                  {canManage ? (
                    <div className={styles.manageActions}>
                      {availableActions.map((action) => {
                        const copy = actionCopy(action, currentStatus);
                        const destructive = action === "delete_listing";
                        return (
                          <button
                            type="button"
                            key={action}
                            className={destructive ? styles.dangerButton : styles.manageButton}
                            disabled={Boolean(actionLoading)}
                            onClick={() => void runAction(action)}
                          >
                            <span>{actionLoading === action ? "…" : copy.symbol}</span>
                            <div><strong>{actionLoading === action ? "در حال انجام" : copy.title}</strong><small>{copy.text}</small></div>
                          </button>
                        );
                      })}
                    </div>
                  ) : <div className={styles.noPermission}>این حساب مجوز تغییر وضعیت این آگهی را ندارد.</div>}
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
