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
  province?: string;
  city?: string;
  neighborhood?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  status?: { code?: string; title?: string };
  cover_image?: { image_id: number; image_url: string } | null;
  image_count?: number;
};

type Summary = {
  total: number;
  active: number;
  pending: number;
  draft: number;
  inactive: number;
  rejected: number;
  expired: number;
  sold: number;
  deleted: number;
};

type ListingsResponse = {
  success?: boolean;
  message?: string;
  summary?: Partial<Summary>;
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

type IdentityFilter =
  | { key: "all"; label: string; owner: "all"; dealerId: 0 }
  | { key: "personal"; label: string; owner: "personal"; dealerId: 0 }
  | { key: string; label: string; owner: "dealer"; dealerId: number };

const EMPTY_SUMMARY: Summary = {
  total: 0,
  active: 0,
  pending: 0,
  draft: 0,
  inactive: 0,
  rejected: 0,
  expired: 0,
  sold: 0,
  deleted: 0,
};

const STATUS_FILTERS = [
  { key: "all", label: "همه" },
  { key: "active", label: "فعال" },
  { key: "pending", label: "در انتظار" },
  { key: "rejected", label: "ردشده" },
  { key: "sold", label: "فروخته‌شده" },
  { key: "inactive", label: "غیرفعال" },
] as const;

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

function statusClass(code?: string) {
  if (code === "active") return styles.statusActive;
  if (code === "pending") return styles.statusPending;
  if (code === "rejected") return styles.statusRejected;
  if (code === "sold") return styles.statusSold;
  return styles.statusMuted;
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

export default function AccountListingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [status, setStatus] = useState("all");
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

  const identities = useMemo<IdentityFilter[]>(() => [
    { key: "all", label: "همه هویت‌ها", owner: "all", dealerId: 0 },
    { key: "personal", label: "شخصی", owner: "personal", dealerId: 0 },
    ...dealers.map((dealer) => ({
      key: `dealer:${dealer.id}`,
      label: dealer.dealer_name || `نمایشگاه ${dealer.id}`,
      owner: "dealer" as const,
      dealerId: dealer.id,
    })),
  ], [dealers]);

  const selectedIdentity = identities.find((item) => item.key === identityKey) || identities[0];
  const attentionCount = summary.pending + summary.rejected + summary.inactive + summary.expired;

  async function loadListings(targetPage = page) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: "12",
        status,
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
      setSummary({
        total: Number(payload.summary?.total || 0),
        active: Number(payload.summary?.active || 0),
        pending: Number(payload.summary?.pending || 0),
        draft: Number(payload.summary?.draft || 0),
        inactive: Number(payload.summary?.inactive || 0),
        rejected: Number(payload.summary?.rejected || 0),
        expired: Number(payload.summary?.expired || 0),
        sold: Number(payload.summary?.sold || 0),
        deleted: Number(payload.summary?.deleted || 0),
      });
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
    // selectedIdentity به شکل owner/dealer_id در dependencyهای زیر بازتاب داده شده است.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, identityKey, appliedSearch]);

  function chooseStatus(nextStatus: string) {
    setStatus(nextStatus);
    setPage(1);
  }

  function chooseIdentity(key: string) {
    setIdentityKey(key);
    setPage(1);
  }

  function applySearch() {
    setAppliedSearch(search.trim());
    setPage(1);
  }

  function clearFilters() {
    setStatus("all");
    setIdentityKey("all");
    setSearch("");
    setAppliedSearch("");
    setPage(1);
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/account" className={styles.back}>بازگشت به حساب</Link>
          <Link href="/" className={styles.logo} aria-label="چاکود"><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
        </header>

        <section className={styles.headerCard}>
          <div>
            <span>مدیریت آگهی‌ها</span>
            <h1>آگهی‌های من</h1>
            <p>آگهی‌های شخصی و نمایشگاه‌های مجاز، بدون منوی اضافه و در یک لیست.</p>
          </div>
          <Link href="/account/listings/new" className={styles.addButton}>+ ثبت آگهی</Link>
        </section>

        <section className={styles.summary} aria-label="خلاصه آگهی‌ها">
          <div><strong>{formatNumber(summary.total)}</strong><span>همه</span></div>
          <div><strong>{formatNumber(summary.active)}</strong><span>فعال</span></div>
          <div><strong>{formatNumber(attentionCount)}</strong><span>نیازمند توجه</span></div>
        </section>

        <section className={styles.filters} aria-label="فیلتر آگهی‌ها">
          <div className={styles.filtersTop}>
            <div className={styles.chips}>
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.chip} ${status === item.key ? styles.chipActive : ""}`}
                  onClick={() => chooseStatus(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={styles.identityRow} aria-label="هویت انتشار">
              {identities.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.identityButton} ${identityKey === item.key ? styles.identityActive : ""}`}
                  onClick={() => chooseIdentity(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.searchRow}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }}
              placeholder="جستجو در عنوان، خودرو یا شهر"
            />
            <button type="button" onClick={applySearch}>جستجو</button>
          </div>
        </section>

        <div className={styles.resultLine}>
          <span>{formatNumber(pagination.total)} آگهی پیدا شد</span>
          {(status !== "all" || identityKey !== "all" || appliedSearch) ? <button type="button" onClick={clearFilters}>پاک کردن فیلترها</button> : null}
        </div>

        {loading ? (
          <section className={styles.state}><span className={styles.loader} /><strong>در حال دریافت آگهی‌ها…</strong></section>
        ) : error ? (
          <section className={styles.state}>
            <strong>آگهی‌ها دریافت نشدند</strong>
            <span>{error}</span>
            <button type="button" onClick={() => void loadListings(page)}>تلاش دوباره</button>
          </section>
        ) : listings.length === 0 ? (
          <section className={styles.state}>
            <strong>آگهی‌ای پیدا نشد</strong>
            <span>فیلتر را تغییر دهید یا یک آگهی جدید ثبت کنید.</span>
            <Link href="/account/listings/new">ثبت آگهی</Link>
          </section>
        ) : (
          <section className={styles.list}>
            {listings.map((listing) => {
              const location = [listing.city, listing.neighborhood].filter(Boolean).join("، ") || listing.province || "موقعیت ثبت نشده";
              const vehicle = [listing.brand, listing.model, listing.year].filter(Boolean).join(" · ");
              const ownerLabel = listing.listing_owner_type === "dealer"
                ? (listing.seller_display_name || dealers.find((dealer) => dealer.id === Number(listing.dealer_id))?.dealer_name || "نمایشگاه")
                : "شخصی";

              return (
                <article className={styles.card} key={listing.id}>
                  <div className={styles.imageWrap}>
                    {listing.cover_image?.image_url ? <img src={listing.cover_image.image_url} alt={listing.title || "خودرو"} /> : <span className={styles.noImage}>بدون عکس</span>}
                    <span className={`${styles.status} ${statusClass(listing.status?.code)}`}>{listing.status?.title || "در انتظار"}</span>
                  </div>

                  <div className={styles.body}>
                    <div className={styles.titleRow}>
                      <strong>{listing.title || "آگهی بدون عنوان"}</strong>
                      <small>#{listing.id}</small>
                    </div>
                    <div className={styles.price}>{formatPrice(listing.price_toman)}</div>
                    <div className={styles.meta}>{vehicle || "مشخصات خودرو ثبت نشده"}</div>
                    <div className={styles.meta}>{location}{listing.mileage_km ? ` · ${formatNumber(listing.mileage_km)} کیلومتر` : ""}</div>
                    <span className={styles.owner}>{ownerLabel}</span>
                    <div className={styles.actions}>
                      <Link href={`/account/listings/${listing.id}`} className={styles.manage}>مدیریت</Link>
                      <Link href={`/cars/${listing.id}`} className={styles.view}>نمایش</Link>
                    </div>
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
