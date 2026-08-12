"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type ListingStatus = { code?: string; title?: string; raw?: string };
type ListingImage = { id?: number; image_id?: number; image_url?: string; is_cover?: boolean };
type ManagedListing = {
  id: number;
  title?: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  mileage_km?: string | number | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  category_code?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  status?: ListingStatus;
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

type ManageAction = "mark_sold" | "disable_listing" | "reactivate_listing" | "delete_listing";
type LoadOptions = { preserveFeedback?: boolean };
type IconName = "arrow" | "edit" | "image" | "spark" | "pin" | "gauge" | "calendar" | "user" | "shield" | "tag";

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
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m9 6 6 6-6 6" />,
    edit: <><path d="m4 20 4.2-1 9.9-9.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m13.8 7.2 3 3" /></>,
    image: <><rect x="3.5" y="4" width="17" height="16" rx="3" /><circle cx="9" cy="9" r="1.5" /><path d="m5.5 17 4.2-4.2 3 3 2.4-2.4 3.4 3.6" /></>,
    spark: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    pin: <><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></>,
    gauge: <><path d="M5 18a8 8 0 1 1 14 0" /><path d="m12 13 4-4" /><path d="M7 18h10" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    tag: <><path d="M20 13 12.8 20.2a2 2 0 0 1-2.8 0L3.8 14a2 2 0 0 1 0-2.8L11 4h7a2 2 0 0 1 2 2v7Z" /><circle cx="16" cy="8" r="1" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
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

function categoryTitle(code?: string) {
  const titles: Record<string, string> = {
    zero: "صفر و آماده تحویل",
    used: "کارکرده و کم‌کارکرد",
    preorder: "حواله و پیش‌فروش",
    freezone: "منطقه آزاد",
    classic: "کلاسیک و کلکسیونی",
  };
  return code ? titles[code] || "سایر" : "ثبت نشده";
}

function statusLabel(code?: string, title?: string) {
  const normalized = String(code || "").toLowerCase();
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  if (title && !/[A-Za-z]/.test(title)) return title;
  return "وضعیت نامشخص";
}

function statusTone(code?: string) {
  const normalized = String(code || "").toLowerCase();
  if (normalized === "active") return styles.statusActive;
  if (normalized === "rejected") return styles.statusRejected;
  if (normalized === "sold") return styles.statusSold;
  if (["inactive", "expired", "deleted", "draft"].includes(normalized)) return styles.statusMuted;
  return styles.statusPending;
}

function statusDescription(code?: string) {
  switch (String(code || "").toLowerCase()) {
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
  const code = String(status || "pending").toLowerCase();
  if (code === "active") return action === "mark_sold" || action === "disable_listing" || action === "delete_listing";
  if (code === "pending") return action === "disable_listing" || action === "delete_listing";
  if (["rejected", "inactive", "expired"].includes(code)) return action === "reactivate_listing" || action === "delete_listing";
  if (code === "sold" || code === "deleted") return action === "reactivate_listing";
  return action === "reactivate_listing" || action === "delete_listing";
}

function actionCopy(action: ManageAction, status: string) {
  const code = String(status || "pending").toLowerCase();
  if (action === "mark_sold") return { symbol: "✓", title: "فروخته شد", text: "آگهی از چرخه فروش خارج می‌شود." };
  if (action === "disable_listing") return { symbol: "Ⅱ", title: "توقف موقت", text: "نمایش آگهی بدون حذف اطلاعات متوقف می‌شود." };
  if (action === "delete_listing") return { symbol: "×", title: "بایگانی آگهی", text: "آگهی از مدیریت روزمره خارج می‌شود." };
  if (code === "sold") return { symbol: "↻", title: "بازگشت به فروش", text: "آگهی دوباره وارد چرخه بررسی می‌شود." };
  if (code === "deleted") return { symbol: "↻", title: "بازیابی آگهی", text: "آگهی از بایگانی خارج می‌شود." };
  if (code === "rejected") return { symbol: "↻", title: "ارسال دوباره", text: "نسخه اصلاح‌شده دوباره بررسی می‌شود." };
  return { symbol: "↻", title: "فعال‌سازی دوباره", text: "آگهی دوباره برای انتشار ارسال می‌شود." };
}

function actionConfirmation(action: ManageAction) {
  if (action === "mark_sold") return "این آگهی به عنوان فروخته‌شده ثبت شود؟";
  if (action === "disable_listing") return "نمایش این آگهی موقتاً متوقف شود؟";
  if (action === "delete_listing") return "این آگهی بایگانی شود؟ اطلاعات آن حفظ می‌شود و امکان بازیابی دارد.";
  return "";
}

function DetailItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}><Icon name={icon} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
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
      const nextListing = direct || fromCollection || null;

      if (!nextListing || String(nextListing.id) !== listingId) {
        setError("این آگهی در فهرست آگهی‌های قابل مدیریت شما پیدا نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }

      setListing(nextListing);
      setImages(Array.isArray(payload.images) ? payload.images : nextListing.images || []);
      setCanManage(payload.access?.can_manage !== false);
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
    const currentStatus = String(listing.status?.code || "pending").toLowerCase();

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

  const allImages = images.length ? images : listing?.images || [];
  const coverImage = listing?.cover_image?.image_url || allImages.find((image) => image.is_cover)?.image_url || allImages[0]?.image_url || "";
  const locationLabel = useMemo(
    () => [listing?.province, listing?.city, listing?.neighborhood].filter(Boolean).join("، ") || "ثبت نشده",
    [listing],
  );
  const currentStatus = String(listing?.status?.code || "pending").toLowerCase();
  const currentStatusLabel = statusLabel(listing?.status?.code, listing?.status?.title);
  const rejectionText = listing?.rejection_reason || listing?.moderation_note || "";
  const availableActions = (["mark_sold", "disable_listing", "reactivate_listing", "delete_listing"] as ManageAction[])
    .filter((action) => isActionAvailable(currentStatus, action));
  const renewServiceKey = listing?.listing_owner_type === "dealer" ? "listing_dealer_renew" : "listing_personal_renew";
  const canRenew = ["active", "inactive", "expired"].includes(currentStatus);
  const listingTitle = listing?.title || [listing?.brand, listing?.model].filter(Boolean).join(" ") || "آگهی خودرو";

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
            <h1>در حال دریافت آگهی</h1>
            <p>چند لحظه صبر کنید.</p>
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
            <section className={styles.heading}>
              <div className={styles.headingMain}>
                <div className={styles.headingBadges}>
                  <span className={`${styles.statusBadge} ${statusTone(currentStatus)}`}>{currentStatusLabel}</span>
                  <span className={styles.idBadge}>شناسه {formatNumber(listing.id)}</span>
                  <span className={styles.categoryBadge}>{categoryTitle(listing.category_code)}</span>
                </div>
                <h1>{listingTitle}</h1>
                <p>{[listing.brand, listing.model, listing.year ? `مدل ${formatNumber(listing.year)}` : ""].filter(Boolean).join(" · ")}</p>
              </div>
              {canManage ? (
                <div className={styles.headingActions}>
                  <Link href={`/account/listings/${listing.id}/edit`} className={styles.primaryAction}><Icon name="edit" />ویرایش آگهی</Link>
                  <Link href={`/account/listings/${listing.id}/images`} className={styles.secondaryAction}><Icon name="image" />مدیریت تصاویر</Link>
                  <Link href={`/account/listings/${listing.id}/promote`} className={styles.secondaryAction}><Icon name="spark" />ارتقای آگهی</Link>
                </div>
              ) : null}
            </section>

            {rejectionText ? (
              <section className={styles.reviewAlert}>
                <span>!</span>
                <div><strong>نیاز به اصلاح</strong><p>{rejectionText}</p></div>
                {canManage ? <Link href={`/account/listings/${listing.id}/edit`}>ویرایش کنید</Link> : null}
              </section>
            ) : null}

            <div className={styles.mainGrid}>
              <div className={styles.contentColumn}>
                <section className={styles.galleryCard}>
                  <div className={styles.galleryHead}>
                    <div><span>تصاویر آگهی</span><strong>{formatNumber(allImages.length || listing.image_count || 0)} تصویر</strong></div>
                    {canManage ? <Link href={`/account/listings/${listing.id}/images`}>مدیریت تصاویر <Icon name="arrow" /></Link> : null}
                  </div>
                  <div className={styles.coverFrame}>
                    {coverImage ? <img src={coverImage} alt={listingTitle} /> : <div className={styles.emptyCover}><Icon name="image" /><strong>هنوز تصویری ثبت نشده</strong><p>برای نمایش بهتر آگهی، تصاویر خودرو را اضافه کنید.</p></div>}
                  </div>
                  {allImages.length > 1 ? (
                    <div className={styles.thumbRail}>
                      {allImages.slice(0, 6).map((image, index) => image.image_url ? (
                        <div className={styles.thumb} key={image.image_id || image.id || index}>
                          <img src={image.image_url} alt={`تصویر ${formatNumber(index + 1)}`} />
                        </div>
                      ) : null)}
                    </div>
                  ) : null}
                </section>

                <section className={styles.detailsCard}>
                  <div className={styles.sectionTitle}>
                    <div><span>جزئیات آگهی</span><h2>مشخصات ثبت‌شده</h2></div>
                    {canManage ? <Link href={`/account/listings/${listing.id}/edit`}>ویرایش <Icon name="edit" /></Link> : null}
                  </div>
                  <div className={styles.detailsGrid}>
                    <DetailItem icon="gauge" label="کارکرد" value={`${formatNumber(listing.mileage_km)} کیلومتر`} />
                    <DetailItem icon="pin" label="موقعیت" value={locationLabel} />
                    <DetailItem icon="tag" label="دسته‌بندی" value={categoryTitle(listing.category_code)} />
                    <DetailItem icon="user" label="فروشنده" value={listing.listing_owner_type === "dealer" ? listing.seller_display_name || "نمایشگاه" : "شخصی"} />
                    <DetailItem icon="calendar" label="تاریخ ثبت" value={formatDate(listing.created_at)} />
                    <DetailItem icon="calendar" label="آخرین ویرایش" value={formatDate(listing.updated_at)} />
                  </div>
                </section>
              </div>

              <aside className={styles.sideColumn}>
                <section className={styles.priceCard}>
                  <span>قیمت ثبت‌شده</span>
                  <strong>{formatPrice(listing.price_toman)}</strong>
                  <p>قیمتی که برای این آگهی ثبت شده است.</p>
                  {canManage ? <Link href={`/account/listings/${listing.id}/edit`}>ویرایش قیمت <Icon name="edit" /></Link> : null}
                </section>

                <section className={styles.statusCard}>
                  <div className={styles.statusCardTop}>
                    <span className={styles.statusIcon}><Icon name="shield" /></span>
                    <div><small>وضعیت انتشار</small><strong>{currentStatusLabel}</strong></div>
                  </div>
                  <p>{statusDescription(currentStatus)}</p>
                  {canRenew ? (
                    <Link className={styles.renewButton} href={`/account/payments/checkout?type=service&service_key=${renewServiceKey}&listing_id=${listing.id}`}>تمدید آگهی</Link>
                  ) : null}
                </section>

                <section className={styles.summaryCard}>
                  <div><span>کارکرد</span><strong>{formatNumber(listing.mileage_km)} کیلومتر</strong></div>
                  <div><span>فروشنده</span><strong>{listing.listing_owner_type === "dealer" ? listing.seller_display_name || "نمایشگاه" : "شخصی"}</strong></div>
                  <div><span>تعداد تصاویر</span><strong>{formatNumber(allImages.length || listing.image_count || 0)}</strong></div>
                </section>
              </aside>
            </div>

            <section className={styles.managementCard}>
              <div className={styles.managementIntro}>
                <span>مدیریت انتشار</span>
                <h2>وضعیت آگهی را مدیریت کنید</h2>
                <p>عملیات اصلی آگهی از این بخش انجام می‌شود. اطلاعات آگهی با بایگانی یا توقف موقت حذف نمی‌شود.</p>
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
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
