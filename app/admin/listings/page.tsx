"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

const API_BASE = "https://api.chakod.com";

type ListingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_edit"
  | "inactive"
  | "sold"
  | "deleted";

type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

type AdminListing = {
  id: number;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: string | number | null;
  production_year?: string | number | null;
  price_toman?: string | number | null;
  province?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  status: ListingStatus;
  status_title?: string | null;
  moderation_status?: string | null;
  moderation_status_title?: string | null;
  moderation_score?: number | string | null;
  moderation_risk_level?: RiskLevel | null;
  moderation_risk_title?: string | null;
  moderation_reason?: string | null;
  moderation_notes?: string | null;
  listing_owner_type?:
    | "personal"
    | "dealer"
    | null;
  seller_display_name?: string | null;
  dealer_id?: number | string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
  public_url?: string | null;
};

type AdminListingsResponse = {
  success: boolean;
  message?: string;
  stats?: Record<string, number>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data?: AdminListing[];
};

type AdminAccessResponse = {
  success: boolean;
  is_admin?: boolean;
  message?: string;
  admin?: {
    permissions?: string[];
  };
};

type ListingAction =
  | "approve_listing"
  | "reject_listing"
  | "needs_edit_listing"
  | "flag_listing";

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(
      "chakod_session_token"
    ) || ""
  );
}

async function readJson<T>(
  response: Response
): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `API خروجی JSON معتبر نداد: ${text.slice(
        0,
        220
      )}`
    );
  }
}

function formatNumber(value: unknown) {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number.toLocaleString("fa-IR")
    : "۰";
}

function formatPrice(
  value:
    | string
    | number
    | null
    | undefined
) {
  const number = Number(value || 0);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return "قیمت توافقی";
  }

  if (number >= 1_000_000_000) {
    return `${(
      number / 1_000_000_000
    ).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (number >= 1_000_000) {
    return `${(
      number / 1_000_000
    ).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${number.toLocaleString(
    "fa-IR"
  )} تومان`;
}

function normalizeImageUrl(
  url?: string | null
) {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE}${url}`;
  }

  return `${API_BASE}/${url}`;
}

function statusClass(
  status: ListingStatus
) {
  if (status === "approved") {
    return "approved";
  }

  if (status === "pending") {
    return "pending";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "needs_edit") {
    return "needsEdit";
  }

  if (status === "sold") {
    return "sold";
  }

  return "muted";
}

function riskClass(
  risk?: string | null
) {
  if (risk === "critical") {
    return "critical";
  }

  if (risk === "high") {
    return "high";
  }

  if (risk === "medium") {
    return "medium";
  }

  if (risk === "low") {
    return "low";
  }

  return "none";
}

function faDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(
    value.replace(" ", "T")
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function hasPermission(
  permissions: string[],
  permission: string
) {
  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
}

export default function AdminListingsPage() {
  const [accessLoading, setAccessLoading] =
    useState(true);

  const [canViewListings, setCanViewListings] =
    useState(false);

  const [canManageListings, setCanManageListings] =
    useState(false);

  const [accessMessage, setAccessMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [savingId, setSavingId] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const [items, setItems] =
    useState<AdminListing[]>([]);

  const [stats, setStats] = useState<
    Record<string, number>
  >({});

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
    });

  const [status, setStatus] =
    useState("pending");

  const [risk, setRisk] =
    useState("all");

  const [ownerType, setOwnerType] =
    useState("all");

  const [query, setQuery] =
    useState("");

  const verifyAccess = useCallback(async () => {
    setAccessLoading(true);
    setAccessMessage("");

    const token = getToken();

    if (!token) {
      setCanViewListings(false);
      setCanManageListings(false);
      setAccessMessage(
        "برای ورود به صف مدیریت آگهی‌ها، ابتدا وارد حساب ادمین شوید."
      );
      setAccessLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/admin-me.php`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Session-Token": token,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );
      const json =
        await readJson<AdminAccessResponse>(
          response
        );
      const permissions =
        json.admin?.permissions || [];
      const canManage = hasPermission(
        permissions,
        "listings.manage"
      );
      const canView =
        canManage ||
        hasPermission(
          permissions,
          "listings.view"
        );

      if (
        !response.ok ||
        !json.success ||
        !json.is_admin ||
        !canView
      ) {
        setCanViewListings(false);
        setCanManageListings(false);
        setAccessMessage(
          json.message ||
            "این نقش اجازه مشاهده صف آگهی‌ها را ندارد."
        );
        return;
      }

      setCanViewListings(true);
      setCanManageListings(canManage);
    } catch (requestError) {
      setCanViewListings(false);
      setCanManageListings(false);
      setAccessMessage(
        requestError instanceof Error
          ? requestError.message
          : "بررسی سطح دسترسی ادمین انجام نشد."
      );
    } finally {
      setAccessLoading(false);
    }
  }, []);

  const loadListings = useCallback(
    async (
      nextPage = 1,
      keepMessage = false
    ) => {
      setLoading(true);

      if (!keepMessage) {
        setMessage("");
      }

      const token = getToken();

      if (!token) {
        setMessage(
          "برای ورود به صف مدیریت آگهی‌ها، ابتدا وارد حساب ادمین شوید."
        );

        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const params =
          new URLSearchParams({
            status,
            risk,
            owner_type: ownerType,
            q: query.trim(),
            page: String(nextPage),
            limit: "20",
          });

        const response = await fetch(
          `${API_BASE}/api/admin-listings.php?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Session-Token": token,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const json =
          await readJson<AdminListingsResponse>(
            response
          );

        if (
          !response.ok ||
          !json.success
        ) {
          setMessage(
            json.message ||
              "خطا در دریافت صف آگهی‌ها."
          );

          setItems([]);
          return;
        }

        setItems(
          Array.isArray(json.data)
            ? json.data
            : []
        );

        setStats(json.stats || {});

        setPagination(
          json.pagination || {
            page: nextPage,
            limit: 20,
            total: 0,
            pages: 1,
          }
        );
      } catch (requestError) {
        setMessage(
          requestError instanceof Error
            ? requestError.message
            : "اتصال به API مدیریت برقرار نشد."
        );

        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [ownerType, query, risk, status]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void verifyAccess();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [verifyAccess]);

  useEffect(() => {
    if (!canViewListings) return;

    const timeoutId = window.setTimeout(() => {
      void loadListings(1);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [canViewListings, loadListings]);

  async function doAction(
    listing: AdminListing,
    action: ListingAction
  ) {
    setMessage("");

    if (!canManageListings) {
      setMessage(
        "این نقش فقط اجازه مشاهده دارد و نمی‌تواند وضعیت آگهی را تغییر دهد."
      );
      return;
    }

    let reason = "";
    let notes = "";

    if (
      action === "reject_listing"
    ) {
      const value = window.prompt(
        "دلیل رد آگهی را وارد کن:"
      );

      if (!value?.trim()) {
        setMessage(
          "برای رد آگهی باید دلیل وارد شود."
        );

        return;
      }

      reason = value.trim();
    }

    if (
      action ===
      "needs_edit_listing"
    ) {
      const value = window.prompt(
        "اصلاحات موردنیاز را برای کاربر بنویس:"
      );

      if (!value?.trim()) {
        setMessage(
          "برای ارسال جهت اصلاح باید توضیح وارد شود."
        );

        return;
      }

      reason = value.trim();
    }

    if (
      action === "flag_listing"
    ) {
      const value = window.prompt(
        "دلیل پرچم‌گذاری:",
        "نیازمند بررسی بیشتر"
      );

      reason =
        value?.trim() ||
        "نیازمند بررسی بیشتر";
    }

    if (
      action ===
      "approve_listing"
    ) {
      const confirmed =
        window.confirm(
          "این آگهی تأیید و عمومی شود؟"
        );

      if (!confirmed) return;

      notes = "تأیید توسط ادمین";
    }

    const token = getToken();

    if (!token) {
      setMessage(
        "نشست ورود پیدا نشد. دوباره وارد شوید."
      );

      return;
    }

    setSavingId(listing.id);

    try {
      const response = await fetch(
        `${API_BASE}/api/admin-listings.php`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Session-Token": token,
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            action,
            listing_id: listing.id,
            reason,
            notes,
          }),
        }
      );

      const json =
        await readJson<AdminListingsResponse>(
          response
        );

      if (
        !response.ok ||
        !json.success
      ) {
        setMessage(
          json.message ||
            "عملیات مدیریتی انجام نشد."
        );

        return;
      }

      const successMessage =
        action === "approve_listing"
          ? "آگهی تأیید شد و اکنون در صفحه عمومی قابل نمایش است."
          : json.message ||
            "عملیات با موفقیت انجام شد.";

      await loadListings(
        pagination.page,
        true
      );

      setMessage(successMessage);
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "خطا در انجام عملیات مدیریتی آگهی."
      );
    } finally {
      setSavingId(null);
    }
  }

  if (accessLoading) {
    return (
      <main
        className="adminListingsPage gatePage"
        dir="rtl"
      >
        <section className="gateState">
          <div
            className="spinner"
            aria-hidden="true"
          />
          <h1>در حال بررسی دسترسی ادمین...</h1>
          <p>
            نقش و مجوز صف آگهی‌ها از سرور چاکود
            بررسی می‌شود.
          </p>
        </section>
        <style>{styles}</style>
      </main>
    );
  }

  if (!canViewListings) {
    return (
      <main
        className="adminListingsPage gatePage"
        dir="rtl"
      >
        <section className="gateState denied">
          <span
            className="gateIcon"
            aria-hidden="true"
          >
            🔒
          </span>
          <h1>دسترسی به صف آگهی‌ها مجاز نیست</h1>
          <p>
            {accessMessage ||
              "این نقش اجازه مشاهده اطلاعات آگهی‌ها را ندارد."}
          </p>
          <div className="gateActions">
            <Link href="/admin">
              بازگشت به داشبورد
            </Link>
            <button
              type="button"
              onClick={() => void verifyAccess()}
            >
              بررسی دوباره
            </button>
            <Link href="/login">
              ورود دوباره
            </Link>
          </div>
        </section>
        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main
      className="adminListingsPage"
      dir="rtl"
    >
      <aside className="adminSidebar">
        <Link
          className="brand"
          href="/admin"
        >
          <span>چ</span>

          <div>
            <strong>چاکود</strong>
            <small>اتاق فرمان</small>
          </div>
        </Link>

        <nav>
          <Link href="/admin">
            داشبورد
          </Link>

          <Link
            className="active"
            href="/admin/listings"
          >
            تأیید آگهی‌ها
          </Link>

          <span className="disabledLink">
            پرداخت‌ها — به‌زودی
          </span>

          <span className="disabledLink">
            گزارش‌ها — به‌زودی
          </span>

          <Link href="/">
            بازگشت به سایت
          </Link>
        </nav>
      </aside>

      <section className="content">
        <header className="topHeader">
          <div>
            <span className="eyebrow">
              مدیریت محتوا
            </span>

            <h1>
              صف تأیید و نظارت آگهی‌ها
            </h1>

            <p>
              آگهی‌های قدیمی و جدید از یک صف واحد
              خوانده می‌شوند و وضعیت عمومی استاندارد
              «approved» است.
            </p>

            <span className="accessBadge">
              {canManageListings
                ? "سطح دسترسی: بررسی و اقدام"
                : "سطح دسترسی: فقط مشاهده"}
            </span>
          </div>

          <div className="headerActions">
            <button
              type="button"
              onClick={() =>
                void loadListings(
                  pagination.page
                )
              }
              disabled={loading}
            >
              {loading
                ? "در حال دریافت..."
                : "بروزرسانی"}
            </button>

            <Link href="/admin">
              داشبورد ادمین
            </Link>
          </div>
        </header>

        <section className="statsGrid">
          <article>
            <span>کل آگهی‌ها</span>

            <strong>
              {formatNumber(stats.total)}
            </strong>
          </article>

          <article>
            <span>
              در انتظار بررسی
            </span>

            <strong>
              {formatNumber(stats.pending)}
            </strong>
          </article>

          <article>
            <span>تأیید شده</span>

            <strong>
              {formatNumber(stats.approved)}
            </strong>
          </article>

          <article>
            <span>رد شده</span>

            <strong>
              {formatNumber(stats.rejected)}
            </strong>
          </article>

          <article>
            <span>نیازمند اصلاح</span>

            <strong>
              {formatNumber(stats.needs_edit)}
            </strong>
          </article>
        </section>

        <section className="filtersBox">
          <label>
            وضعیت آگهی

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
            >
              <option value="pending">
                در انتظار بررسی
              </option>

              <option value="all">
                همه
              </option>

              <option value="approved">
                تأیید شده
              </option>

              <option value="rejected">
                رد شده
              </option>

              <option value="needs_edit">
                نیازمند اصلاح
              </option>

              <option value="inactive">
                غیرفعال
              </option>

              <option value="sold">
                فروخته‌شده
              </option>

              <option value="deleted">
                حذف‌شده
              </option>
            </select>
          </label>

          <label>
            ریسک

            <select
              value={risk}
              onChange={(event) =>
                setRisk(
                  event.target.value
                )
              }
            >
              <option value="all">
                همه
              </option>

              <option value="critical">
                بحرانی
              </option>

              <option value="high">
                زیاد
              </option>

              <option value="medium">
                متوسط
              </option>

              <option value="low">
                کم
              </option>
            </select>
          </label>

          <label>
            نوع مالک

            <select
              value={ownerType}
              onChange={(event) =>
                setOwnerType(
                  event.target.value
                )
              }
            >
              <option value="all">
                همه
              </option>

              <option value="personal">
                شخصی
              </option>

              <option value="dealer">
                نمایشگاه
              </option>
            </select>
          </label>

          <label className="searchLabel">
            جستجو

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="عنوان، برند، شهر، نمایشگاه..."
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  void loadListings(1);
                }
              }}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              void loadListings(1)
            }
            disabled={loading}
          >
            اعمال فیلتر
          </button>
        </section>

        {message ? (
          <div className="messageBox">
            {message}
          </div>
        ) : null}

        <section className="listPanel">
          <div className="panelTitle">
            <div>
              <h2>
                آگهی‌های قابل بررسی
              </h2>

              <p>
                تعداد نتیجه:{" "}
                {formatNumber(
                  pagination.total
                )}{" "}
                آگهی
              </p>
            </div>

            <span>
              صفحه{" "}
              {formatNumber(
                pagination.page
              )}{" "}
              از{" "}
              {formatNumber(
                pagination.pages
              )}
            </span>
          </div>

          {loading ? (
            <div className="loadingState">
              <div
                className="spinner"
                aria-hidden="true"
              />

              <strong>
                در حال دریافت آگهی‌ها...
              </strong>
            </div>
          ) : items.length === 0 ? (
            <div className="emptyState">
              <strong>
                آگهی‌ای برای نمایش وجود ندارد.
              </strong>

              <p>
                فیلتر «همه» را انتخاب کن یا وضعیت
                دیگری را بررسی کن.
              </p>
            </div>
          ) : (
            <div className="listingCards">
              {items.map((item) => {
                const image =
                  normalizeImageUrl(
                    item.cover_image_url
                  );

                const year =
                  item.production_year ||
                  item.year;

                const vehicleName = [
                  item.brand,
                  item.model,
                  year,
                ]
                  .filter(Boolean)
                  .join(" ");

                const location = [
                  item.province,
                  item.city,
                  item.neighborhood,
                ]
                  .filter(Boolean)
                  .join("، ");

                return (
                  <article
                    className="listingCard"
                    key={item.id}
                  >
                    <div className="thumb">
                      {image ? (
                        <img
                          src={image}
                          alt={
                            item.title ||
                            "تصویر آگهی"
                          }
                        />
                      ) : (
                        <span>
                          بدون عکس
                        </span>
                      )}
                    </div>

                    <div className="listingInfo">
                      <div className="titleRow">
                        <h3>
                          {item.title ||
                            "بدون عنوان"}
                        </h3>

                        <div className="badges">
                          <span
                            className={`statusBadge ${statusClass(
                              item.status
                            )}`}
                          >
                            {item.status_title ||
                              item.status}
                          </span>

                          <span
                            className={`riskBadge ${riskClass(
                              item.moderation_risk_level
                            )}`}
                          >
                            ریسک:{" "}
                            {item.moderation_risk_title ||
                              "نامشخص"}
                          </span>
                        </div>
                      </div>

                      <div className="metaGrid">
                        <span>
                          خودرو:{" "}
                          <b>
                            {vehicleName ||
                              "—"}
                          </b>
                        </span>

                        <span>
                          قیمت:{" "}
                          <b>
                            {formatPrice(
                              item.price_toman
                            )}
                          </b>
                        </span>

                        <span>
                          موقعیت:{" "}
                          <b>
                            {location ||
                              "—"}
                          </b>
                        </span>

                        <span>
                          نوع:{" "}
                          <b>
                            {item.listing_owner_type ===
                            "dealer"
                              ? item.seller_display_name ||
                                "نمایشگاهی"
                              : "شخصی"}
                          </b>
                        </span>

                        <span>
                          تاریخ ثبت:{" "}
                          <b>
                            {faDate(
                              item.created_at
                            )}
                          </b>
                        </span>

                        <span>
                          کد آگهی:{" "}
                          <b>
                            {formatNumber(
                              item.id
                            )}
                          </b>
                        </span>
                      </div>

                      {item.moderation_reason ||
                      item.moderation_notes ? (
                        <div className="reasonBox">
                          {item.moderation_reason ? (
                            <p>
                              <b>دلیل:</b>{" "}
                              {
                                item.moderation_reason
                              }
                            </p>
                          ) : null}

                          {item.moderation_notes ? (
                            <p>
                              <b>
                                یادداشت:
                              </b>{" "}
                              {
                                item.moderation_notes
                              }
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="actions">
                        {canManageListings ? (
                          <>
                            <button
                              type="button"
                              className="approveBtn"
                              disabled={
                                savingId ===
                                item.id
                              }
                              onClick={() =>
                                void doAction(
                                  item,
                                  "approve_listing"
                                )
                              }
                            >
                              تأیید
                            </button>

                            <button
                              type="button"
                              className="editBtn"
                              disabled={
                                savingId ===
                                item.id
                              }
                              onClick={() =>
                                void doAction(
                                  item,
                                  "needs_edit_listing"
                                )
                              }
                            >
                              نیازمند اصلاح
                            </button>

                            <button
                              type="button"
                              className="rejectBtn"
                              disabled={
                                savingId ===
                                item.id
                              }
                              onClick={() =>
                                void doAction(
                                  item,
                                  "reject_listing"
                                )
                              }
                            >
                              رد
                            </button>

                            <button
                              type="button"
                              className="flagBtn"
                              disabled={
                                savingId ===
                                item.id
                              }
                              onClick={() =>
                                void doAction(
                                  item,
                                  "flag_listing"
                                )
                              }
                            >
                              پرچم‌گذاری
                            </button>
                          </>
                        ) : (
                          <span className="viewOnlyNotice">
                            این حساب فقط اجازه مشاهده دارد.
                          </span>
                        )}

                        <Link
                          href={
                            item.public_url ||
                            `/cars/${item.id}`
                          }
                          target="_blank"
                        >
                          مشاهده آگهی
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="pagination">
            <button
              type="button"
              disabled={
                loading ||
                pagination.page <= 1
              }
              onClick={() =>
                void loadListings(
                  Math.max(
                    1,
                    pagination.page - 1
                  )
                )
              }
            >
              قبلی
            </button>

            <span>
              {formatNumber(
                pagination.page
              )}{" "}
              /{" "}
              {formatNumber(
                pagination.pages
              )}
            </span>

            <button
              type="button"
              disabled={
                loading ||
                pagination.page >=
                  pagination.pages
              }
              onClick={() =>
                void loadListings(
                  Math.min(
                    pagination.pages,
                    pagination.page + 1
                  )
                )
              }
            >
              بعدی
            </button>
          </div>
        </section>
      </section>

      <nav
        className="mobileNav"
        aria-label="منوی مدیریت"
      >
        <Link href="/admin">
          داشبورد
        </Link>

        <Link
          className="active"
          href="/admin/listings"
        >
          آگهی‌ها
        </Link>

        <Link href="/">سایت</Link>
      </nav>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .adminListingsPage {
    min-height: 100vh;
    display: grid;
    grid-template-columns:
      250px minmax(0, 1fr);
    color: #211335;
    font-family:
      Tahoma,
      Arial,
      sans-serif;
    background:
      radial-gradient(
        circle at top right,
        rgba(124, 58, 237, 0.16),
        transparent 32%
      ),
      linear-gradient(
        180deg,
        #fbf8ff 0%,
        #ffffff 44%,
        #f7f2ff 100%
      );
  }

  .adminSidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    padding: 22px;
    border-left:
      1px solid #eadcff;
    background:
      rgba(
        255,
        255,
        255,
        0.94
      );
    box-shadow:
      -14px 0 50px
      rgba(
        76,
        29,
        149,
        0.06
      );
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
    color: inherit;
    text-decoration: none;
  }

  .brand > span {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    color: #fff;
    font-size: 22px;
    font-weight: 900;
    border-radius: 15px;
    background:
      linear-gradient(
        135deg,
        #6d28d9,
        #a855f7
      );
  }

  .brand strong {
    display: block;
    font-size: 17px;
  }

  .brand small {
    color: #7b6a91;
    font-size: 11px;
  }

  .adminSidebar nav {
    display: grid;
    gap: 8px;
  }

  .adminSidebar nav a,
  .disabledLink {
    padding: 12px 13px;
    color: #5f4d72;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    border-radius: 15px;
  }

  .adminSidebar nav a:hover,
  .adminSidebar nav a.active {
    color: #6d28d9;
    background: #f4ecff;
  }

  .disabledLink {
    color: #9b91a7;
    background: #faf8fc;
    cursor: not-allowed;
  }

  .content {
    min-width: 0;
    padding:
      24px 24px 95px;
  }

  .gatePage {
    display: grid;
    min-height: 100vh;
    padding: 24px;
    place-items: center;
  }

  .gateState {
    display: grid;
    width: min(560px, 100%);
    padding: 38px 28px;
    place-items: center;
    color: #725f86;
    text-align: center;
    border: 1px solid #eadcff;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 22px 70px rgba(76, 29, 149, 0.12);
  }

  .gateState h1 {
    margin: 18px 0 6px;
    color: #211335;
    font-size: 23px;
  }

  .gateState p {
    margin: 0;
    line-height: 2;
  }

  .gateIcon {
    font-size: 34px;
  }

  .gateActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 9px;
    margin-top: 20px;
  }

  .gateActions a,
  .gateActions button {
    padding: 11px 14px;
    color: #6d28d9;
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    text-decoration: none;
    border: 0;
    border-radius: 13px;
    background: #f4ecff;
    cursor: pointer;
  }

  .topHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 18px;
  }

  .eyebrow {
    display: inline-flex;
    margin-bottom: 8px;
    padding: 7px 11px;
    color: #6d28d9;
    font-size: 12px;
    font-weight: 900;
    border:
      1px solid #e4d4ff;
    border-radius: 999px;
    background: #f4ecff;
  }

  .topHeader h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.6;
  }

  .topHeader p {
    margin: 4px 0 0;
    color: #725f86;
    font-size: 13px;
    line-height: 2;
  }

  .accessBadge {
    display: inline-flex;
    margin-top: 9px;
    padding: 6px 10px;
    color: #5b21b6;
    font-size: 11px;
    font-weight: 900;
    border: 1px solid #e4d4ff;
    border-radius: 999px;
    background: #faf7ff;
  }

  .headerActions {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .headerActions button,
  .headerActions a,
  .filtersBox > button,
  .pagination button,
  .actions button,
  .actions a {
    padding: 11px 14px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 900;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    border: 0;
    border-radius: 13px;
  }

  .headerActions button,
  .filtersBox > button {
    color: #fff;
    background: #6d28d9;
  }

  .headerActions a {
    color: #6d28d9;
    background: #f4ecff;
  }

  .statsGrid {
    display: grid;
    grid-template-columns:
      repeat(
        5,
        minmax(0, 1fr)
      );
    gap: 11px;
    margin-bottom: 15px;
  }

  .statsGrid article,
  .filtersBox,
  .listPanel {
    border:
      1px solid #eadcff;
    background:
      rgba(
        255,
        255,
        255,
        0.94
      );
    box-shadow:
      0 18px 50px
      rgba(
        76,
        29,
        149,
        0.08
      );
  }

  .statsGrid article {
    padding: 15px;
    border-radius: 20px;
  }

  .statsGrid span {
    color: #7b6a91;
    font-size: 12px;
  }

  .statsGrid strong {
    display: block;
    margin-top: 7px;
    font-size: 22px;
  }

  .filtersBox {
    display: grid;
    grid-template-columns:
      170px
      145px
      145px
      minmax(180px, 1fr)
      auto;
    gap: 11px;
    align-items: end;
    margin-bottom: 15px;
    padding: 15px;
    border-radius: 22px;
  }

  label {
    display: grid;
    gap: 7px;
    color: #5f4d72;
    font-size: 12px;
    font-weight: 900;
  }

  input,
  select {
    width: 100%;
    padding: 12px;
    color: #211335;
    font-family: inherit;
    outline: none;
    border:
      1px solid #e2d4f8;
    border-radius: 14px;
    background: #fff;
  }

  input:focus,
  select:focus {
    border-color: #8b5cf6;
    box-shadow:
      0 0 0 4px
      rgba(
        139,
        92,
        246,
        0.12
      );
  }

  .messageBox {
    margin-bottom: 15px;
    padding: 13px 15px;
    color: #9a3412;
    font-size: 13px;
    font-weight: 900;
    border:
      1px solid #fed7aa;
    border-radius: 16px;
    background: #fff7ed;
  }

  .listPanel {
    padding: 18px;
    border-radius: 26px;
  }

  .panelTitle {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 15px;
  }

  .panelTitle h2 {
    margin: 0;
    font-size: 20px;
  }

  .panelTitle p {
    margin: 5px 0 0;
    color: #806f93;
    font-size: 12px;
  }

  .panelTitle > span {
    padding: 8px 11px;
    color: #6d28d9;
    font-size: 12px;
    font-weight: 900;
    border-radius: 999px;
    background: #f4ecff;
  }

  .listingCards {
    display: grid;
    gap: 13px;
  }

  .listingCard {
    display: grid;
    grid-template-columns:
      160px minmax(0, 1fr);
    gap: 15px;
    padding: 14px;
    border:
      1px solid #f0e6ff;
    border-radius: 22px;
    background: #fff;
  }

  .thumb {
    display: grid;
    width: 160px;
    height: 125px;
    place-items: center;
    overflow: hidden;
    color: #8b5cf6;
    font-size: 12px;
    font-weight: 900;
    border-radius: 18px;
    background: #f4ecff;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .listingInfo {
    min-width: 0;
  }

  .titleRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .titleRow h3 {
    margin: 0;
    font-size: 17px;
    line-height: 1.7;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 7px;
  }

  .statusBadge,
  .riskBadge {
    display: inline-flex;
    padding: 6px 9px;
    font-size: 11px;
    font-weight: 900;
    border-radius: 999px;
  }

  .statusBadge.approved {
    color: #047857;
    background: #ecfdf5;
  }

  .statusBadge.pending {
    color: #92400e;
    background: #fffbeb;
  }

  .statusBadge.rejected {
    color: #b91c1c;
    background: #fef2f2;
  }

  .statusBadge.needsEdit {
    color: #6d28d9;
    background: #f4ecff;
  }

  .statusBadge.sold {
    color: #0369a1;
    background: #e0f2fe;
  }

  .statusBadge.muted {
    color: #64748b;
    background: #f1f5f9;
  }

  .riskBadge.critical {
    color: #fff;
    background: #991b1b;
  }

  .riskBadge.high {
    color: #b91c1c;
    background: #fee2e2;
  }

  .riskBadge.medium {
    color: #92400e;
    background: #fffbeb;
  }

  .riskBadge.low {
    color: #047857;
    background: #ecfdf5;
  }

  .riskBadge.none {
    color: #64748b;
    background: #f1f5f9;
  }

  .metaGrid {
    display: grid;
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
    gap: 8px;
    margin-bottom: 10px;
  }

  .metaGrid span {
    padding: 9px;
    color: #806f93;
    font-size: 12px;
    line-height: 1.8;
    border:
      1px solid #f0e6ff;
    border-radius: 13px;
    background: #fbf8ff;
  }

  .metaGrid b {
    color: #211335;
  }

  .reasonBox {
    margin-bottom: 10px;
    padding: 10px 12px;
    color: #9a3412;
    font-size: 12px;
    line-height: 1.9;
    border:
      1px solid #fed7aa;
    border-radius: 14px;
    background: #fff7ed;
  }

  .reasonBox p {
    margin: 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .actions .approveBtn {
    color: #fff;
    background: #059669;
  }

  .actions .editBtn {
    color: #fff;
    background: #7c3aed;
  }

  .actions .rejectBtn {
    color: #fff;
    background: #dc2626;
  }

  .actions .flagBtn {
    color: #fff;
    background: #f59e0b;
  }

  .actions a {
    color: #6d28d9;
    background: #f4ecff;
  }

  .viewOnlyNotice {
    display: inline-flex;
    align-items: center;
    padding: 10px 13px;
    color: #6b5a7e;
    font-size: 12px;
    font-weight: 900;
    border: 1px solid #e8def1;
    border-radius: 13px;
    background: #faf8fc;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    margin-top: 18px;
  }

  .pagination button {
    color: #fff;
    background: #6d28d9;
  }

  .pagination span {
    padding: 9px 13px;
    color: #6d28d9;
    font-size: 12px;
    font-weight: 900;
    border-radius: 999px;
    background: #f4ecff;
  }

  .loadingState,
  .emptyState {
    display: grid;
    min-height: 220px;
    place-items: center;
    color: #806f93;
    text-align: center;
  }

  .loadingState {
    gap: 12px;
  }

  .emptyState strong {
    display: block;
    margin-bottom: 6px;
    color: #211335;
    font-size: 16px;
  }

  .emptyState p {
    margin: 0;
    line-height: 2;
  }

  .spinner {
    width: 44px;
    height: 44px;
    border: 4px solid #eadcff;
    border-top-color: #6d28d9;
    border-radius: 50%;
    animation:
      spin 0.9s linear infinite;
  }

  .mobileNav {
    display: none;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1080px) {
    .adminListingsPage {
      grid-template-columns: 1fr;
    }

    .adminSidebar {
      display: none;
    }

    .content {
      padding:
        16px 16px 95px;
    }

    .topHeader {
      flex-direction: column;
    }

    .statsGrid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .filtersBox {
      grid-template-columns:
        1fr 1fr;
    }

    .searchLabel {
      grid-column: span 2;
    }

    .listingCard {
      grid-template-columns:
        120px minmax(0, 1fr);
    }

    .thumb {
      width: 120px;
      height: 105px;
    }

    .metaGrid {
      grid-template-columns:
        1fr 1fr;
    }

    .mobileNav {
      position: fixed;
      right: 12px;
      bottom: 12px;
      left: 12px;
      z-index: 100;
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 7px;
      padding: 8px;
      border:
        1px solid #eadcff;
      border-radius: 20px;
      background:
        rgba(
          255,
          255,
          255,
          0.94
        );
      box-shadow:
        0 18px 50px
        rgba(
          76,
          29,
          149,
          0.16
        );
      backdrop-filter: blur(14px);
    }

    .mobileNav a {
      padding: 10px 6px;
      color: #6d28d9;
      font-size: 11px;
      font-weight: 900;
      text-align: center;
      text-decoration: none;
      border-radius: 13px;
      background: #f8f3ff;
    }

    .mobileNav a.active {
      color: #fff;
      background: #6d28d9;
    }
  }

  @media (max-width: 700px) {
    .statsGrid,
    .filtersBox {
      grid-template-columns: 1fr;
    }

    .searchLabel {
      grid-column: span 1;
    }

    .listingCard {
      grid-template-columns: 1fr;
    }

    .thumb {
      width: 100%;
      height: 190px;
    }

    .titleRow {
      flex-direction: column;
    }

    .badges {
      justify-content: flex-start;
    }

    .metaGrid {
      grid-template-columns: 1fr;
    }

    .headerActions {
      width: 100%;
      display: grid;
      grid-template-columns:
        1fr 1fr;
    }

    .topHeader h1 {
      font-size: 22px;
    }
  }
`;
