"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AccountVehicleCard from "../components/AccountVehicleCard";
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
  mileage_km?: string | number | null;
  price_toman?: string | number | null;
  city?: string | null;
  province?: string | null;
  neighborhood?: string | null;
  transmission?: string | null;
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

type ActiveStory = {
  story_id: number;
  public_story_id: number;
  listing_id: number;
  title: string;
  listing_owner_type: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  starts_at?: string;
  expires_at: string;
  share_path: string;
};

type ActiveStoriesResponse = {
  success?: boolean;
  count?: number;
  data?: ActiveStory[];
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

function remainingLabel(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "در حال پایان";
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  if (minutes < 60) return `${formatNumber(minutes)} دقیقه دیگر`;
  return `${formatNumber(Math.ceil(minutes / 60))} ساعت دیگر`;
}

function storyMatchesIdentity(story: ActiveStory, identity: Identity) {
  if (identity.kind === "all") return true;
  if (identity.kind === "personal") return story.listing_owner_type !== "dealer";
  if (identity.kind === "dealer") {
    return story.listing_owner_type === "dealer" && Number(story.dealer_id || 0) === identity.dealerId;
  }
  return false;
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
  const [activeStories, setActiveStories] = useState<ActiveStory[]>([]);
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

  useEffect(() => {
    let ignore = false;

    async function loadActiveStories() {
      try {
        const response = await fetch("/api/stories/active", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const payload = (await response.json().catch(() => null)) as ActiveStoriesResponse | null;
        if (ignore || !response.ok || !payload?.success) return;
        setActiveStories(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        if (!ignore) setActiveStories([]);
      }
    }

    void loadActiveStories();
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

  const activeForIdentity = useMemo(
    () => activeStories.filter((story) => storyMatchesIdentity(story, selectedIdentity)),
    [activeStories, selectedIdentity],
  );

  const activeStoryByListing = useMemo(() => {
    const map = new Map<number, ActiveStory>();
    activeForIdentity.forEach((story) => map.set(Number(story.listing_id), story));
    return map;
  }, [activeForIdentity]);

  const orderedListings = useMemo(() => {
    return [...listings].sort((a, b) => {
      const aActive = activeStoryByListing.has(Number(a.id)) ? 1 : 0;
      const bActive = activeStoryByListing.has(Number(b.id)) ? 1 : 0;
      return bActive - aActive;
    });
  }, [listings, activeStoryByListing]);

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
          <Link href="/" className={styles.back}>بازگشت</Link>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.hero}>
          <span>دبل استوری</span>
          <h1>{selectedIdentity.kind === "business" ? "دبل استوری کسب‌وکار" : "یک آگهی برای دبل استوری انتخاب کن"}</h1>
          <p>
            {selectedIdentity.kind === "business"
              ? "کسب‌وکارت داخل چاکود دیده می‌شود و بعد لینک عمومی همان محتوا را برای انتشار در شبکه‌های اجتماعی می‌گیری."
              : "آگهی داخل چاکود استوری می‌شود؛ بعد لینک عمومی همان استوری را در اینستاگرام، واتساپ، تلگرام یا هر جای دیگری منتشر می‌کنی."}
          </p>
        </section>

        <section className={styles.identityPanel} aria-label="انتخاب هویت انتشار">
          <div className={styles.categoryBanner}>
            <span className={styles.categoryIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 2.5h7m-3.5-3.5V20" /></svg>
            </span>
            <div>
              <span>دسته‌بندی انتشار</span>
              <strong>استوری را با هویت درست منتشر کن</strong>
              <small>حساب شخصی، نمایشگاه یا کسب‌وکارت را انتخاب کن.</small>
            </div>
            <b>{selectedIdentity.typeLabel}</b>
          </div>
          <div className={styles.identityHeader}>
            <strong>برای کدام حساب منتشر شود؟</strong>
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

        {selectedIdentity.kind !== "business" && activeForIdentity.length > 0 ? (
          <section
            aria-label="استوری‌های فعال این حساب"
            style={{
              width: "100%",
              marginTop: 10,
              padding: 13,
              border: "1px solid #b9ead8",
              borderRadius: 20,
              background: "linear-gradient(145deg,#f6fffb,#edfbf5)",
              boxShadow: "0 10px 28px rgba(8,119,90,.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", color: "#075d47", fontSize: 11.5, fontWeight: 950 }}>استوری‌های فعال من</strong>
                <small style={{ display: "block", marginTop: 2, color: "#538071", fontSize: 8.5 }}>این آگهی‌ها همین الان داخل چاکود استوری هستند.</small>
              </div>
              <span style={{ flex: "0 0 auto", padding: "5px 8px", borderRadius: 999, color: "#08775a", background: "#dff8ee", fontSize: 8.5, fontWeight: 950 }}>
                {formatNumber(activeForIdentity.length)} فعال
              </span>
            </div>

            <div style={{ display: "grid", gap: 7 }}>
              {activeForIdentity.map((story) => (
                <div
                  key={story.story_id}
                  style={{
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 9,
                    flexWrap: "wrap",
                    padding: "9px 10px",
                    border: "1px solid rgba(8,119,90,.12)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.88)",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 170px" }}>
                    <strong style={{ display: "block", overflow: "hidden", color: "#1f332d", fontSize: 10.5, fontWeight: 950, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {story.title}
                    </strong>
                    <small style={{ display: "block", marginTop: 3, color: "#5f8277", fontSize: 8 }}>
                      {remainingLabel(story.expires_at)} · آگهی #{formatNumber(story.listing_id)}
                    </small>
                  </div>
                  <Link
                    href={story.share_path}
                    style={{
                      flex: "0 0 auto",
                      minHeight: 34,
                      padding: "0 11px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      color: "#fff",
                      background: "#08775a",
                      textDecoration: "none",
                      fontSize: 8.5,
                      fontWeight: 950,
                    }}
                  >
                    باز کردن و اشتراک
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {selectedIdentity.kind === "business" && businessActivity ? (
          <section className={styles.businessStoryGrid} aria-label={`دبل استوری ${businessActivity.name}`}>
            <article className={`${styles.businessStoryCard} ${styles[`businessStoryCard_${businessActivity.type}`] || ""}`}>
              <div className={styles.businessStoryMedia}>
                <span className={styles.businessStoryType}>{activityTypeLabel(businessActivity.type)}</span>
                <div className={styles.businessStoryMark} aria-hidden="true">
                  {businessActivity.name.trim().slice(0, 1)}
                </div>
              </div>
              <div className={styles.businessStoryCopy}>
                <span>{activityTypeLabel(businessActivity.type)}</span>
                <h2>{businessActivity.name}</h2>
                <p className={styles.businessStoryLocation}>
                  <span aria-hidden="true">⌖</span>
                  {[businessActivity.city, businessActivity.province].filter(Boolean).join("، ") || "موقعیت در پروفایل ثبت نشده"}
                </p>
              <Link
                href={`/account/selected?intent=story&activity_id=${businessActivity.id}`}
                className={styles.storyButton}
              >
                ساخت دبل استوری کسب‌وکار
              </Link>
              </div>
            </article>
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
          <section className={styles.list} aria-label="انتخاب آگهی فعال برای دبل استوری">
            {orderedListings.map((listing) => {
              const ownerLabel = listing.listing_owner_type === "dealer"
                ? (listing.seller_display_name || dealers.find((dealer) => dealer.id === Number(listing.dealer_id))?.dealer_name || "نمایشگاه")
                : "شخصی";
              const activeStory = activeStoryByListing.get(Number(listing.id));

              return (
                <AccountVehicleCard
                  key={listing.id}
                  primaryHref={`/cars/${listing.id}`}
                  selected={Boolean(activeStory)}
                  data={{
                    id: Number(listing.id),
                    title: listing.title,
                    brand: listing.brand,
                    model: listing.model,
                    year: listing.year,
                    mileageKm: listing.mileage_km,
                    priceToman: listing.price_toman,
                    city: listing.city || listing.province,
                    neighborhood: listing.neighborhood,
                    transmission: listing.transmission,
                    coverImageUrl: listing.cover_image?.image_url,
                    statusCode: "active",
                    statusLabel: activeStory ? `استوری فعال · ${remainingLabel(activeStory.expires_at)}` : "آگهی فعال",
                    submittedByDisplayName: ownerLabel,
                    submittedByRole: listing.listing_owner_type === "dealer" ? "sales" : "owner",
                  }}
                  actions={[activeStory ? {
                    href: activeStory.share_path,
                    label: "مدیریت و اشتراک‌گذاری استوری",
                    tone: "story",
                  } : {
                    href: `/account/payments/checkout?type=promotion&service_key=listing_story&listing_id=${listing.id}`,
                    label: "ادامه و ساخت دبل استوری",
                    tone: "story",
                  }]}
                />
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
