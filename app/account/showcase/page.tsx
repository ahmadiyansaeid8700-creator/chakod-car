"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type Activity = {
  id: number;
  type: string;
  name: string;
  city?: string;
  province?: string;
};

type Membership = {
  type: string;
  name: string;
};

type Listing = {
  id: number;
  title?: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  seller_display_name?: string;
  cover_image?: { image_url?: string } | null;
  status?: { code?: string };
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: Activity[];
  memberships?: Membership[];
};

type ListingsResponse = {
  success?: boolean;
  message?: string;
  data?: Listing[];
  pagination?: { total?: number };
};

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatPrice(value: Listing["price_toman"]) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "قیمت توافقی";
  if (amount >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(amount / 1_000_000_000)} میلیارد تومان`;
  }
  if (amount >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(amount / 1_000_000)} میلیون تومان`;
  }
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`;
}

function activityLabel(type: string) {
  if (type === "dealer") return "نمایشگاه";
  if (type === "parts_store") return "لوازم یدکی";
  if (type === "repair_shop") return "تعمیرگاه";
  if (type === "car_service") return "خدمات خودرو";
  return "کسب‌وکار";
}

export default function ShowcasePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const headers = { Accept: "application/json", ...authHeaders() };
        const [activitiesResponse, listingsResponse] = await Promise.all([
          fetch("/api/auth/account-activities", { credentials: "include", cache: "no-store", headers }),
          fetch("/api/auth/dashboard-listings?page=1&per_page=3&status=active&owner=all", { credentials: "include", cache: "no-store", headers }),
        ]);

        const activitiesPayload = (await activitiesResponse.json().catch(() => null)) as ActivitiesResponse | null;
        const listingsPayload = (await listingsResponse.json().catch(() => null)) as ListingsResponse | null;

        if (!activitiesResponse.ok && !listingsResponse.ok) {
          throw new Error("برای دیدن ویترینت وارد حساب چاکود شو.");
        }
        if (ignore) return;

        if (activitiesResponse.ok && activitiesPayload?.success) {
          setActivities(Array.isArray(activitiesPayload.activities) ? activitiesPayload.activities : []);
          setMemberships(Array.isArray(activitiesPayload.memberships) ? activitiesPayload.memberships : []);
        }

        if (listingsResponse.ok && listingsPayload?.success) {
          const active = Array.isArray(listingsPayload.data)
            ? listingsPayload.data.filter((item) => String(item.status?.code || "").toLowerCase() === "active")
            : [];
          setListings(active.slice(0, 3));
          setActiveTotal(Number(listingsPayload.pagination?.total || active.length));
        }
      } catch (caught) {
        if (!ignore) setError(caught instanceof Error ? caught.message : "ویترین دریافت نشد.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => { ignore = true; };
  }, []);

  const businessNames = useMemo(() => {
    const names = new Map<string, string>();
    activities.forEach((item) => {
      if (item.name) names.set(`${item.type}:${item.name}`, `${item.name} · ${activityLabel(item.type)}`);
    });
    memberships.forEach((item) => {
      if (item.name) names.set(`${item.type}:${item.name}`, `${item.name} · ${activityLabel(item.type)}`);
    });
    return Array.from(names.values());
  }, [activities, memberships]);

  const headline = activeTotal >= 6
    ? "ویترینت این روزها پرقدرت دیده می‌شود"
    : activeTotal >= 2
      ? "ویترینت آماده‌ی به رخ کشیدن است"
      : "اعتبارت را در چاکود بساز و رشدش بده";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
          <Link href="/" className={styles.back}>صفحه اصلی</Link>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <span className={styles.eyebrow}>ویترین من در چاکود</span>
          <h1>{headline}</h1>
          <p>رزومه زنده‌ی فعالیت تو؛ از داده‌های واقعی حساب و کسب‌وکارهایت ساخته می‌شود و هر بار با عملکردت تغییر می‌کند.</p>
          <div className={styles.signature}>✦ اعتبار من در چاکود</div>
        </section>

        {loading ? (
          <section className={styles.state}><span className={styles.loader} /><strong>در حال ساخت ویترین تو…</strong></section>
        ) : error ? (
          <section className={styles.state}>
            <strong>{error}</strong>
            <Link href="/login">ورود به حساب</Link>
          </section>
        ) : (
          <>
            <section className={styles.stats} aria-label="خلاصه ویترین">
              <article>
                <strong>{formatNumber(activeTotal)}</strong>
                <span>آگهی فعال</span>
              </article>
              <article>
                <strong>{formatNumber(businessNames.length)}</strong>
                <span>کسب‌وکار متصل</span>
              </article>
              <article>
                <strong>{formatNumber(listings.length)}</strong>
                <span>انتخاب تازه ویترین</span>
              </article>
            </section>

            {businessNames.length > 0 ? (
              <section className={styles.businesses}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span>هویت‌های حرفه‌ای تو</span>
                    <h2>اعتبارت یک‌جا جمع شده</h2>
                  </div>
                </div>
                <div className={styles.businessRow}>
                  {businessNames.map((name) => <span key={name}>{name}</span>)}
                </div>
              </section>
            ) : null}

            <section className={styles.latest}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>ویترین تازه</span>
                  <h2>سه انتخاب آخر برای نمایش</h2>
                </div>
                <Link href="/account/listings">همه آگهی‌ها</Link>
              </div>

              {listings.length > 0 ? (
                <div className={styles.listingGrid}>
                  {listings.map((listing) => {
                    const vehicle = [listing.brand, listing.model, listing.year].filter(Boolean).join(" · ");
                    return (
                      <article className={styles.listingCard} key={listing.id}>
                        <div className={styles.imageWrap}>
                          {listing.cover_image?.image_url ? (
                            <img src={listing.cover_image.image_url} alt={listing.title || "آگهی"} loading="lazy" decoding="async" />
                          ) : <span>بدون عکس</span>}
                        </div>
                        <div className={styles.listingBody}>
                          <strong>{listing.title || "آگهی فعال"}</strong>
                          {vehicle ? <small>{vehicle}</small> : null}
                          <b>{formatPrice(listing.price_toman)}</b>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>با اولین آگهی فعال، ویترین تصویری تو اینجا شکل می‌گیرد.</div>
              )}
            </section>

            <section className={styles.shareTeaser}>
              <span>مرحله بعد</span>
              <h2>این ویترین تبدیل به کارت ۹:۱۶ قابل استوری می‌شود</h2>
              <p>نسخه اشتراک‌گذاری از همین داده‌های واقعی ساخته می‌شود؛ بدون عدد یا نمودار ساختگی.</p>
            </section>
          </>
        )}

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
