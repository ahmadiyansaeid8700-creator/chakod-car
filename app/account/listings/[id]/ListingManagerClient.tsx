"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type ListingStatus = {
  code?: string;
  title?: string;
  raw?: string;
};

type ListingImage = {
  id?: number;
  image_id?: number;
  image_url?: string;
  is_cover?: boolean;
};

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
  access?: {
    can_view?: boolean;
    can_manage?: boolean;
    reason?: string;
  };
  listing?: ManagedListing;
  images?: ListingImage[];
  data?: ManagedListing[];
};

type ManageAction =
  | "mark_sold"
  | "disable_listing"
  | "reactivate_listing"
  | "delete_listing";

type LoadOptions = {
  preserveFeedback?: boolean;
};

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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      }
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

function formatNumber(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("fa-IR") : "۰";
}

function formatPrice(value: number | string | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
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
  if (["inactive", "expired", "deleted", "draft"].includes(code || "")) {
    return styles.statusInactive;
  }
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
    return { icon: "✓", title: "فروخته شد", text: "آگهی از چرخه فروش خارج می‌شود." };
  }

  if (action === "disable_listing") {
    return { icon: "Ⅱ", title: "توقف موقت", text: "نمایش آگهی بدون حذف اطلاعات متوقف می‌شود." };
  }

  if (action === "delete_listing") {
    return { icon: "×", title: "بایگانی آگهی", text: "آگهی از نمایش عمومی و مدیریت روزمره خارج می‌شود." };
  }

  if (code === "sold") {
    return { icon: "↻", title: "بازگشت به فروش", text: "آگهی دوباره وارد چرخه بررسی و انتشار می‌شود." };
  }

  if (code === "deleted") {
    return { icon: "↻", title: "بازیابی آگهی", text: "آگهی از بایگانی خارج و دوباره بررسی می‌شود." };
  }

  if (code === "rejected") {
    return { icon: "↻", title: "ارسال دوباره", text: "آگهی اصلاح‌شده دوباره برای بررسی ارسال می‌شود." };
  }

  return { icon: "↻", title: "فعال‌سازی دوباره", text: "آگهی دوباره برای بررسی و انتشار ارسال می‌شود." };
}

function actionConfirmation(action: ManageAction) {
  switch (action) {
    case "mark_sold":
      return "این آگهی به عنوان فروخته‌شده ثبت شود؟";
    case "disable_listing":
      return "نمایش این آگهی موقتاً متوقف شود؟";
    case "delete_listing":
      return "این آگهی بایگانی شود؟ از نمایش عمومی خارج می‌شود ولی امکان بازیابی دارد.";
    default:
      return "";
  }
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
      const returnTo = `/account/listings/${listingId}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
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
        const returnTo = `/account/listings/${listingId}`;
        window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      if (!response.ok || !payload?.success) {
        setError(payload?.message || "اطلاعات آگهی دریافت نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }

      const directListing = payload.listing;
      const collectionListing = Array.isArray(payload.data)
        ? payload.data.find((item) => String(item.id) === listingId) || payload.data[0]
        : undefined;
      const nextListing = directListing || collectionListing || null;

      if (!nextListing || String(nextListing.id) !== listingId) {
        setError("این آگهی در فهرست آگهی‌های قابل مدیریت شما پیدا نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }

      setListing(nextListing);
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
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ action }),
      });
      const payload = await readJson<ManagerResponse>(response);

      if (response.status === 401) {
        const returnTo = `/account/listings/${listing.id}`;
        window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
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

  const locationLabel = useMemo(() => {
    return [listing?.province, listing?.city, listing?.neighborhood]
      .filter(Boolean)
      .join("، ") || "موقعیت ثبت نشده";
  }, [listing]);

  const rejectionText = listing?.rejection_reason || listing?.moderation_note || "";
  const allImages = images.length ? images : listing?.images || [];
  const coverImage = listing?.cover_image?.image_url || allImages.find((image) => image.is_cover)?.image_url || allImages[0]?.image_url || "";
  const currentStatus = String(listing?.status?.code || "pending").toLowerCase();
  const currentStatusLabel = statusLabel(listing?.status?.code, listing?.status?.title);
  const actions: ManageAction[] = ["mark_sold", "disable_listing", "reactivate_listing", "delete_listing"];
  const availableActions = actions.filter((action) => isActionAvailable(currentStatus, action));
  const renewServiceKey = listing?.listing_owner_type === "dealer" ? "listing_dealer_renew" : "listing_personal_renew";
  const canRenew = ["active", "inactive", "expired"].includes(currentStatus);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account/listings" className={styles.backLink}>← آگهی‌ها</Link>
          <Link href="/" className={styles.brand} aria-label="صفحه اصلی چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
          <span className={styles.headerSpacer} />
        </header>

        {loading ? (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده‌سازی مدیریت آگهی</h1>
            <p>اطلاعات آگهی و وضعیت انتشار در حال دریافت است.</p>
          </section>
        ) : null}

        {!loading && error ? (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>مدیریت آگهی در دسترس نیست</h1>
            <p>{error}</p>
            <div className={styles.stateActions}>
              <button type="button" onClick={() => void loadListing()}>تلاش دوباره</button>
              <Link href="/account/listings">بازگشت به آگهی‌ها</Link>
            </div>
          </section>
        ) : null}

        {!loading && !error && listing ? (
          <>
            <section className={styles.hero}>
              <div className={styles.heroContent}>
                <div className={styles.badgeRow}>
                  <span className={`${styles.statusBadge} ${statusClass(listing.status?.code)}`}>{currentStatusLabel}</span>
                  <span>شناسه {formatNumber(listing.id)}</span>
                  <span>{listing.listing_owner_type === "dealer" ? "نمایشگاهی" : "شخصی"}</span>
                </div>
                <h1>{listing.title || "آگهی بدون عنوان"}</h1>
                <p>{[listing.brand, listing.model, listing.year].filter(Boolean).join("، ") || "مشخصات خودرو تکمیل نشده است."}</p>
              </div>
              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} href={`/account/listings/${listing.id}/edit`}>ویرایش آگهی</Link>
                <Link className={styles.secondaryAction} href={`/cars/${listing.id}`}>نمایش عمومی</Link>
              </div>
            </section>

            {rejectionText && currentStatus === "rejected" ? (
              <section className={styles.rejectionCard}>
                <span>نیاز به اصلاح</span>
                <div><strong>دلیل رد آگهی</strong><p>{rejectionText}</p></div>
                <Link href={`/account/listings/${listing.id}/edit`}>اصلاح آگهی</Link>
              </section>
            ) : null}

            <section className={styles.overviewGrid}>
              <article className={styles.previewCard}>
                <div className={styles.imageWrap}>
                  {coverImage ? <img src={coverImage} alt={listing.title || "تصویر خودرو"} /> : <div className={styles.imagePlaceholder}><span>چ</span><small>بدون تصویر</small></div>}
                </div>
                <div className={styles.priceBlock}>
                  <span>قیمت آگهی</span>
                  <strong>{formatPrice(listing.price_toman)}</strong>
                  <small>{locationLabel}</small>
                </div>
              </article>

              <section className={styles.summaryCard}>
                <header><span>مشخصات آگهی</span><h2>اطلاعات اصلی</h2></header>
                <div className={styles.specGrid}>
                  <div><span>دسته‌بندی</span><strong>{categoryTitle(listing.category_code)}</strong></div>
                  <div><span>کارکرد</span><strong>{formatNumber(listing.mileage_km)} کیلومتر</strong></div>
                  <div><span>تعداد تصاویر</span><strong>{formatNumber(listing.image_count || allImages.length || 0)}</strong></div>
                  <div><span>فروشنده</span><strong>{listing.seller_display_name || "مالک آگهی"}</strong></div>
                  <div><span>تاریخ ثبت</span><strong>{formatDate(listing.created_at)}</strong></div>
                  <div><span>آخرین ویرایش</span><strong>{formatDate(listing.updated_at)}</strong></div>
                </div>
              </section>
            </section>

            <section className={styles.lifecyclePanel}>
              <div className={styles.lifecycleTop}>
                <div className={styles.lifecycleIntro}>
                  <span>وضعیت انتشار</span>
                  <h2>{currentStatusLabel}</h2>
                  <p>{statusDescription(currentStatus)}</p>
                </div>
                <span className={`${styles.lifecycleStatus} ${statusClass(listing.status?.code)}`}>{currentStatusLabel}</span>
              </div>

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
                        className={destructive ? styles.dangerLifecycleAction : ""}
                        disabled={Boolean(actionLoading)}
                        onClick={() => void runAction(action)}
                      >
                        <span>{actionLoading === action ? "…" : copy.icon}</span>
                        <div><b>{actionLoading === action ? "در حال انجام" : copy.title}</b><small>{copy.text}</small></div>
                      </button>
                    );
                  })}

                  {canRenew ? (
                    <Link className={styles.renewLifecycleAction} href={`/account/payments/checkout?type=service&service_key=${renewServiceKey}&listing_id=${listing.id}`}>
                      <span>⟳</span>
                      <div><b>تمدید آگهی</b><small>تمدید اعتبار نمایش با تعرفه فعال چاکود</small></div>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className={styles.noManageNotice}>این حساب مجوز تغییر وضعیت این آگهی را ندارد.</div>
              )}
            </section>

            <section className={styles.actionGrid} aria-label="مدیریت آگهی">
              <Link href={`/account/listings/${listing.id}/edit`}><span>✎</span><div><strong>ویرایش مشخصات</strong><small>عنوان، قیمت، موقعیت و توضیحات</small></div></Link>
              <Link href={`/account/listings/${listing.id}/images`}><span>▧</span><div><strong>مدیریت تصاویر</strong><small>آپلود، حذف و انتخاب تصویر اصلی</small></div></Link>
              <Link href={`/account/listings/${listing.id}/promote`} className={styles.promoteAction}><span>★</span><div><strong>ارتقای آگهی</strong><small>بالابر، ویژه و استوری منطقه‌ای</small></div></Link>
              <Link href={`/cars/${listing.id}`}><span>↗</span><div><strong>مشاهده آگهی</strong><small>نسخه عمومی برای خریداران</small></div></Link>
            </section>
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
