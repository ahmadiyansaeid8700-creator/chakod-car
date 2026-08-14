"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./StoryCheckoutClient.module.css";

type StoryListing = {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string;
  price_toman?: number;
  seller_display_name?: string;
  cover_image_url?: string;
};

type Pricing = {
  coupon_code?: string;
  coupon_valid?: boolean;
  coupon_message?: string;
  original_amount_toman: number;
  discount_amount_toman: number;
  final_amount_toman: number;
};

type CheckoutResponse = {
  success?: boolean;
  message?: string;
  listing?: StoryListing;
  pricing?: Pricing;
  duration_hours?: number;
  test_coupon_available?: boolean;
  expires_at?: string;
};

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function money(value: number | undefined) {
  const number = Number(value || 0);
  return number <= 0 ? "رایگان" : `${number.toLocaleString("fa-IR")} تومان`;
}

async function readJson(response: Response): Promise<CheckoutResponse> {
  return (await response.json().catch(() => ({}))) as CheckoutResponse;
}

export default function StoryCheckoutClient({ listingId }: { listingId: number }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listing, setListing] = useState<StoryListing | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [testCouponAvailable, setTestCouponAvailable] = useState(false);

  const vehicle = useMemo(
    () => [listing?.brand, listing?.model, listing?.year].filter(Boolean).join(" · "),
    [listing],
  );

  async function loadQuote(code = "") {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams({ listing_id: String(listingId) });
      if (code.trim()) params.set("discount_code", code.trim());
      const response = await fetch(`/api/stories/checkout?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson(response);
      if (!response.ok || !payload.success || !payload.listing || !payload.pricing) {
        throw new Error(payload.message || "اطلاعات استوری دریافت نشد.");
      }

      setListing(payload.listing);
      setPricing(payload.pricing);
      setTestCouponAvailable(payload.test_coupon_available === true);
      if (payload.pricing.coupon_message) setMessage(payload.pricing.coupon_message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function applyCoupon() {
    if (!coupon.trim()) {
      setMessage("");
      await loadQuote();
      return;
    }
    await loadQuote(coupon);
  }

  async function activateStory() {
    if (!pricing?.coupon_valid || pricing.final_amount_toman !== 0) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/stories/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ listing_id: listingId, discount_code: coupon.trim() }),
      });
      const payload = await readJson(response);
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "فعال‌سازی استوری انجام نشد.");
      }
      setExpiresAt(payload.expires_at || "");
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فعال‌سازی استوری انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !listing) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.card}><div className={styles.state}><div><strong>در حال آماده‌سازی استوری…</strong></div></div></section>
        </div>
      </main>
    );
  }

  if (error && !listing) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.card}><div className={styles.state}><div><strong>استوری آماده نشد</strong><p>{error}</p><Link href="/account/stories">بازگشت به انتخاب آگهی</Link></div></div></section>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <Link href="/account/stories">استوری‌های من</Link>
            <Link href="/"><img className={styles.logo} src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
          </header>
          <section className={styles.card}>
            <div className={styles.state}>
              <div>
                <span className={styles.successMark}>✓</span>
                <strong>استوری فعال شد</strong>
                <p>این آگهی در حباب استوری همین حساب قرار گرفت و تا ۲۴ ساعت نمایش داده می‌شود.{expiresAt ? "" : ""}</p>
                <Link href="/">مشاهده در صفحه اصلی</Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account/stories">بازگشت به انتخاب آگهی</Link>
          <Link href="/" aria-label="چاکود"><img className={styles.logo} src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
        </header>

        <section className={styles.card}>
          <div className={styles.top}>
            <span>استوری چاکود</span>
            <h1>آماده انتشار است</h1>
            <p>آگهی انتخاب‌شده را ببین، کد تخفیف را وارد کن و استوری را فعال کن.</p>
          </div>

          <div className={styles.preview}>
            <div className={styles.bubble} aria-hidden="true">
              <span>{listing?.cover_image_url ? <img src={listing.cover_image_url} alt="" /> : "چ"}</span>
            </div>
            <div className={styles.previewCopy}>
              <small>این آگهی وارد استوری می‌شود</small>
              <strong>{listing?.title || "آگهی خودرو"}</strong>
              {vehicle ? <span>{vehicle}</span> : null}
              {listing?.seller_display_name ? <span>{listing.seller_display_name}</span> : null}
            </div>
          </div>

          <div className={styles.payment}>
            <div className={styles.rows}>
              <div className={styles.row}><span>تعرفه آزمایشی استوری · ۲۴ ساعت</span><strong>{money(pricing?.original_amount_toman)}</strong></div>
              {Number(pricing?.discount_amount_toman || 0) > 0 ? (
                <div className={`${styles.row} ${styles.discount}`}><span>تخفیف</span><strong>− {money(pricing?.discount_amount_toman)}</strong></div>
              ) : null}
              <div className={`${styles.row} ${styles.total}`}><span>مبلغ قابل پرداخت</span><strong>{money(pricing?.final_amount_toman)}</strong></div>
            </div>

            <label className={styles.couponLabel}>
              کد تخفیف
              <div className={styles.couponBox}>
                <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") void applyCoupon(); }} placeholder="مثلاً STORY100" maxLength={40} />
                <button type="button" onClick={() => void applyCoupon()} disabled={loading}>{loading ? "…" : "اعمال"}</button>
              </div>
            </label>

            {testCouponAvailable ? <p className={styles.hint}>برای تست شروع، کد <code>STORY100</code> تخفیف ۱۰۰٪ استوری دارد.</p> : null}
            {message ? <p className={pricing?.coupon_valid ? styles.message : styles.error}>{message}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            <button className={styles.action} type="button" disabled={submitting || !pricing?.coupon_valid || pricing.final_amount_toman !== 0} onClick={() => void activateStory()}>
              {submitting ? "در حال فعال‌سازی…" : pricing?.coupon_valid && pricing.final_amount_toman === 0 ? "فعال‌سازی رایگان استوری" : "پرداخت و انتشار استوری"}
            </button>
            {!pricing?.coupon_valid ? <p className={styles.afterPay}>در نسخه تست، انتشار رایگان با کد بالا فعال است؛ اتصال پرداخت آنلاین بعداً روی همین مرحله قرار می‌گیرد.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
