"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
type UiIcon =
  | "back"
  | "edit"
  | "image"
  | "star"
  | "pin"
  | "gauge"
  | "calendar"
  | "seller"
  | "status"
  | "tag"
  | "chevron";

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

function Icon({ name }: { name: UiIcon }) {
  const paths: Record<UiIcon, React.ReactNode> = {
    back: <path d="m9 6 6 6-6 6" />,
    edit: (
      <>
        <path d="m4 20 4.2-1 9.9-9.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
        <path d="m13.8 7.2 3 3" />
      </>
    ),
    image: (
      <>
        <rect x="3.5" y="4" width="17" height="16" rx="3" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m5.5 17 4.2-4.2 3 3 2.4-2.4 3.4 3.6" />
      </>
    ),
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    pin: (
      <>
        <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    gauge: (
      <>
        <path d="M5 18a8 8 0 1 1 14 0" />
        <path d="m12 13 4-4" />
        <path d="M7 18h10" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
    seller: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
      </>
    ),
    status: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    tag: (
      <>
        <path d="M20 13 12.8 20.2a2 2 0 0 1-2.8 0L3.8 14a2 2 0 0 1 0-2.8L11 4h7a2 2 0 0 1 2 2v7Z" />
        <circle cx="16" cy="8" r="1" />
      </>
    ),
    chevron: <path d="m9 6 6 6-6 6" />,
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
  return code ? titles[code] || "سایر" : "دسته‌بندی ثبت نشده";
}

function statusLabel(code?: string, title?: string) {
  const normalized = String(code || "").toLowerCase();
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  if (title && !/[A-Za-z]/.test(title)) return title;
  return "وضعیت نامشخص";
}

function statusClass(code?: string) {
  if (code === "active") return styles.statusActive;
  if (code === "rejected") return styles.statusRejected;
  if (code === "sold") return styles.statusSold;
  if (["inactive", "expired", "deleted", "draft"].includes(code || "")) return styles.statusInactive;
  return styles.statusPending;
}

function statusDescription(code?: string) {
  switch (String(code || "").toLowerCase()) {
    case "active":
      return "آگهی منتشر شده و برای کاربران قابل مشاهده است.";
    case "pending":
      return "آگهی ثبت شده و در صف بررسی کارشناسی چاکود قرار دارد.";
    case "rejected":
      return "آگهی نیاز به اصلاح دارد؛ پس از اصلاح دوباره برای بررسی ارسال می‌شود.";
    case "sold":
      return "خودرو به‌عنوان فروخته‌شده ثبت شده و آگهی از چرخه فروش خارج است.";
    case "inactive":
      return "نمایش آگهی موقتاً متوقف شده ولی اطلاعات آن حفظ شده است.";
    case "expired":
      return "اعتبار نمایش آگهی پایان یافته و می‌توانید آن را تمدید یا فعال کنید.";
    case "deleted":
      return "آگهی بایگانی شده و در سایت نمایش داده نمی‌شود.";
    case "draft":
      return "آگهی هنوز پیش‌نویس است و برای انتشار ارسال نشده است.";
    default:
      return "وضعیت انتشار و اقدامات این آگهی از همین صفحه مدیریت می‌شود.";
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
  if (action === "mark_sold") return { icon: "✓", title: "فروخته شد", text: "آگهی از چرخه فروش خارج می‌شود." };
  if (action === "disable_listing") return { icon: "Ⅱ", title: "توقف موقت", text: "نمایش آگهی بدون حذف اطلاعات متوقف می‌شود." };
  if (action === "delete_listing") return { icon: "×", title: "بایگانی آگهی", text: "آگهی از مدیریت روزمره خارج می‌شود." };
  if (code === "sold") return { icon: "↻", title: "بازگشت به فروش", text: "آگهی دوباره وارد چرخه بررسی و انتشار می‌شود." };
  if (code === "deleted") return { icon: "↻", title: "بازیابی آگهی", text: "آگهی از بایگانی خارج و دوباره بررسی می‌شود." };
  if (code === "rejected") return { icon: "↻", title: "ارسال دوباره", text: "آگهی اصلاح‌شده دوباره برای بررسی ارسال می‌شود." };
  return { icon: "↻", title: "فعال‌سازی دوباره", text: "آگهی دوباره برای بررسی و انتشار ارسال می‌شود." };
}

function actionConfirmation(action: ManageAction) {
  if (action === "mark_sold") return "این آگهی به عنوان فروخته‌شده ثبت شود؟";
  if (action === "disable_listing") return "نمایش این آگهی موقتاً متوقف شود؟";
  if (action === "delete_listing") return "این آگهی بایگانی شود؟ اطلاعات آن حفظ می‌شود و امکان بازیابی دارد.";
  return "";
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
      const next = direct || fromCollection || null;
      if (!next || String(next.id) !== listingId) {
        setError("این آگهی در فهرست آگهی‌های قابل مدیریت شما پیدا نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }
      setListing(next);
      setImages(Array.isArray(payload.images) ? payload.images : []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const locationLabel = useMemo(
    () => [listing?.province, listing?.city, listing?.neighborhood].filter(Boolean).join("، ") || "موقعیت ثبت نشده",
    [listing],
  );
  const rejectionText = listing?.rejection_reason || listing?.moderation_note || "";
  const allImages = images.length ? images : listing?.images || [];
  const coverImage =
    listing?.cover_image?.image_url || allImages.find((image) => image.is_cover)?.image_url || allImages[0]?.image_url || "";
  const imageCount = Number(listing?.image_count || allImages.length || 0);
  const currentStatus = String(listing?.status?.code || "pending").toLowerCase();
  const currentStatusLabel = statusLabel(listing?.status?.code, listing?.status?.title);
  const actions: ManageAction[] = ["mark_sold", "disable_listing", "reactivate_listing", "delete_listing"];
  const availableActions = actions.filter((action) => isActionAvailable(currentStatus, action));
  const renewServiceKey = listing?.listing_owner_type === "dealer" ? "listing_dealer_renew" : "listing_personal_renew";
  const canRenew = ["active", "inactive", "expired"].includes(currentStatus);
  const title = listing?.title || [listing?.brand, listing?.model].filter(Boolean).join(" ") || "آگهی خودرو";
  const sellerLabel = listing?.listing_owner_type === "personal" ? "شخصی" : listing?.seller_display_name || "نمایشگاه";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/account/listings" className={styles.backLink}>
            <Icon name="back" />
            <span>آگهی‌ها</span>
          </Link>
          <Link href="/" className={styles.brand} aria-label="صفحه اصلی چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
          <span className={styles.topbarSpacer} />
        </header>

        {loading ? (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده‌سازی آگهی</h1>
            <p>اطلاعات مدیریتی در حال دریافت است.</p>
          </section>
        ) : null}

        {!loading && error ? (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>مدیریت آگهی در دسترس نیست</h1>
            <p>{error}</p>
            <div className={styles.stateActions}>
              <button type="button" onClick={() => void loadListing()}>
                تلاش دوباره
              </button>
              <Link href="/account/listings">بازگشت به آگهی‌ها</Link>
            </div>
          </section>
        ) : null}

        {!loading && !error && listing ? (
          <>
            <section className={styles.summaryCard}>
              <div className={styles.summaryCopy}>
                <div className={styles.summaryBadges}>
                  <span className={`${styles.statusPill} ${statusClass(listing.status?.code)}`}>{currentStatusLabel}</span>
                  <span className={styles.softBadge}>شناسه {formatNumber(listing.id)}</span>
                  <span className={styles.softBadge}>{listing.listing_owner_type === "dealer" ? "آگهی نمایشگاهی" : "آگهی شخصی"}</span>
                </div>
                <h1>{title}</h1>
                <p>
                  {[listing.brand, listing.model, listing.year].filter(Boolean).join(" · ") || "مشخصات خودرو ثبت شده است"}
                </p>
              </div>

              {canManage ? (
                <div className={styles.primaryActions}>
                  <Link className={styles.primaryAction} href={`/account/listings/${listing.id}/edit`}>
                    <Icon name="edit" />
                    <span>ویرایش مشخصات</span>
                  </Link>
                  <Link className={styles.secondaryAction} href={`/account/listings/${listing.id}/images`}>
                    <Icon name="image" />
                    <span>مدیریت تصاویر</span>
                  </Link>
                  <Link className={styles.secondaryAction} href={`/account/listings/${listing.id}/promote`}>
                    <Icon name="star" />
                    <span>ارتقای آگهی</span>
                  </Link>
                </div>
              ) : null}
            </section>

            <div className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                <section className={styles.mediaCard}>
                  <div className={styles.mediaHeader}>
                    <div>
                      <span>تصاویر آگهی</span>
                      <strong>{imageCount ? `${formatNumber(imageCount)} تصویر` : "بدون تصویر"}</strong>
                    </div>
                    {canManage ? (
                      <Link href={`/account/listings/${listing.id}/images`}>
                        مدیریت تصاویر
                        <Icon name="chevron" />
                      </Link>
                    ) : null}
                  </div>
                  <div className={styles.mediaFrame}>
                    {coverImage ? (
                      <img src={coverImage} alt={title} />
                    ) : (
                      <div className={styles.mediaEmpty}>
                        <span><Icon name="image" /></span>
                        <strong>هنوز تصویری ثبت نشده</strong>
                        <p>برای نمایش بهتر آگهی، تصویر اصلی خودرو را اضافه کنید.</p>
                        {canManage ? <Link href={`/account/listings/${listing.id}/images`}>افزودن تصویر</Link> : null}
                      </div>
                    )}
                    {imageCount > 0 ? <span className={styles.imageCounter}>{formatNumber(imageCount)} تصویر</span> : null}
                  </div>
                </section>

                <section className={styles.detailsCard}>
                  <header className={styles.sectionHeader}>
                    <div>
                      <span>جزئیات آگهی</span>
                      <h2>مشخصات ثبت‌شده</h2>
                    </div>
                    {canManage ? <Link href={`/account/listings/${listing.id}/edit`}>ویرایش</Link> : null}
                  </header>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span><Icon name="tag" /></span>
                      <div><small>دسته‌بندی</small><strong>{categoryTitle(listing.category_code)}</strong></div>
                    </div>
                    <div className={styles.detailItem}>
                      <span><Icon name="gauge" /></span>
                      <div><small>کارکرد</small><strong>{formatNumber(listing.mileage_km)} کیلومتر</strong></div>
                    </div>
                    <div className={styles.detailItem}>
                      <span><Icon name="pin" /></span>
                      <div><small>موقعیت</small><strong>{locationLabel}</strong></div>
                    </div>
                    <div className={styles.detailItem}>
                      <span><Icon name="seller" /></span>
                      <div><small>فروشنده</small><strong>{sellerLabel}</strong></div>
                    </div>
                    <div className={styles.detailItem}>
                      <span><Icon name="calendar" /></span>
                      <div><small>تاریخ ثبت</small><strong>{formatDate(listing.created_at)}</strong></div>
                    </div>
                    <div className={styles.detailItem}>
                      <span><Icon name="calendar" /></span>
                      <div><small>آخرین ویرایش</small><strong>{formatDate(listing.updated_at)}</strong></div>
                    </div>
                  </div>
                </section>
              </div>

              <aside className={styles.sideColumn}>
                <section className={styles.priceCard}>
                  <span>قیمت ثبت‌شده</span>
                  <strong>{formatPrice(listing.price_toman)}</strong>
                  <p>این مبلغ از اطلاعات فعلی آگهی خوانده شده است.</p>
                  {canManage ? (
                    <Link href={`/account/listings/${listing.id}/edit`}>
                      ویرایش قیمت
                      <Icon name="edit" />
                    </Link>
                  ) : null}
                </section>

                <section className={styles.statusCard}>
                  <div className={styles.statusTop}>
                    <span className={styles.statusIcon}><Icon name="status" /></span>
                    <div>
                      <small>وضعیت انتشار</small>
                      <h2>{currentStatusLabel}</h2>
                    </div>
                  </div>
                  <p>{statusDescription(listing.status?.code)}</p>
                  {rejectionText ? <div className={styles.rejectionNote}><strong>یادداشت بررسی</strong><span>{rejectionText}</span></div> : null}
                </section>

                <section className={styles.factStrip}>
                  <div><span><Icon name="gauge" /></span><small>کارکرد</small><strong>{formatNumber(listing.mileage_km)} کیلومتر</strong></div>
                  <div><span><Icon name="seller" /></span><small>فروشنده</small><strong>{sellerLabel}</strong></div>
                  <div><span><Icon name="image" /></span><small>تصاویر</small><strong>{formatNumber(imageCount)}</strong></div>
                </section>
              </aside>
            </div>

            <section className={styles.lifecycleCard} id="publishing-management">
              <header className={styles.lifecycleHeader}>
                <div>
                  <span>مدیریت انتشار</span>
                  <h2>وضعیت آگهی را مدیریت کنید</h2>
                  <p>توقف، بایگانی یا فعال‌سازی دوباره از همین بخش انجام می‌شود.</p>
                </div>
                <span className={`${styles.statusPill} ${statusClass(listing.status?.code)}`}>{currentStatusLabel}</span>
              </header>

              {actionMessage ? <div className={styles.actionSuccess}>{actionMessage}</div> : null}
              {actionError ? <div className={styles.actionError}>{actionError}</div> : null}

              {canManage ? (
                <div className={styles.lifecycleActions}>
                  {availableActions.map((action) => {
                    const copy = actionCopy(action, currentStatus);
                    const destructive = action === "delete_listing";
                    return (
                      <button
                        type="button"
                        key={action}
                        className={destructive ? styles.dangerAction : ""}
                        disabled={Boolean(actionLoading)}
                        onClick={() => void runAction(action)}
                      >
                        <span>{actionLoading === action ? "…" : copy.icon}</span>
                        <div>
                          <strong>{actionLoading === action ? "در حال انجام" : copy.title}</strong>
                          <small>{copy.text}</small>
                        </div>
                      </button>
                    );
                  })}
                  {canRenew ? (
                    <Link
                      className={styles.renewAction}
                      href={`/account/payments/checkout?type=service&service_key=${renewServiceKey}&listing_id=${listing.id}`}
                    >
                      <span>↻</span>
                      <div><strong>تمدید آگهی</strong><small>افزایش اعتبار نمایش آگهی</small></div>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className={styles.noManageNotice}>این حساب مجوز تغییر وضعیت این آگهی را ندارد.</div>
              )}
            </section>
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
