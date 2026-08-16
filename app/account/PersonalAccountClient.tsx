"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../components/MobileBottomNav";
import styles from "./personal-account.module.css";

type User = {
  display_name?: string | null;
  full_name?: string | null;
  mobile?: string | null;
  mobile_masked?: string | null;
  account_type?: string | null;
};

type Listing = {
  id: number;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  price_toman?: number | string | null;
  status?: string | { code?: string; title?: string } | null;
  cover_image?: { image_id?: number; image_url?: string | null } | null;
};

type Summary = {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  inactive: number;
  sold: number;
};

type MeResponse = {
  success?: boolean;
  logged_in?: boolean;
  user?: User | null;
};

type ListingsResponse = {
  success?: boolean;
  summary?: Partial<Summary>;
  pagination?: {
    total?: number;
  };
  data?: Listing[];
};

const EMPTY_SUMMARY: Summary = {
  total: 0,
  active: 0,
  pending: 0,
  rejected: 0,
  inactive: 0,
  sold: 0,
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

function statusCode(status: Listing["status"]) {
  return typeof status === "string"
    ? status.trim().toLowerCase()
    : String(status?.code || "").trim().toLowerCase();
}

function statusLabel(status: Listing["status"]) {
  const code = statusCode(status);
  if (code === "active") return "فعال";
  if (code === "pending") return "در انتظار بررسی";
  if (code === "rejected") return "نیازمند اصلاح";
  if (code === "inactive") return "غیرفعال";
  if (code === "sold") return "فروخته‌شده";
  if (code === "expired") return "منقضی‌شده";
  if (typeof status === "object" && status?.title) return status.title;
  return "وضعیت نامشخص";
}

function listingTitle(listing: Listing) {
  return String(
    listing.title ||
      [listing.brand, listing.model].filter(Boolean).join(" ") ||
      `آگهی ${listing.id}`,
  );
}

function listingImage(listing: Listing) {
  const url = String(listing.cover_image?.image_url || "").trim();
  return url || "";
}

export default function PersonalAccountClient() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [recent, setRecent] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [meResponse, listingsResponse] = await Promise.all([
          fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
          fetch("/api/auth/dashboard-listings?page=1&per_page=6&status=all&owner=personal", {
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
        ]);

        if (meResponse.status === 401) {
          window.location.assign(`/login?returnTo=${encodeURIComponent("/account")}`);
          return;
        }

        const me = (await meResponse.json().catch(() => null)) as MeResponse | null;
        const listings = (await listingsResponse.json().catch(() => null)) as ListingsResponse | null;

        if (!meResponse.ok || !me?.success || !me.user) {
          throw new Error("اطلاعات حساب دریافت نشد.");
        }

        if (cancelled) return;
        setUser(me.user);

        if (listingsResponse.ok && listings?.success) {
          const personalTotal = Number(listings.pagination?.total ?? listings.summary?.total ?? 0);
          setSummary({
            total: Number.isFinite(personalTotal) ? personalTotal : 0,
            active: Number(listings.summary?.active || 0),
            pending: Number(listings.summary?.pending || 0),
            rejected: Number(listings.summary?.rejected || 0),
            inactive: Number(listings.summary?.inactive || 0),
            sold: Number(listings.summary?.sold || 0),
          });
          setRecent(Array.isArray(listings.data) ? listings.data.slice(0, 6) : []);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "ارتباط با سرور برقرار نشد.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(
    () => user?.display_name?.trim() || user?.full_name?.trim() || "حساب شخصی",
    [user],
  );
  const mobile = user?.mobile_masked || user?.mobile || "";
  const attention = summary.pending + summary.rejected + summary.inactive;
  const avatarLetter = displayName.trim().charAt(0) || "ش";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.back}>صفحه اصلی</Link>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.hero} aria-label="حساب شخصی فعال">
          <div className={styles.profileCopy}>
            <span className={styles.eyebrow}>حساب شخصی</span>
            <h1>{loading ? "در حال آماده‌سازی…" : displayName}</h1>
            {mobile ? <small>{mobile}</small> : null}
          </div>
          <span className={styles.avatar} aria-hidden="true">{avatarLetter}</span>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.stats} aria-label="وضعیت آگهی‌های شخصی">
          <div><strong>{loading ? "…" : formatNumber(summary.total)}</strong><span>کل آگهی‌ها</span></div>
          <div><strong>{loading ? "…" : formatNumber(summary.active)}</strong><span>فعال</span></div>
          <div><strong>{loading ? "…" : formatNumber(attention)}</strong><span>نیازمند توجه</span></div>
        </section>

        <section className={styles.actions} aria-label="تنظیمات حساب شخصی">
          <Link href="/account-v2/profile" className={styles.action}>
            <span className={styles.actionIcon}>✎</span>
            <div><strong>ویرایش اطلاعات</strong><small>نام و اطلاعات پایه حساب</small></div>
            <b aria-hidden="true">‹</b>
          </Link>
          <Link href="/account/payments" className={styles.action}>
            <span className={styles.actionIcon}>▤</span>
            <div><strong>پرداخت‌ها</strong><small>سوابق و وضعیت پرداخت‌ها</small></div>
            <b aria-hidden="true">‹</b>
          </Link>
        </section>

        <section className={styles.listingsSection}>
          <div className={styles.sectionHead}>
            <div>
              <h2>آگهی‌های من</h2>
              <span>آخرین آگهی‌های ثبت‌شده با حساب شخصی</span>
            </div>
          </div>

          {loading ? (
            <div className={styles.state}>در حال دریافت آگهی‌های شخصی…</div>
          ) : recent.length === 0 ? (
            <div className={styles.empty}>
              <strong>هنوز آگهی شخصی نداری</strong>
              <span>برای شروع از دکمه «ثبت آگهی» در منوی پایین استفاده کن.</span>
            </div>
          ) : (
            <div className={styles.listings}>
              {recent.map((listing) => {
                const image = listingImage(listing);
                const code = statusCode(listing.status);
                return (
                  <Link key={listing.id} href={`/account/listings/${listing.id}`} className={styles.listingCard}>
                    <div className={styles.listingMedia}>
                      {image ? (
                        <img src={image} alt={listingTitle(listing)} loading="lazy" />
                      ) : (
                        <span className={styles.imagePlaceholder} aria-hidden="true">خودرو</span>
                      )}
                      <span className={styles.statusBadge} data-status={code}>{statusLabel(listing.status)}</span>
                    </div>
                    <div className={styles.listingBody}>
                      <strong>{listingTitle(listing)}</strong>
                      <small>{formatPrice(listing.price_toman)}</small>
                      <span>مدیریت آگهی <b aria-hidden="true">‹</b></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
