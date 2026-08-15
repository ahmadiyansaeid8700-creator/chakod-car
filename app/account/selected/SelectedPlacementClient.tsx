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

type Membership = {
  type: string;
  name: string;
  role?: string;
  external_dealer_id?: number | null;
};

type ActivitiesResponse = {
  success?: boolean;
  message?: string;
  activities?: Activity[];
  memberships?: Membership[];
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

const PLACEMENTS: Array<{
  key: PlacementKey;
  title: string;
  eyebrow: string;
  description: string;
  targetLabel: string;
  homeAnchor: string;
}> = [
  {
    key: "showroom",
    title: "نمایشگاه منتخب",
    eyebrow: "SHOWROOM",
    description: "نمایشگاه شما در سکشن نمایشگاه‌های منتخب صفحه اول در اولویت نمایش قرار می‌گیرد.",
    targetLabel: "نمایشگاه",
    homeAnchor: "/#showrooms",
  },
  {
    key: "luxury",
    title: "خودرو لوکس",
    eyebrow: "LUXURY",
    description: "یک آگهی واجد شرایط در ابتدای ویترین خودروهای لوکس صفحه اول قرار می‌گیرد.",
    targetLabel: "آگهی لوکس",
    homeAnchor: "/#luxury",
  },
  {
    key: "freezone",
    title: "خودرو منطقه آزاد",
    eyebrow: "FREE ZONE",
    description: "یک آگهی واجد شرایط در ابتدای ویترین خودروهای منطقه آزاد صفحه اول قرار می‌گیرد.",
    targetLabel: "آگهی منطقه آزاد",
    homeAnchor: "/#freezone",
  },
  {
    key: "parts_store",
    title: "منتخب لوازم یدکی",
    eyebrow: "PARTS",
    description: "فروشگاه لوازم یدکی شما در سکشن مربوط صفحه اول بالاتر از نمایش عادی قرار می‌گیرد.",
    targetLabel: "فروشگاه لوازم یدکی",
    homeAnchor: "/#featured-parts_store",
  },
  {
    key: "repair_shop",
    title: "تعمیرگاه منتخب",
    eyebrow: "REPAIR",
    description: "تعمیرگاه شما در سکشن تعمیر و نگهداری صفحه اول در اولویت نمایش قرار می‌گیرد.",
    targetLabel: "تعمیرگاه",
    homeAnchor: "/#featured-repair_shop",
  },
  {
    key: "car_service",
    title: "خدمات منتخب",
    eyebrow: "SERVICES",
    description: "مرکز خدمات خودرویی شما در سکشن خدمات صفحه اول در اولویت نمایش قرار می‌گیرد.",
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
    ["freezone", "منطقهآزاد", "کیش", "قشم", "اروند", "انزلی", "ارس", "ماکو", "چابهار"].some(
      (term) => text.includes(normalizeText(term)),
    )
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
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function activeOrderForPlacement(orders: SelectedOrder[], key: PlacementKey) {
  const now = Date.now();
  return orders.find((order) => {
    if (order.status !== "paid") return false;
    if (String(order.metadata?.placement_key || "") !== key) return false;
    const expires = new Date(String(order.metadata?.expires_at || "")).getTime();
    return Number.isFinite(expires) && expires > now;
  });
}

export default function SelectedPlacementClient() {
  const [placementKey, setPlacementKey] = useState<PlacementKey>("showroom");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<SelectedOrder[]>([]);
  const [testCoupon, setTestCoupon] = useState("");
  const [targetId, setTargetId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const placement = useMemo(
    () => PLACEMENTS.find((item) => item.key === placementKey) || PLACEMENTS[0],
    [placementKey],
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      const headers = { Accept: "application/json", ...authHeaders() };

      try {
        const [activitiesResponse, listingsResponse, checkoutResponse] = await Promise.all([
          fetch("/api/auth/account-activities", {
            cache: "no-store",
            credentials: "include",
            headers,
          }),
          fetch("/api/auth/dashboard-listings?page=1&per_page=100&status=active&owner=all", {
            cache: "no-store",
            credentials: "include",
            headers,
          }),
          fetch("/api/selected/checkout", {
            cache: "no-store",
            credentials: "include",
            headers,
          }),
        ]);

        if (activitiesResponse.status === 401 || listingsResponse.status === 401 || checkoutResponse.status === 401) {
          window.location.assign(`/login?returnTo=${encodeURIComponent("/account/selected")}`);
          return;
        }

        const activityPayload = (await activitiesResponse.json().catch(() => null)) as ActivitiesResponse | null;
        const listingPayload = (await listingsResponse.json().catch(() => null)) as ListingsResponse | null;
        const checkoutPayload = (await checkoutResponse.json().catch(() => null)) as CheckoutStateResponse | null;

        if (ignore) return;
        if (activitiesResponse.ok && activityPayload?.success) {
          setActivities(Array.isArray(activityPayload.activities) ? activityPayload.activities : []);
          setMemberships(Array.isArray(activityPayload.memberships) ? activityPayload.memberships : []);
        }
        if (listingsResponse.ok && listingPayload?.success) {
          setListings((Array.isArray(listingPayload.data) ? listingPayload.data : []).filter(activeListing));
        }
        if (checkoutResponse.ok && checkoutPayload?.success) {
          setOrders(Array.isArray(checkoutPayload.orders) ? checkoutPayload.orders : []);
          setTestCoupon(String(checkoutPayload.test_coupon || ""));
        }
      } catch {
        if (!ignore) setError("ارتباط با اطلاعات حساب برقرار نشد. دوباره تلاش کنید.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const targets = useMemo<Target[]>(() => {
    if (placementKey === "luxury" || placementKey === "freezone") {
      const filtered = listings.filter((listing) =>
        placementKey === "luxury" ? isLuxury(listing) : isFreezone(listing),
      );
      return filtered.map((listing) => ({
        id: Number(listing.id),
        title: listing.title || `آگهی ${listing.id}`,
        subtitle: [listing.brand || listing.brand_name, listing.model || listing.model_name, listing.city]
          .filter(Boolean)
          .join("، "),
        image: listingImage(listing),
      }));
    }

    if (placementKey === "showroom") {
      const result = new Map<number, Target>();
      activities
        .filter((activity) => activity.type === "dealer" && Number(activity.external_dealer_id || 0) > 0 && activity.status !== "disabled")
        .forEach((activity) => {
          const id = Number(activity.external_dealer_id);
          result.set(id, {
            id,
            title: activity.name || `نمایشگاه ${id}`,
            subtitle: [activity.city, activity.province].filter(Boolean).join("، ") || "نمایشگاه قابل مدیریت",
          });
        });
      memberships
        .filter((membership) => membership.type === "dealer" && Number(membership.external_dealer_id || 0) > 0)
        .forEach((membership) => {
          const id = Number(membership.external_dealer_id);
          if (!result.has(id)) {
            result.set(id, {
              id,
              title: membership.name || `نمایشگاه ${id}`,
              subtitle: membership.role ? `نقش: ${membership.role}` : "نمایشگاه قابل مدیریت",
            });
          }
        });
      return Array.from(result.values());
    }

    return activities
      .filter((activity) => activity.type === placementKey && activity.status !== "disabled")
      .map((activity) => ({
        id: Number(activity.id),
        title: activity.name,
        subtitle: [activity.city, activity.province].filter(Boolean).join("، ") || "کسب‌وکار ثبت‌شده در چاکود",
      }));
  }, [activities, listings, memberships, placementKey]);

  useEffect(() => {
    if (!targets.some((target) => target.id === targetId)) {
      setTargetId(targets[0]?.id || 0);
    }
  }, [targets, targetId]);

  const selectedTarget = targets.find((target) => target.id === targetId) || null;
  const activeOrder = activeOrderForPlacement(orders, placementKey);

  function changePlacement(key: PlacementKey) {
    setPlacementKey(key);
    setTargetId(0);
    setError("");
  }

  async function activate() {
    if (!selectedTarget || working) return;
    if (!testCoupon) {
      setError("تخفیف تست ۱۰۰٪ فقط روی Staging/localhost فعال است؛ Production عمداً رایگان نشده است.");
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
          placement_key: placementKey,
          target_id: selectedTarget.id,
          discount_code: testCoupon,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;

      if (response.status === 401) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/account/selected")}`);
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
          <Link href="/account" className={styles.back}>← حساب من</Link>
          <Link href="/" className={styles.brand} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.hero}>
          <span>CHAKOD SELECTED</span>
          <h1>منتخب‌های صفحه اول</h1>
          <p>
            دقیقاً یکی از شش سکشن موجود صفحه اول را انتخاب کنید، هدف را مشخص کنید و مسیر پرداخت را ادامه دهید.
            در Staging فعلاً تخفیف تست ۱۰۰٪ به‌صورت کنترل‌شده فعال است.
          </p>
          <div className={styles.testBadge}>
            <b>{testCoupon ? "تست ۱۰۰٪ فعال" : "Production امن"}</b>
            <small>{testCoupon ? `کد تست ${testCoupon} فقط در محیط آزمایشی` : "هیچ تخفیف ۱۰۰٪ روی Production اعمال نمی‌شود"}</small>
          </div>
        </section>

        <section className={styles.placementGrid} aria-label="انتخاب جایگاه صفحه اول">
          {PLACEMENTS.map((item) => {
            const active = activeOrderForPlacement(orders, item.key);
            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.placementCard} ${placementKey === item.key ? styles.placementCardActive : ""}`}
                onClick={() => changePlacement(item.key)}
              >
                <span>{item.eyebrow}</span>
                <strong>{item.title}</strong>
                <small>{active ? "در حال نمایش" : "انتخاب جایگاه"}</small>
              </button>
            );
          })}
        </section>

        <section className={styles.builder}>
          <div className={styles.builderIntro}>
            <div>
              <span>{placement.eyebrow}</span>
              <h2>{placement.title}</h2>
              <p>{placement.description}</p>
            </div>
            <Link href={placement.homeAnchor}>مشاهده سکشن در صفحه اول ←</Link>
          </div>

          {activeOrder ? (
            <div className={styles.activeNotice}>
              <div>
                <span>فعال</span>
                <strong>{String(activeOrder.metadata?.target_name || placement.title)}</strong>
              </div>
              <small>
                تا {formatExpiry(activeOrder.metadata?.expires_at) || "پایان بازه فعال"}
              </small>
            </div>
          ) : null}

          {loading ? (
            <div className={styles.stateCard}>در حال دریافت گزینه‌های قابل انتخاب…</div>
          ) : targets.length === 0 ? (
            <div className={styles.stateCard}>
              <strong>گزینه واجد شرایطی پیدا نشد.</strong>
              <p>
                {placementKey === "luxury" || placementKey === "freezone"
                  ? "ابتدا یک آگهی فعال متناسب با همین سکشن داشته باشید."
                  : "ابتدا کسب‌وکار مربوط به این سکشن را داخل حساب ثبت و فعال کنید."}
              </p>
              <Link href={placementKey === "luxury" || placementKey === "freezone" ? "/account/listings" : "/account/business"}>
                رفتن به مدیریت {placementKey === "luxury" || placementKey === "freezone" ? "آگهی‌ها" : "کسب‌وکارها"}
              </Link>
            </div>
          ) : (
            <div className={styles.targetArea}>
              <label className={styles.targetSelect}>
                <span>{placement.targetLabel} را انتخاب کنید</span>
                <select value={targetId} onChange={(event) => setTargetId(Number(event.target.value))}>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>{target.title}</option>
                  ))}
                </select>
              </label>

              {selectedTarget ? (
                <article className={styles.targetPreview}>
                  <div className={styles.previewMedia}>
                    {selectedTarget.image ? <img src={selectedTarget.image} alt="" /> : <b>{selectedTarget.title.slice(0, 1)}</b>}
                  </div>
                  <div>
                    <span>{placement.targetLabel}</span>
                    <h3>{selectedTarget.title}</h3>
                    <p>{selectedTarget.subtitle || "گزینه انتخاب‌شده"}</p>
                  </div>
                </article>
              ) : null}

              <aside className={styles.checkoutSummary}>
                <div><span>جایگاه</span><strong>{placement.title}</strong></div>
                <div><span>هدف</span><strong>{selectedTarget?.title || "—"}</strong></div>
                <div><span>تخفیف تست</span><strong>{testCoupon ? "۱۰۰٪" : "غیرفعال"}</strong></div>
                <div><span>مبلغ نهایی تست</span><strong>{testCoupon ? formatToman(0) : "از تعرفه واقعی"}</strong></div>
              </aside>

              {error ? <div className={styles.error}>{error}</div> : null}

              <button
                className={styles.continueButton}
                type="button"
                disabled={working || !selectedTarget}
                onClick={() => void activate()}
              >
                {working ? "در حال ساخت سفارش…" : testCoupon ? "ادامه به پرداخت با تخفیف ۱۰۰٪" : "ادامه به پرداخت"}
              </button>
              <p className={styles.securityCopy}>
                تخفیف تست در سمت سرور و فقط برای staging.chakod.com / localhost اعتبارسنجی می‌شود؛ تغییر URL یا مرورگر Production را رایگان نمی‌کند.
              </p>
            </div>
          )}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
