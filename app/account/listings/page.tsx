"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import MobileBottomNav from "../../components/MobileBottomNav";
import AccountVehicleCard from "../components/AccountVehicleCard";
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
  production_year?: string | number | null;
  price_toman?: string | number | null;
  mileage_km?: string | number | null;
  color?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  submitted_by_display_name?: string | null;
  submitted_by_role?: string | null;
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

function statusLabel(code?: string, title?: string) {
  const normalized = String(code || "").toLowerCase();
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  if (title && !/[A-Za-z]/.test(title)) return title;
  return "وضعیت نامشخص";
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
  const searchParams = useSearchParams();
  const storyMode = searchParams.get("intent") === "story";
  const requestedDealerId = Math.max(0, Math.round(Number(searchParams.get("dealer_id") || 0)));
  const requestedIdentityKey = requestedDealerId ? `dealer:${requestedDealerId}` : "all";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [status, setStatus] = useState("all");
  const [identityKey, setIdentityKey] = useState(requestedIdentityKey);
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

  useEffect(() => {
    if (!requestedDealerId) return;
    setIdentityKey(`dealer:${requestedDealerId}`);
    setPage(1);
  }, [requestedDealerId]);

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

  const selectedIdentity = useMemo<IdentityFilter>(() => {
    const known = identities.find((item) => item.key === identityKey);
    if (known) return known;
    if (identityKey.startsWith("dealer:")) {
      const dealerId = Math.max(0, Math.round(Number(identityKey.slice("dealer:".length) || 0)));
      if (dealerId) return { key: identityKey, label: `نمایشگاه ${dealerId}`, owner: "dealer", dealerId };
    }
    return identities[0];
  }, [identities, identityKey]);

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
    setIdentityKey(requestedDealerId ? `dealer:${requestedDealerId}` : "all");
    setSearch("");
    setAppliedSearch("");
    setPage(1);
  }

  const scopedDealer = selectedIdentity.owner === "dealer" ? selectedIdentity : null;

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href={storyMode ? "/" : "/account"} className={styles.back}>
            {storyMode ? "بازگشت به صفحه اصلی" : "بازگشت به حساب"}
          </Link>
          <Link href="/" className={styles.logo} aria-label="چاکود"><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
        </header>

        <section className={styles.headerCard}>
          <div>
            <span>{storyMode ? "انتخاب آگهی برای استوری" : "مدیریت آگهی‌ها"}</span>
            <h1>
              {storyMode
                ? scopedDealer
                  ? `استوری برای ${scopedDealer.label}`
                  : "کدام آگهی را استوری می‌کنی؟"
                : scopedDealer
                  ? `آگهی‌های ${scopedDealer.label}`
                  : "آگهی‌های من"}
            </h1>
            <p>
              {storyMode
                ? "همه آگهی‌های ثبت‌شده‌ات را اینجا می‌بینی؛ آگهی فعال را انتخاب کن تا استوری همان آگهی ساخته شود."
                : scopedDealer
                  ? "فقط آگهی‌های همین مجموعه نمایش داده می‌شوند."
                  : "آگهی‌های شخصی و نمایشگاه‌های مجاز در یک لیست."}
            </p>
          </div>
          <Link href={scopedDealer ? `/account/listings/new?dealer_id=${scopedDealer.dealerId}` : "/account/listings/new"} className={styles.addButton}>+ ثبت آگهی</Link>
        </section>

        <section className={styles.summary} aria-label="خلاصه آگهی‌ها">
          <div><strong>{formatNumber(summary.total)}</strong><span>همه</span></div>
          <div><strong>{formatNumber(summary.active)}</strong><span>{storyMode ? "قابل استوری" : "فعال"}</span></div>
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

            {!requestedDealerId ? (
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
            ) : null}
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
          {(status !== "all" || (!requestedDealerId && identityKey !== "all") || appliedSearch) ? <button type="button" onClick={clearFilters}>پاک کردن فیلترها</button> : null}
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
            <span>{storyMode ? "برای ساخت استوری اول یک آگهی ثبت کن." : "فیلتر را تغییر دهید یا یک آگهی جدید ثبت کنید."}</span>
            <Link href={scopedDealer ? `/account/listings/new?dealer_id=${scopedDealer.dealerId}` : "/account/listings/new"}>ثبت آگهی</Link>
          </section>
        ) : (
          <section className={styles.list}>
            {listings.map((listing) => {
              const ownerLabel = listing.listing_owner_type === "dealer"
                ? (listing.seller_display_name || dealers.find((dealer) => dealer.id === Number(listing.dealer_id))?.dealer_name || "نمایشگاه")
                : "حساب شخصی";
              const code = String(listing.status?.code || "").toLowerCase();
              const canStory = code === "active";
              const actions = storyMode
                ? canStory
                  ? [
                      { href: `/account/payments/checkout?type=promotion&service_key=listing_story&listing_id=${listing.id}`, label: "استوری کن", tone: "story" as const },
                      { href: `/account/listings/${listing.id}`, label: "مدیریت", tone: "secondary" as const },
                    ]
                  : [
                      { href: `/account/listings/${listing.id}`, label: "برای استوری فعال نیست", tone: "secondary" as const },
                    ]
                : [
                    { href: `/account/listings/${listing.id}`, label: "مدیریت", tone: "primary" as const },
                    { href: `/cars/${listing.id}`, label: "نمایش", tone: "secondary" as const },
                  ];

              return (
                <AccountVehicleCard
                  key={listing.id}
                  primaryHref={`/account/listings/${listing.id}`}
                  data={{
                    id: listing.id,
                    title: listing.title,
                    brand: listing.brand,
                    model: listing.model,
                    year: listing.production_year || listing.year,
                    priceToman: listing.price_toman,
                    mileageKm: listing.mileage_km,
                    color: listing.color,
                    transmission: listing.transmission,
                    fuelType: listing.fuel_type,
                    city: listing.city || listing.province,
                    neighborhood: listing.neighborhood,
                    coverImageUrl: listing.cover_image?.image_url,
                    statusCode: code,
                    statusLabel: statusLabel(listing.status?.code, listing.status?.title),
                    submittedByDisplayName: listing.submitted_by_display_name,
                    submittedByRole: listing.submitted_by_role,
                    publisherFallback: ownerLabel,
                  }}
                  actions={actions}
                />
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
