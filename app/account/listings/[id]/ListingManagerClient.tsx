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
    ? value
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

  return code ? titles[code] || code : "دسته‌بندی ثبت نشده";
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
      return "آگهی در سایت منتشر است و کاربران می‌توانند آن را ببینند.";
    case "pending":
      return "آگهی ثبت شده و در صف بررسی کارشناسی قرار دارد.";
    case "rejected":
      return "آگهی نیاز به اصلاح دارد؛ بعد از اصلاح دوباره برای بررسی ارسالش کنید.";
    case "sold":
      return "آگهی به عنوان فروخته شده از چرخه فروش خارج شده است.";
    case "inactive":
      return "نمایش آگهی موقتا متوقف شده و اطلاعات آن حفظ شده است.";
    case "expired":
      return "اعتبار نمایش آگهی تمام شده است؛ می‌توانید آن را تمدید یا دوباره فعال کنید.";
    case "deleted":
      return "آگهی بایگانی شده و در سایت نمایش داده نمی‌شود؛ امکان بازیابی وجود دارد.";
    case "draft":
      return "آگهی هنوز در مرحله پیش نویس است و منتشر نشده است.";
    default:
      return "وضعیت آگهی از همین صفحه قابل پیگیری و مدیریت است.";
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
    return {
      icon: "✓",
      title: "فروخته شد",
      text: "آگهی از نتایج فروش خارج می‌شود و وضعیت فروخته شده می‌گیرد.",
    };
  }

  if (action === "disable_listing") {
    return {
      icon: "Ⅱ",
      title: "توقف موقت",
      text: "نمایش آگهی بدون حذف اطلاعات متوقف می‌شود.",
    };
  }

  if (action === "delete_listing") {
    return {
      icon: "×",
      title: "حذف / بایگانی",
      text: "آگهی از نمایش عمومی و مدیریت روزمره خارج و بایگانی می‌شود.",
    };
  }

  if (code === "sold") {
    return {
      icon: "↻",
      title: "بازگرداندن به فروش",
      text: "آگهی دوباره برای بررسی و انتشار وارد چرخه فروش می‌شود.",
    };
  }

  if (code === "deleted") {
    return {
      icon: "↻",
      title: "بازیابی آگهی",
      text: "آگهی از بایگانی خارج و دوباره برای بررسی ارسال می‌شود.",
    };
  }

  if (code === "rejected") {
    return {
      icon: "↻",
      title: "ارسال دوباره",
      text: "آگهی اصلاح شده دوباره برای بررسی کارشناسی ارسال می‌شود.",
    };
  }

  return {
    icon: "↻",
    title: "بازفعال سازی",
    text: "آگهی دوباره برای بررسی و انتشار ارسال می‌شود.",
  };
}

function actionConfirmation(action: ManageAction) {
  switch (action) {
    case "mark_sold":
      return "این آگهی به عنوان فروخته شده ثبت شود؟";
    case "disable_listing":
      return "نمایش این آگهی موقتا متوقف شود؟";
    case "delete_listing":
      return "این آگهی حذف و بایگانی شود؟ از صفحه عمومی خارج می‌شود ولی امکان بازیابی دارد.";
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

      const responseImages = Array.isArray(payload.images) ? payload.images : [];
      setListing(nextListing);
      setImages(responseImages);
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

      setActionMessage(payload.message || "وضعیت آگهی با موفقیت به روز شد.");
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
  const actions: ManageAction[] = [
    "mark_sold",
    "disable_listing",
    "reactivate_listing",
    "delete_listing",
  ];
  const availableActions = actions.filter((action) => isActionAvailable(currentStatus, action));
  const renewServiceKey = listing?.listing_owner_type === "dealer"
    ? "listing_dealer_renew"
    : "listing_personal_renew";
  const canRenew = ["active", "inactive", "expired"].includes(currentStatus);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account/listings" className={styles.backLink}>← آگهی‌های من</Link>
          <Link href="/" className={styles.brand} aria-label="صفحه اصلی چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h1>در حال آماده سازی مدیریت آگهی</h1>
            <p>اطلاعات آگهی و وضعیت انتشار در حال دریافت است.</p>
          </section>
        )}

        {!loading && error && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h1>مدیریت آگهی در دسترس نیست</h1>
            <p>{error}</p>
            <div className={styles.stateActions}>
              <button type="button" onClick={() => void loadListing()}>تلاش دوباره</button>
              <Link href="/account/listings">بازگشت به آگهی‌ها</Link>
            </div>
          </section>
        )}

        {!loading && !error && listing && (
          <>
            <section className={styles.hero}>
              <div className={styles.heroContent}>
                <div className={styles.badgeRow}>
                  <span className={`${styles.statusBadge} ${statusClass(listing.status?.code)}`}>
                    {listing.status?.title || "در انتظار بررسی"}
                  </span>
                  <span>شناسه #{formatNumber(listing.id)}</span>
                  <span>{listing.listing_owner_type === "dealer" ? "نمایشگاهی" : "شخصی"}</span>
                </div>
                <h1>{listing.title || "آگهی بدون عنوان"}</h1>
                <p>
                  {[listing.brand, listing.model, listing.year].filter(Boolean).join("، ") ||
                    "مشخصات خودرو تکمیل نشده است."}
                </p>
              </div>
              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} href={`/account/listings/${listing.id}/edit`}>
                  ویرایش آگهی
                </Link>
                <Link className={styles.secondaryAction} href={`/cars/${listing.id}`}>
                  نمایش عمومی
                </Link>
              </div>
            </section>

            {rejectionText && currentStatus === "rejected" && (
              <section className={styles.rejectionCard}>
                <span>علت رد یا نیاز به اصلاح</span>
                <p>{rejectionText}</p>
                <Link href={`/account/listings/${listing.id}/edit`}>اصلاح آگهی</Link>
              </section>
            )}

            <section className={styles.lifecyclePanel}>
              <div className={styles.lifecycleIntro}>
                <span>چرخه آگهی</span>
                <h2>{listing.status?.title || "وضعیت آگهی"}</h2>
                <p>{statusDescription(currentStatus)}</p>
              </div>

              {actionMessage && <div className={styles.actionSuccess}>{actionMessage}</div>}
              {actionError && <div className={styles.actionError}>{actionError}</div>}

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
                        <b>{actionLoading === action ? "در حال انجام" : copy.title}</b>
                        <small>{copy.text}</small>
                      </button>
                    );
                  })}

                  {canRenew && (
                    <Link
                      className={styles.renewLifecycleAction}
                      href={`/account/payments/checkout?type=service&service_key=${renewServiceKey}&listing_id=${listing.id}`}
                    >
                      <span>⟳</span>
                      <b>تمدید آگهی</b>
                      <small>تعرفه فعال تمدید از Commerce خوانده می‌شود و پس از پرداخت اعمال خواهد شد.</small>
                    </Link>
                  )}
                </div>
              ) : (
                <div className={styles.noManageNotice}>
                  این حساب مجوز تغییر وضعیت این آگهی را ندارد.
                </div>
              )}
            </section>

            <section className={styles.contentGrid}>
              <article className={styles.previewCard}>
                <div className={styles.imageWrap}>
                  {coverImage ? (
                    <img src={coverImage} alt={listing.title || "تصویر خودرو"} />
                  ) : (
                    <div className={styles.imagePlaceholder}>بدون تصویر</div>
                  )}
                </div>
                <div className={styles.previewBody}>
                  <span>قیمت آگهی</span>
                  <strong>{formatPrice(listing.price_toman)}</strong>
                  <small>{locationLabel}</small>
                </div>
              </article>

              <section className={styles.summaryCard}>
                <header>
                  <span>خلاصه آگهی</span>
                  <h2>وضعیت و مشخصات</h2>
                </header>
                <dl>
                  <div><dt>دسته بندی</dt><dd>{categoryTitle(listing.category_code)}</dd></div>
                  <div><dt>کارکرد</dt><dd>{formatNumber(listing.mileage_km)} کیلومتر</dd></div>
                  <div><dt>تعداد تصاویر</dt><dd>{formatNumber(listing.image_count || allImages.length || 0)}</dd></div>
                  <div><dt>فروشنده</dt><dd>{listing.seller_display_name || "مالک آگهی"}</dd></div>
                  <div><dt>تاریخ ثبت</dt><dd>{formatDate(listing.created_at)}</dd></div>
                  <div><dt>آخرین ویرایش</dt><dd>{formatDate(listing.updated_at)}</dd></div>
                </dl>
              </section>
            </section>

            <section className={styles.actionGrid} aria-label="عملیات آگهی">
              <Link href={`/account/listings/${listing.id}/edit`}>
                <span>✎</span>
                <strong>ویرایش مشخصات</strong>
                <small>عنوان، قیمت، موقعیت و توضیحات</small>
              </Link>
              <Link href={`/account/listings/${listing.id}/images`}>
                <span>▧</span>
                <strong>مدیریت تصاویر</strong>
                <small>آپلود، حذف و انتخاب تصویر اصلی</small>
              </Link>
              <Link href={`/account/listings/${listing.id}/promote`} className={styles.promoteAction}>
                <span>★</span>
                <strong>ارتقای آگهی</strong>
                <small>بالابر، ویژه و استوری منطقه‌ای</small>
              </Link>
              <Link href={`/cars/${listing.id}`}>
                <span>↗</span>
                <strong>مشاهده آگهی</strong>
                <small>نمایش نسخه عمومی برای خریداران</small>
              </Link>
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
