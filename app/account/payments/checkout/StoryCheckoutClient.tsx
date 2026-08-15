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
  story_id?: number;
  public_story_id?: number;
  share_path?: string;
  share_url?: string;
};

type ShareState = "idle" | "shared" | "copied" | "error";

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
  const [shareUrl, setShareUrl] = useState("");
  const [shareState, setShareState] = useState<ShareState>("idle");
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
    setShareState("idle");

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
      const nextShareUrl = payload.share_url
        || (payload.share_path && typeof window !== "undefined" ? `${window.location.origin}${payload.share_path}` : "");
      setShareUrl(nextShareUrl);
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فعال‌سازی استوری انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyDoubleStoryLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState("copied");
    } catch {
      window.prompt("لینک دبل استوری را کپی کنید:", shareUrl);
    }
  }

  async function shareDoubleStory() {
    if (!shareUrl) return;
    setShareState("idle");
    const shareData = {
      title: `دبل استوری ${listing?.title || "چاکود"}`,
      text: "این استوری را در چاکود ببین و جزئیات کامل آگهی را باز کن:",
      url: shareUrl,
    };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData);
        setShareState("shared");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareState("copied");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setShareState("error");
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
            <Link href="/account/stories">دبل استوری‌های من</Link>
            <Link href="/"><img className={styles.logo} src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
          </header>
          <section className={styles.card}>
            <div className={styles.state}>
              <div>
                <span className={styles.successMark}>✓</span>
                <strong>دبل استوری فعال شد</strong>
                <p>
                  استوری داخل چاکود تا ۲۴ ساعت نمایش داده می‌شود. حالا لینک عمومی همین استوری را در اینستاگرام، واتساپ، تلگرام یا هر اپ دیگری منتشر کن تا مخاطب دوباره وارد چاکود شود.
                  {expiresAt ? "" : ""}
                </p>

                {shareUrl ? (
                  <>
                    <button
                      className={styles.action}
                      style={{ padding: "0 24px" }}
                      type="button"
                      onClick={() => void shareDoubleStory()}
                    >
                      اشتراک‌گذاری دبل استوری
                    </button>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                      <a href={shareUrl} target="_blank" rel="noreferrer">باز کردن لینک عمومی</a>
                      <button
                        type="button"
                        onClick={() => void copyDoubleStoryLink()}
                        style={{ minHeight: 44, padding: "0 18px", border: "1px solid #ddd0f4", borderRadius: 13, color: "#6d28d9", background: "#fff", font: "inherit", fontSize: 12, fontWeight: 900, cursor: "pointer" }}
                      >
                        {shareState === "copied" ? "لینک کپی شد" : "کپی لینک"}
                      </button>
                    </div>
                    {shareState === "shared" ? <p className={styles.message}>پنجره اشتراک‌گذاری باز شد.</p> : null}
                    {shareState === "error" ? <p className={styles.error}>اشتراک مستقیم انجام نشد؛ لینک را کپی کن و در اپ موردنظر قرار بده.</p> : null}
                  </>
                ) : (
                  <p className={styles.error}>لینک عمومی ساخته نشد؛ استوری فعال است اما برای اشتراک دوباره تلاش کن.</p>
                )}

                <Link href="/">مشاهده استوری در صفحه اصلی</Link>
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
            <span>دبل استوری چاکود</span>
            <h1>آماده انتشار است</h1>
            <p>یک‌بار داخل چاکود دیده می‌شود و بعد لینک همان استوری را برای انتشار بیرون از چاکود می‌گیری.</p>
          </div>

          <div className={styles.preview}>
            <div className={styles.bubble} aria-hidden="true">
              <span>{listing?.cover_image_url ? <img src={listing.cover_image_url} alt="" /> : "چ"}</span>
            </div>
            <div className={styles.previewCopy}>
              <small>این آگهی وارد دبل استوری می‌شود</small>
              <strong>{listing?.title || "آگهی خودرو"}</strong>
              {vehicle ? <span>{vehicle}</span> : null}
              {listing?.seller_display_name ? <span>{listing.seller_display_name}</span> : null}
            </div>
          </div>

          <div className={styles.payment}>
            <div className={styles.rows}>
              <div className={styles.row}><span>تعرفه آزمایشی دبل استوری · ۲۴ ساعت</span><strong>{money(pricing?.original_amount_toman)}</strong></div>
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

            {testCouponAvailable ? <p className={styles.hint}>برای تست شروع، کد <code>STORY100</code> تخفیف ۱۰۰٪ دبل استوری دارد.</p> : null}
            {message ? <p className={pricing?.coupon_valid ? styles.message : styles.error}>{message}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            <button className={styles.action} type="button" disabled={submitting || !pricing?.coupon_valid || pricing.final_amount_toman !== 0} onClick={() => void activateStory()}>
              {submitting ? "در حال فعال‌سازی…" : pricing?.coupon_valid && pricing.final_amount_toman === 0 ? "فعال‌سازی رایگان دبل استوری" : "پرداخت و انتشار دبل استوری"}
            </button>
            {!pricing?.coupon_valid ? <p className={styles.afterPay}>در نسخه تست، انتشار رایگان با کد بالا فعال است؛ اتصال پرداخت آنلاین بعداً روی همین مرحله قرار می‌گیرد.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
