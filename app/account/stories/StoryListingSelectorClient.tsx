"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type DealerItem = {
  id: number;
  dealer_name: string;
  role?: string;
};

type ListingItem = {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  status?: { code?: string; title?: string };
  cover_image?: { image_id: number; image_url: string } | null;
};

type AccountActivity = {
  id: number;
  type: string;
  name: string;
  city?: string;
  province?: string;
  status?: string;
  verification_status?: string;
  external_dealer_id?: number | null;
  can_publish_vehicle?: boolean;
};

type AccountMembership = {
  type: string;
  name: string;
  role?: string;
  external_dealer_id?: number | null;
  can_publish_vehicle?: boolean;
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: AccountActivity[];
  memberships?: AccountMembership[];
};

type ListingsResponse = {
  success?: boolean;
  message?: string;
  dealers?: DealerItem[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  data?: ListingItem[];
};

type Identity = {
  key: string;
  label: string;
  typeLabel: string;
  kind: "all" | "personal" | "dealer" | "business";
  owner: "all" | "personal" | "dealer";
  dealerId: number;
  activityId: number;
  activityType?: string;
  activity?: AccountActivity;
};

const PAGE_SIZE = 8;

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function activityTypeLabel(type?: string) {
  if (type === "dealer") return "نمایشگاه";
  if (type === "parts_store") return "فروشگاه لوازم یدکی";
  if (type === "repair_shop") return "تعمیرگاه";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}

function formatNumber(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? new Intl.NumberFormat("fa-IR").format(number) : "۰";
}

function formatPrice(value: number | string | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";
  if (number >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} میلیارد تومان`;
  }
  if (number >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(number / 1_000_000)} میلیون تومان`;
  }
  return `${formatNumber(number)} تومان`;
}

function cleanDealers(items?: DealerItem[]) {
  if (!Array.isArray(items)) return [];
  const seen = new Set<number>();
  return items.filter((item) => {
    const id = Number(item.id || 0);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function activeListings(items?: ListingItem[]) {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item) => String(item.status?.code || "").toLowerCase() === "active",
  );
}

export default function StoryListingSelectorClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const [identityKey, setIdentityKey] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: PAGE_SIZE,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });

  useEffect(() => {
    let ignore = false;

    async function loadAccountActivities() {
      try {
        const response = await fetch("/api/auth/account-activities", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const payload = (await response.json().catch(() => null)) as ActivitiesResponse | null;
        if (ignore || !response.ok || !payload?.success) return;
        setActivities(Array.isArray(payload.activities) ? payload.activities : []);
        setMemberships(Array.isArray(payload.memberships) ? payload.memberships : []);
      } catch {
        // فهرست آگهی‌های فعال همچنان باید در دسترس بماند.
      }
    }

    void loadAccountActivities();
    return () => { ignore = true; };
  }, []);

  const identities = useMemo<Identity[]>(() => {
    const result: Identity[] = [
      { key: "all", label: "همه", typeLabel: "آگهی‌های فعال", kind: "all", owner: "all", dealerId: 0, activityId: 0 },
      { key: "personal", label: "شخصی", typeLabel: "حساب شخصی", kind: "personal", owner: "personal", dealerId: 0, activityId: 0 },
    ];
    const keys = new Set(result.map((item) => item.key));

    activities.forEach((activity) => {
      const dealerId = Number(activity.external_dealer_id || 0);
      if (activity.type === "dealer" && dealerId > 0) {
        const key = `dealer:${dealerId}`;
        if (!keys.has(key)) {
          result.push({
            key,
            label: activity.name || `نمایشگاه ${dealerId}`,
            typeLabel: "نمایشگاه",
            kind: "dealer",
            owner: "dealer",
            dealerId,
            activityId: activity.id,
            activityType: activity.type,
            activity,
          });
          keys.add(key);
        }
        return;
      }

      if (activity.type !== "dealer") {
        const key = `business:${activity.id}`;
        if (!keys.has(key)) {
          result.push({
            key,
            label: activity.name || activityTypeLabel(activity.type),
            typeLabel: activityTypeLabel(activity.type),
            kind: "business",
            owner: "all",
            dealerId: 0,
            activityId: activity.id,
            activityType: activity.type,
            activity,
          });
          keys.add(key);
        }
      }
    });

    memberships.forEach((membership) => {
      const dealerId = Number(membership.external_dealer_id || 0);
      if (membership.type !== "dealer" || dealerId <= 0) return;
      const key = `dealer:${dealerId}`;
      if (keys.has(key)) return;
      result.push({
        key,
        label: membership.name || `نمایشگاه ${dealerId}`,
        typeLabel: "نمایشگاه",
        kind: "dealer",
        owner: "dealer",
        dealerId,
        activityId: 0,
        activityType: "dealer",
      });
      keys.add(key);
    });

    dealers.forEach((dealer) => {
      const dealerId = Number(dealer.id || 0);
      if (dealerId <= 0) return;
      const key = `dealer:${dealerId}`;
      if (keys.has(key)) return;
      result.push({
        key,
        label: dealer.dealer_name || `نمایشگاه ${dealerId}`,
        typeLabel: "نمایشگاه",
        kind: "dealer",
        owner: "dealer",
        dealerId,
        activityId: 0,
        activityType: "dealer",
      });
      keys.add(key);
    });

    return result;
  }, [activities, dealers, memberships]);

  const selectedIdentity = useMemo<Identity>(() => {
    return identities.find((item) => item.key === identityKey) || identities[0];
  }, [identities, identityKey]);

  async function loadListings(targetPage = page) {
    if (selectedIdentity.kind === "business") {
      setLoading(false);
      setError("");
      setListings([]);
      setPagination({ page: 1, per_page: PAGE_SIZE, total: 0, total_pages: 1, has_next: false, has_prev: false });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: String(PAGE_SIZE),
        status: "active",
        owner: selectedIdentity.owner,
      });
      if (selectedIdentity.dealerId) params.set("dealer_id", String(selectedIdentity.dealerId));
      if (appliedSearch) params.set("q", appliedSearch);

      const response = await fetch(`/api/auth/dashboard-listings?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = (await response.json().catch(() => null)) as ListingsResponse | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "آگهی‌های فعال دریافت نشدند.");
      }

      const visibleListings = activeListings(payload.data);
      setListings(visibleListings);
      setDealers(cleanDealers(payload.dealers));
      setPagination(payload.pagination || {
        page: targetPage,
        per_page: PAGE_SIZE,
        total: visibleListings.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      });
    } catch (caught) {
      setListings([]);
      setError(caught instanceof Error ? caught.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, identityKey, appliedSearch, selectedIdentity.kind]);

  function chooseIdentity(key: string) {
    setIdentityKey(key);
    setSearch("");
    setAppliedSearch("");
    setPage(1);
  }

  function applySearch() {
    setAppliedSearch(search.trim());
    setPage(1);
  }

  const businessActivity = selectedIdentity.kind === "business" ? selectedIdentity.activity : undefined;

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.back}>بازگشت به صفحه اصلی</Link>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.hero}>
          <span>استوری چاکود</span>
          <h1>{selectedIdentity.kind === "business" ? "استوری کسب‌وکار" : "یک آگهی فعال را انتخاب کن"}</h1>
          <p>
            {selectedIdentity.kind === "business"
              ? "برای کسب‌وکارهای خدماتی، استوری از پروفایل همان کسب‌وکار ساخته می‌شود."
              : "فقط آگهی‌های فعال نمایش داده می‌شوند؛ انتخاب کن و مستقیم استوری بساز."}
          </p>
        </section>

        <section className={styles.identityPanel} aria-label="انتخاب هویت انتشار">
          <div className={styles.identityHeader}>
            <strong>استوری برای کدام حساب؟</strong>
            <span>
              {selectedIdentity.kind === "business"
                ? selectedIdentity.typeLabel
                : `${formatNumber(pagination.total)} آگهی فعال`}
            </span>
          </div>
          <div className={styles.identityRow}>
            {identities.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${styles.identityButton} ${identityKey === item.key ? styles.identityActive : ""}`}
                onClick={() => chooseIdentity(item.key)}
              >
                <strong>{item.label}</strong>
                <small>{item.typeLabel}</small>
              </button>
            ))}
          </div>

          {selectedIdentity.kind !== "business" ? (
            <div className={styles.searchRow}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }}
                placeholder="جستجو بین آگهی‌های فعال"
              />
              <button type="button" onClick={applySearch}>جستجو</button>
            </div>
          ) : null}
        </section>

        {selectedIdentity.kind === "business" && businessActivity ? (
          <section className={styles.businessStoryCard} aria-label={`استوری ${businessActivity.name}`}>
            <div className={styles.businessStoryIcon} aria-hidden="true">▣</div>
            <div className={styles.businessStoryCopy}>
              <span>{activityTypeLabel(businessActivity.type)}</span>
              <h2>{businessActivity.name}</h2>
              {(businessActivity.city || businessActivity.province) ? (
                <p>{[businessActivity.city, businessActivity.province].filter(Boolean).join("، ")}</p>
              ) : (
                <p>استوری از اطلاعات واقعی پروفایل این کسب‌وکار ساخته می‌شود.</p>
              )}
              <Link
                href={`/account/selected?intent=story&activity_id=${businessActivity.id}`}
                className={styles.storyButton}
              >
                استوری کسب‌وکار
              </Link>
            </div>
          </section>
        ) : loading ? (
          <section className={styles.state}>
            <span className={styles.loader} />
            <strong>در حال دریافت آگهی‌های فعال…</strong>
          </section>
        ) : error ? (
          <section className={styles.state}>
            <strong>آگهی‌های فعال دریافت نشدند</strong>
            <span>{error}</span>
            <button type="button" onClick={() => void loadListings(page)}>تلاش دوباره</button>
          </section>
        ) : listings.length === 0 ? (
          <section className={styles.state}>
            <strong>آگهی فعال برای این حساب وجود ندارد</strong>
            <span>یک حساب دیگر را انتخاب کن یا آگهی‌ات را فعال کن.</span>
          </section>
        ) : (
          <section className={styles.list} aria-label="انتخاب آگهی فعال برای استوری">
            {listings.map((listing) => {
              const vehicle = [listing.brand, listing.model, listing.year].filter(Boolean).join(" · ");
              const ownerLabel = listing.listing_owner_type === "dealer"
                ? (listing.seller_display_name || dealers.find((dealer) => dealer.id === Number(listing.dealer_id))?.dealer_name || "نمایشگاه")
                : "شخصی";

              return (
                <article className={styles.card} key={listing.id}>
                  <div className={styles.imageWrap}>
                    {listing.cover_image?.image_url ? (
                      <img src={listing.cover_image.image_url} alt={listing.title || "خودرو"} loading="lazy" decoding="async" />
                    ) : (
                      <span className={styles.noImage}>بدون عکس</span>
                    )}
                  </div>

                  <div className={styles.body}>
                    <div className={styles.titleRow}>
                      <strong>{listing.title || "آگهی بدون عنوان"}</strong>
                    </div>
                    <div className={styles.price}>{formatPrice(listing.price_toman)}</div>
                    {vehicle ? <div className={styles.meta}>{vehicle}</div> : null}
                    <span className={styles.owner}>{ownerLabel}</span>

                    <Link
                      href={`/account/payments/checkout?type=promotion&service_key=listing_story&listing_id=${listing.id}`}
                      className={styles.storyButton}
                    >
                      استوری کن
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {selectedIdentity.kind !== "business" && !loading && !error && pagination.total_pages > 1 ? (
          <div className={styles.pagination}>
            <button type="button" disabled={!pagination.has_prev} onClick={() => setPage((value) => Math.max(1, value - 1))}>قبلی</button>
            <span>صفحه {formatNumber(pagination.page)} از {formatNumber(pagination.total_pages)}</span>
            <button type="button" disabled={!pagination.has_next} onClick={() => setPage((value) => value + 1)}>بعدی</button>
          </div>
        ) : null}

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
