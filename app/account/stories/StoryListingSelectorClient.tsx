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
  mileage_km?: string | number | null;
  city?: string;
  neighborhood?: string;
  province?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  status?: { code?: string; title?: string };
  cover_image?: { image_id: number; image_url: string } | null;
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

type Identity =
  | { key: "all"; label: string; typeLabel: string; owner: "all"; dealerId: 0 }
  | { key: "personal"; label: string; typeLabel: string; owner: "personal"; dealerId: 0 }
  | { key: string; label: string; typeLabel: string; owner: "dealer"; dealerId: number };

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

function statusLabel(code?: string, title?: string) {
  const normalized = String(code || "").toLowerCase();
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  if (title && !/[A-Za-z]/.test(title)) return title;
  return "وضعیت نامشخص";
}

export default function StoryListingSelectorClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [identityKey, setIdentityKey] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 12,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });

  const identities = useMemo<Identity[]>(() => [
    { key: "all", label: "همه", typeLabel: "همه آگهی‌ها", owner: "all", dealerId: 0 },
    { key: "personal", label: "شخصی", typeLabel: "حساب شخصی", owner: "personal", dealerId: 0 },
    ...dealers.map((dealer) => ({
      key: `dealer:${dealer.id}`,
      label: dealer.dealer_name || `نمایشگاه ${dealer.id}`,
      typeLabel: "نمایشگاه",
      owner: "dealer" as const,
      dealerId: dealer.id,
    })),
  ], [dealers]);

  const selectedIdentity = useMemo<Identity>(() => {
    return identities.find((item) => item.key === identityKey) || identities[0];
  }, [identities, identityKey]);

  async function loadListings(targetPage = page) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: "12",
        status: "all",
        owner: selectedIdentity.owner,
      });
      if (selectedIdentity.dealerId) params.set("dealer_id", String(selectedIdentity.dealerId));
      if (appliedSearch) params.set("q", appliedSearch);

      const response = await fetch(`/api/auth/dashboard-listings?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as ListingsResponse | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "آگهی‌ها دریافت نشدند.");
      }

      setListings(Array.isArray(payload.data) ? payload.data : []);
      setDealers(cleanDealers(payload.dealers));
      setPagination(payload.pagination || {
        page: targetPage,
        per_page: 12,
        total: 0,
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
  }, [page, identityKey, appliedSearch]);

  function chooseIdentity(key: string) {
    setIdentityKey(key);
    setPage(1);
  }

  function applySearch() {
    setAppliedSearch(search.trim());
    setPage(1);
  }

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
          <h1>کدام آگهی را استوری می‌کنی؟</h1>
          <p>اول هویت انتشار را انتخاب کن، بعد روی «استوری کن» بزن.</p>
        </section>

        <section className={styles.identityPanel} aria-label="انتخاب هویت انتشار">
          <div className={styles.identityHeader}>
            <strong>آگهی‌های کدام حساب؟</strong>
            <span>{formatNumber(pagination.total)} آگهی</span>
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

          <div className={styles.searchRow}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }}
              placeholder="جستجو در آگهی‌ها"
            />
            <button type="button" onClick={applySearch}>جستجو</button>
          </div>
        </section>

        {loading ? (
          <section className={styles.state}>
            <span className={styles.loader} />
            <strong>در حال دریافت آگهی‌ها…</strong>
          </section>
        ) : error ? (
          <section className={styles.state}>
            <strong>آگهی‌ها دریافت نشدند</strong>
            <span>{error}</span>
            <button type="button" onClick={() => void loadListings(page)}>تلاش دوباره</button>
          </section>
        ) : listings.length === 0 ? (
          <section className={styles.state}>
            <strong>برای این حساب آگهی‌ای پیدا نشد</strong>
            <span>یک حساب دیگر را انتخاب کن یا آگهی جدید ثبت کن.</span>
            <Link href="/account/listings/new">ثبت آگهی</Link>
          </section>
        ) : (
          <section className={styles.list} aria-label="انتخاب آگهی برای استوری">
            {listings.map((listing) => {
              const vehicle = [listing.brand, listing.model, listing.year].filter(Boolean).join(" · ");
              const location = [listing.city, listing.neighborhood].filter(Boolean).join("، ") || listing.province || "";
              const canStory = String(listing.status?.code || "").toLowerCase() === "active";
              const ownerLabel = listing.listing_owner_type === "dealer"
                ? (listing.seller_display_name || dealers.find((dealer) => dealer.id === Number(listing.dealer_id))?.dealer_name || "نمایشگاه")
                : "شخصی";

              return (
                <article className={styles.card} key={listing.id}>
                  <div className={styles.imageWrap}>
                    {listing.cover_image?.image_url ? (
                      <img src={listing.cover_image.image_url} alt={listing.title || "خودرو"} />
                    ) : (
                      <span className={styles.noImage}>بدون عکس</span>
                    )}
                    <span className={`${styles.status} ${canStory ? styles.statusActive : styles.statusMuted}`}>
                      {statusLabel(listing.status?.code, listing.status?.title)}
                    </span>
                  </div>

                  <div className={styles.body}>
                    <div className={styles.titleRow}>
                      <strong>{listing.title || "آگهی بدون عنوان"}</strong>
                      <small>#{listing.id}</small>
                    </div>
                    <div className={styles.price}>{formatPrice(listing.price_toman)}</div>
                    {vehicle ? <div className={styles.meta}>{vehicle}</div> : null}
                    {(location || listing.mileage_km) ? (
                      <div className={styles.meta}>
                        {[location, listing.mileage_km ? `${formatNumber(listing.mileage_km)} کیلومتر` : ""].filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                    <span className={styles.owner}>{ownerLabel}</span>

                    {canStory ? (
                      <Link
                        href={`/account/payments/checkout?type=promotion&service_key=listing_story&listing_id=${listing.id}`}
                        className={styles.storyButton}
                      >
                        استوری کن
                      </Link>
                    ) : (
                      <div className={styles.storyDisabled}>
                        استوری بعد از فعال‌شدن آگهی در دسترس است
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!loading && !error && pagination.total_pages > 1 ? (
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
