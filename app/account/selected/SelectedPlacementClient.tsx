"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type PlacementKey =
  | "showroom"
  | "luxury"
  | "freezone"
  | "parts_store"
  | "repair_shop"
  | "car_service";

type Activity = {
  id: number;
  type: string;
  name: string;
  province?: string;
  city?: string;
  status?: string;
  verification_status?: string;
  external_dealer_id?: number | null;
};

type ActivitiesResponse = {
  success?: boolean;
  message?: string;
  activities?: Activity[];
};

type Listing = {
  id: number;
  title: string;
  brand?: string;
  brand_name?: string;
  model?: string;
  model_name?: string;
  price_toman?: number | string | null;
  category_code?: string;
  category_name?: string;
  market_segment?: string | null;
  province?: string;
  city?: string;
  status?: { code?: string; title?: string } | string;
  cover_image?: { image_url?: string } | null;
  images?: Array<{ image_url?: string; is_cover?: boolean }>;
};

type ListingsResponse = {
  success?: boolean;
  message?: string;
  data?: Listing[];
};

type SelectedOrder = {
  order_no: string;
  product_code: string;
  original_amount_toman: number;
  discount_amount_toman: number;
  amount_toman: number;
  status: string;
  metadata?: Record<string, unknown>;
};

type CheckoutStateResponse = {
  success?: boolean;
  message?: string;
  test_coupon?: string;
  test_discount_percent?: number;
  orders?: SelectedOrder[];
};

type CheckoutResponse = {
  success?: boolean;
  message?: string;
  checkout_url?: string;
  order?: SelectedOrder;
};

type Target = {
  id: number;
  title: string;
  subtitle: string;
  image?: string;
};

type Placement = {
  key: PlacementKey;
  title: string;
  eyebrow: string;
  description: string;
  targetLabel: string;
  homeAnchor: string;
};

type EligibleItem = {
  key: string;
  placement: Placement;
  target: Target;
  activeOrder: SelectedOrder | null;
};

const PLACEMENTS: Placement[] = [
  {
    key: "showroom",
    title: "نمایشگاه منتخب",
    eyebrow: "SHOWROOM",
    description: "نمایشگاه فعال شما در سکشن نمایشگاه‌های منتخب صفحه اول در اولویت نمایش قرار می‌گیرد.",
    targetLabel: "نمایشگاه",
    homeAnchor: "/#showrooms",
  },
  {
    key: "luxury",
    title: "خودرو لوکس",
    eyebrow: "LUXURY",
    description: "این آگهی فعال می‌تواند در ابتدای ویترین خودروهای لوکس صفحه اول قرار بگیرد.",
    targetLabel: "خودرو لوکس",
    homeAnchor: "/#luxury",
  },
  {
    key: "freezone",
    title: "خودرو منطقه آزاد",
    eyebrow: "FREE ZONE",
    description: "این آگهی فعال می‌تواند در ابتدای ویترین خودروهای منطقه آزاد صفحه اول قرار بگیرد.",
    targetLabel: "خودرو منطقه آزاد",
    homeAnchor: "/#freezone",
  },
  {
    key: "parts_store",
    title: "منتخب لوازم یدکی",
    eyebrow: "PARTS",
    description: "فروشگاه فعال شما می‌تواند در سکشن لوازم یدکی صفحه اول بالاتر از نمایش عادی دیده شود.",
    targetLabel: "فروشگاه لوازم یدکی",
    homeAnchor: "/#featured-parts_store",
  },
  {
    key: "repair_shop",
    title: "تعمیرگاه منتخب",
    eyebrow: "REPAIR",
    description: "تعمیرگاه فعال شما می‌تواند در سکشن تعمیر و نگهداری صفحه اول در اولویت نمایش قرار بگیرد.",
    targetLabel: "تعمیرگاه",
    homeAnchor: "/#featured-repair_shop",
  },
  {
    key: "car_service",
    title: "خدمات منتخب",
    eyebrow: "SERVICES",
    description: "مرکز خدمات فعال شما می‌تواند در سکشن خدمات صفحه اول در اولویت نمایش قرار بگیرد.",
    targetLabel: "مرکز خدمات",
    homeAnchor: "/#featured-car_service",
  },
];

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function isFreezone(listing: Listing) {
  const text = normalizeText(
    [
      listing.market_segment,
      listing.category_code,
      listing.category_name,
      listing.title,
      listing.province,
      listing.city,
    ].join(" "),
  );

  return (
    normalizeText(listing.market_segment) === "freezone" ||
    [
      "freezone",
      "منطقهآزاد",
      "کیش",
      "قشم",
      "اروند",
      "انزلی",
      "ارس",
      "ماکو",
      "چابهار",
    ].some((term) => text.includes(normalizeText(term)))
  );
}

function isLuxury(listing: Listing) {
  if (isFreezone(listing)) return false;

  const text = normalizeText(
    `${listing.brand || listing.brand_name || ""} ${listing.model || listing.model_name || ""} ${listing.title || ""}`,
  );
  const luxuryTerms = [
    "porsche", "پورشه", "mercedesbenz", "مرسدسبنز", "bmw", "بیامو", "audi", "آئودی",
    "lexus", "لکسوس", "landrover", "لندرور", "rangerover", "رنجروور", "jaguar", "جگوار",
    "volvo", "ولوو", "maserati", "مازراتی", "ferrari", "فراری", "lamborghini", "لامبورگینی",
    "bentley", "بنتلی", "rollsroyce", "رولزرویس", "astonmartin", "استونمارتین", "mclaren", "مکلارن",
    "maybach", "مایباخ", "tesla", "تسلا", "genesis", "جنسیس", "infiniti", "اینفینیتی",
    "cadillac", "کادیلاک", "hongqi", "هونگچی", "tank", "تانک", "fownix", "فونیکس",
    "extreme", "اکستریم", "lucano", "لوکانو",
  ];

  return (
    normalizeText(listing.market_segment) === "luxury" ||
    normalizeText(listing.category_code) === "luxury" ||
    luxuryTerms.some((term) => text.includes(normalizeText(term))) ||
    Number(listing.price_toman || 0) >= 2_000_000_000
  );
}

function listingImage(listing: Listing) {
  return (
    listing.cover_image?.image_url ||
    listing.images?.find((item) => item.is_cover)?.image_url ||
    listing.images?.[0]?.image_url ||
    ""
  );
}

function activeListing(listing: Listing) {
  const status = typeof listing.status === "string" ? listing.status : listing.status?.code;
  return String(status || "").toLowerCase() === "active";
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatExpiry(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function activeOrderForTarget(
  orders: SelectedOrder[],
  placementKey: PlacementKey,
  targetId: number,
) {
  const now = Date.now();
  return (
    orders.find((order) => {
      if (order.status !== "paid") return false;
      if (String(order.metadata?.placement_key || "") !== placementKey) return false;
      if (Number(order.metadata?.target_id || 0) !== targetId) return false;
      const expires = new Date(String(order.metadata?.expires_at || "")).getTime();
      return Number.isFinite(expires) && expires > now;
    }) || null
  );
}

function targetsForPlacement(
  placementKey: PlacementKey,
  activities: Activity[],
  listings: Listing[],
): Target[] {
  if (placementKey === "luxury" || placementKey === "freezone") {
    return listings
      .filter((listing) =>
        placementKey === "luxury" ? isLuxury(listing) : isFreezone(listing),
      )
      .map((listing) => ({
        id: Number(listing.id),
        title: listing.title || `آگهی ${listing.id}`,
        subtitle: [
          listing.brand || listing.brand_name,
          listing.model || listing.model_name,
          listing.city,
        ]
          .filter(Boolean)
          .join("، "),
        image: listingImage(listing),
      }));
  }

  if (placementKey === "showroom") {
    return activities
      .filter(
        (activity) =>
          activity.type === "dealer" &&
          activity.status === "active" &&
          Number(activity.external_dealer_id || 0) > 0,
      )
      .map((activity) => ({
        id: Number(activity.external_dealer_id),
        title: activity.name || `نمایشگاه ${activity.external_dealer_id}`,
        subtitle:
          [activity.city, activity.province].filter(Boolean).join("، ") ||
          "نمایشگاه فعال شما",
      }));
  }

  return activities
    .filter(
      (activity) =>
        activity.type === placementKey && activity.status === "active",
    )
    .map((activity) => ({
      id: Number(activity.id),
      title: activity.name,
      subtitle:
        [activity.city, activity.province].filter(Boolean).join("، ") ||
        "فعال در حساب چاکود",
    }));
}

export default function SelectedPlacementClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<SelectedOrder[]>([]);
  const [testCoupon, setTestCoupon] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      const headers = { Accept: "application/json", ...authHeaders() };

      try {
        const [activitiesResponse, listingsResponse, checkoutResponse] =
          await Promise.all([
            fetch("/api/auth/account-activities", {
              cache: "no-store",
              credentials: "include",
              headers,
            }),
            fetch(
              "/api/auth/dashboard-listings?page=1&per_page=100&status=active&owner=all",
              {
                cache: "no-store",
                credentials: "include",
                headers,
              },
            ),
            fetch("/api/selected/checkout", {
              cache: "no-store",
              credentials: "include",
              headers,
            }),
          ]);

        if (
          activitiesResponse.status === 401 ||
          listingsResponse.status === 401 ||
          checkoutResponse.status === 401
        ) {
          window.location.assign(
            `/login?returnTo=${encodeURIComponent("/account/selected")}`,
          );
          return;
        }

        const activityPayload = (await activitiesResponse
          .json()
          .catch(() => null)) as ActivitiesResponse | null;
        const listingPayload = (await listingsResponse
          .json()
          .catch(() => null)) as ListingsResponse | null;
        const checkoutPayload = (await checkoutResponse
          .json()
          .catch(() => null)) as CheckoutStateResponse | null;

        if (ignore) return;

        if (activitiesResponse.ok && activityPayload?.success) {
          setActivities(
            Array.isArray(activityPayload.activities)
              ? activityPayload.activities
              : [],
          );
        }
        if (listingsResponse.ok && listingPayload?.success) {
          setListings(
            (Array.isArray(listingPayload.data) ? listingPayload.data : []).filter(
              activeListing,
            ),
          );
        }
        if (checkoutResponse.ok && checkoutPayload?.success) {
          setOrders(
            Array.isArray(checkoutPayload.orders) ? checkoutPayload.orders : [],
          );
          setTestCoupon(String(checkoutPayload.test_coupon || ""));
        }
      } catch {
        if (!ignore) {
          setError("ارتباط با اطلاعات حساب برقرار نشد. دوباره تلاش کنید.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const eligibleItems = useMemo<EligibleItem[]>(() => {
    return PLACEMENTS.flatMap((placement) =>
      targetsForPlacement(placement.key, activities, listings).map((target) => ({
        key: `${placement.key}:${target.id}`,
        placement,
        target,
        activeOrder: activeOrderForTarget(
          orders,
          placement.key,
          target.id,
        ),
      })),
    );
  }, [activities, listings, orders]);

  useEffect(() => {
    if (!eligibleItems.length) {
      if (selectedKey) setSelectedKey("");
      return;
    }

    if (!eligibleItems.some((item) => item.key === selectedKey)) {
      setSelectedKey(eligibleItems[0].key);
    }
  }, [eligibleItems, selectedKey]);

  const selectedItem =
    eligibleItems.find((item) => item.key === selectedKey) || null;

  async function activate() {
    if (!selectedItem || selectedItem.activeOrder || working) return;
    if (!testCoupon) {
      setError(
        "تخفیف تست ۱۰۰٪ فقط روی Staging/localhost فعال است؛ Production عمداً رایگان نشده است.",
      );
      return;
    }

    setWorking(true);
    setError("");

    try {
      const response = await fetch("/api/selected/checkout", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          placement_key: selectedItem.placement.key,
          target_id: selectedItem.target.id,
          discount_code: testCoupon,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const payload = (await response
        .json()
        .catch(() => null)) as CheckoutResponse | null;

      if (response.status === 401) {
        window.location.assign(
          `/login?returnTo=${encodeURIComponent("/account/selected")}`,
        );
        return;
      }
      if (!response.ok || !payload?.success || !payload.checkout_url) {
        setError(payload?.message || "فعال‌سازی جایگاه منتخب انجام نشد.");
        return;
      }

      window.location.assign(payload.checkout_url);
    } catch {
      setError("ارتباط با مسیر پرداخت برقرار نشد.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/account" className={styles.back}>
            ← حساب من
          </Link>
          <Link href="/" className={styles.brand} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.hero}>
          <span>CHAKOD SELECTED</span>
          <h1>چه چیزهایی می‌تونی منتخب کنی؟</h1>
          <p>
            چاکود فقط فعالیت‌ها و آگهی‌های فعال همین حساب را بررسی می‌کند. هر چیزی که
            پایین می‌بینی، همین حالا واجد شرایط منتخب شدن در صفحه اول است.
          </p>
          <div className={styles.testBadge}>
            <b>{testCoupon ? "تست ۱۰۰٪ فعال" : "پرداخت واقعی"}</b>
            <small>
              {testCoupon
                ? "در محیط آزمایشی مبلغ نهایی منتخب صفر می‌شود."
                : "تعرفه فعال در مرحله پرداخت محاسبه می‌شود."}
            </small>
          </div>
        </section>

        <section className={styles.eligibleSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>برای حساب شما</span>
              <h2>گزینه‌های آماده منتخب شدن</h2>
            </div>
            {!loading ? (
              <strong>
                {new Intl.NumberFormat("fa-IR").format(eligibleItems.length)} گزینه
              </strong>
            ) : null}
          </div>

          {loading ? (
            <div className={styles.stateCard}>در حال بررسی فعالیت‌های فعال حساب…</div>
          ) : eligibleItems.length === 0 ? (
            <div className={styles.stateCard}>
              <strong>فعلاً گزینه فعالی برای منتخب شدن نداری.</strong>
              <p>
                وقتی آگهی لوکس/منطقه آزاد یا یکی از کسب‌وکارهای مرتبط فعال شود، فقط
                همان مورد اینجا نمایش داده می‌شود.
              </p>
              <div className={styles.emptyActions}>
                <Link href="/account/listings">مدیریت آگهی‌ها</Link>
                <Link href="/account/business">مدیریت کسب‌وکارها</Link>
              </div>
            </div>
          ) : (
            <div className={styles.eligibleGrid}>
              {eligibleItems.map((item) => {
                const selected = selectedItem?.key === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.eligibleCard} ${
                      selected ? styles.eligibleCardSelected : ""
                    } ${item.activeOrder ? styles.eligibleCardActive : ""}`}
                    onClick={() => {
                      setSelectedKey(item.key);
                      setError("");
                    }}
                  >
                    <span className={styles.eligibleMedia}>
                      {item.target.image ? (
                        <img src={item.target.image} alt="" />
                      ) : (
                        <b>{item.target.title.slice(0, 1)}</b>
                      )}
                    </span>
                    <span className={styles.eligibleCopy}>
                      <small>{item.placement.title}</small>
                      <strong>{item.target.title}</strong>
                      <span>{item.target.subtitle || "فعال در چاکود"}</span>
                      <em>
                        {item.activeOrder
                          ? "منتخب فعال"
                          : "می‌تونی منتخبش کنی"}
                      </em>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedItem ? (
          <section className={styles.builder}>
            <div className={styles.builderIntro}>
              <div>
                <span>{selectedItem.placement.eyebrow}</span>
                <h2>{selectedItem.placement.title}</h2>
                <p>{selectedItem.placement.description}</p>
              </div>
              <Link href={selectedItem.placement.homeAnchor}>
                مشاهده جایگاه در صفحه اول ←
              </Link>
            </div>

            <div className={styles.selectionPanel}>
              <article className={styles.targetPreview}>
                <div className={styles.previewMedia}>
                  {selectedItem.target.image ? (
                    <img src={selectedItem.target.image} alt="" />
                  ) : (
                    <b>{selectedItem.target.title.slice(0, 1)}</b>
                  )}
                </div>
                <div>
                  <span>{selectedItem.placement.targetLabel}</span>
                  <h3>{selectedItem.target.title}</h3>
                  <p>{selectedItem.target.subtitle || "فعال در حساب چاکود"}</p>
                </div>
              </article>

              {selectedItem.activeOrder ? (
                <aside className={styles.activeNotice}>
                  <div>
                    <span>فعال</span>
                    <strong>این مورد الان منتخب است</strong>
                  </div>
                  <small>
                    تا {formatExpiry(selectedItem.activeOrder.metadata?.expires_at) || "پایان بازه فعال"}
                  </small>
                  <Link href={selectedItem.placement.homeAnchor}>
                    مشاهده در صفحه اول
                  </Link>
                </aside>
              ) : (
                <aside className={styles.checkoutSummary}>
                  <div>
                    <span>جایگاه</span>
                    <strong>{selectedItem.placement.title}</strong>
                  </div>
                  <div>
                    <span>هدف</span>
                    <strong>{selectedItem.target.title}</strong>
                  </div>
                  <div>
                    <span>تخفیف تست</span>
                    <strong>{testCoupon ? "۱۰۰٪" : "غیرفعال"}</strong>
                  </div>
                  <div>
                    <span>مبلغ نهایی تست</span>
                    <strong>{testCoupon ? formatToman(0) : "از تعرفه واقعی"}</strong>
                  </div>
                </aside>
              )}

              {error ? <div className={styles.error}>{error}</div> : null}

              {!selectedItem.activeOrder ? (
                <button
                  className={styles.continueButton}
                  type="button"
                  disabled={working}
                  onClick={() => void activate()}
                >
                  {working
                    ? "در حال ساخت سفارش…"
                    : testCoupon
                      ? "منتخبش کن — تست ۱۰۰٪"
                      : "منتخبش کن و ادامه پرداخت"}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
