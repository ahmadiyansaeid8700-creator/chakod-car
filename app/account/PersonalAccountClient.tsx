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
          setSummary({
            total: Number(listings.summary?.total || 0),
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

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.back}>صفحه اصلی</Link>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>حساب شخصی</span>
            <h1>{loading ? "در حال آماده‌سازی حساب…" : displayName}</h1>
            <p>آگهی‌های شخصی، اطلاعات حساب و پرداخت‌های خودت را از همین‌جا مدیریت کن.</p>
          </div>
          <div className={styles.identity}>
            <span className={styles.avatar}>ش</span>
            <div>
              <strong>حساب شخصی فعال</strong>
              {mobile ? <small>{mobile}</small> : null}
            </div>
          </div>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.stats} aria-label="وضعیت آگهی‌های شخصی">
          <div><span>کل آگهی‌ها</span><strong>{loading ? "…" : formatNumber(summary.total)}</strong></div>
          <div><span>فعال</span><strong>{loading ? "…" : formatNumber(summary.active)}</strong></div>
          <div><span>نیازمند توجه</span><strong>{loading ? "…" : formatNumber(attention)}</strong></div>
        </section>

        <section className={styles.actions} aria-label="مدیریت حساب شخصی">
          <Link href="/account/listings/new" className={styles.primaryAction}>
            <span>＋</span><div><strong>ثبت آگهی شخصی</strong><small>خودروی جدید را با حساب شخصی ثبت کن</small></div>
          </Link>
          <Link href="/account-v2/profile" className={styles.action}>
            <span>✎</span><div><strong>اطلاعات حساب</strong><small>نام و اطلاعات پایه حساب را ویرایش کن</small></div>
          </Link>
          <Link href="/account/payments" className={styles.action}>
            <span>▤</span><div><strong>پرداخت‌ها</strong><small>سوابق و وضعیت پرداخت‌ها را ببین</small></div>
          </Link>
          <Link href="/account/promotions" className={styles.action}>
            <span>✦</span><div><strong>تبلیغات آگهی</strong><small>گزینه‌های ارتقای آگهی شخصی</small></div>
          </Link>
        </section>

        <section className={styles.listingsSection}>
          <div className={styles.sectionHead}>
            <div><span>مدیریت آگهی‌ها</span><h2>آگهی‌های شخصی اخیر</h2></div>
          </div>

          {loading ? (
            <div className={styles.state}>در حال دریافت آگهی‌های شخصی…</div>
          ) : recent.length === 0 ? (
            <div className={styles.empty}>
              <strong>هنوز آگهی شخصی نداری</strong>
              <span>برای شروع یک آگهی با هویت شخصی ثبت کن.</span>
              <Link href="/account/listings/new">ثبت آگهی</Link>
            </div>
          ) : (
            <div className={styles.listings}>
              {recent.map((listing) => (
                <Link key={listing.id} href={`/account/listings/${listing.id}`} className={styles.listingCard}>
                  <div>
                    <strong>{listingTitle(listing)}</strong>
                    <span>{statusLabel(listing.status)}</span>
                  </div>
                  <small>{formatPrice(listing.price_toman)}</small>
                  <b>‹</b>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
