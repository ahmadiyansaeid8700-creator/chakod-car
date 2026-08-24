"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Entry = { id: number; status: string; score: number; reason: string };
type Listing = { id: number; title?: string; brand?: string; model?: string; province?: string; city?: string };
type Data = { success?: boolean; message?: string; wallet?: { availableCards: number }; listing?: Listing | null; entries?: Entry[] };
const labels: Record<string, string> = { active: "فعال در کف بازار", pending_admin: "در انتظار مدیر", waitlisted: "در صف ظرفیت", rejected: "رد شده", cancelled: "لغو شده" };

export default function MarketFloorAccountPage() {
  const listingId = Number(useSearchParams().get("listing_id") || 0);
  const [data, setData] = useState<Data | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const query = listingId ? `?listing_id=${listingId}` : "";
    setError("");
    const [response, listingResponse] = await Promise.all([
      fetch(`/api/market-floor${query}`, { cache: "no-store", credentials: "include" }),
      fetch("/api/auth/dashboard-listings?page=1&per_page=50&status=active&owner=all", { cache: "no-store", credentials: "include" }),
    ]);
    const body = await response.json().catch(() => null);
    const listingBody = await listingResponse.json().catch(() => null);
    if (response.status === 401) { window.location.assign(`/login?returnTo=${encodeURIComponent(`/account/market-floor${query}`)}`); return; }
    if (!response.ok || !body?.success) setError(body?.message || "اطلاعات کف بازار دریافت نشد.");
    setData(body);
    setListings(Array.isArray(listingBody?.data) ? listingBody.data : []);
  }

  useEffect(() => { void load(); }, [listingId]);

  async function submit(reserveNext: boolean) {
    if (!listingId) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/market-floor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listing_id: listingId, scope: "province", reserve_next_cycle: reserveNext }) });
    const body = await response.json().catch(() => null);
    setMessage(body?.message || "درخواست ثبت نشد؛ دوباره تلاش کنید.");
    setBusy(false); await load();
  }

  const cards = data?.wallet?.availableCards;
  return <main className={styles.page} dir="rtl">
    <section className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className={styles.marketSeal}><span>٪</span><small>فرصت واقعی</small></div>
      <span className={styles.eyebrow}><i /> انتخاب هوشمند چاکود</span>
      <h1>کف بازار</h1>
      <p>فرصت‌های خرید واقعی، نه تخفیف‌های ظاهری</p>
      <div className={styles.heroRule}><span>بررسی قیمت</span><b>•</b><span>شرایط خودرو</span><b>•</b><span>کیفیت آگهی</span></div>
    </section>

    <section className={styles.ticketPanel} aria-label="کارت‌های کف بازار">
      <div className={styles.ticketCopy}><small>سهمیه رایگان شما</small><strong>{cards ?? "…"} کارت کف بازار</strong><span>هر کارت، یک درخواست بررسی هوشمند</span></div>
      <div className={styles.cardStack} aria-hidden="true">{[0,1,2].map((index) => <i key={index} className={cards !== undefined && index < cards ? styles.cardActive : styles.cardUsed}>✦</i>)}</div>
    </section>

    <section className={styles.quickFacts}>
      <div><span>۱۰</span><small>فرصت در هر استان</small></div>
      <div><span>۸ صبح</span><small>شروع چرخه روزانه</small></div>
      <div><span>۲۴ ساعت</span><small>مدت نمایش</small></div>
    </section>

    {error ? <section className={styles.error}><strong>اتصال کف بازار کامل نشد</strong><p>{error}</p></section> : null}

    {listingId ? <section className={styles.actionPanel}>{data?.listing ? <>
      <span className={styles.sectionKicker}>آگهی انتخاب‌شده</span>
      <h2>{data.listing.title}</h2>
      <p className={styles.location}>⌖ {[data.listing.city, data.listing.province].filter(Boolean).join("، ")}</p>
      <div className={styles.reviewSteps}><span><b>۱</b> تحلیل بازار</span><span><b>۲</b> امتیاز فرصت</span><span><b>۳</b> ورود برترین‌ها</span></div>
      <button className={styles.primaryButton} disabled={busy} onClick={() => void submit(false)}>{busy ? "در حال بررسی…" : "شروع بررسی هوشمند"}<span>←</span></button>
      <button className={styles.secondaryButton} disabled={busy} onClick={() => void submit(true)}>رزرو برای چرخه فردا</button>
      <small className={styles.assurance}>در صورت رد شدن، کارت شما برمی‌گردد.</small>
      {message ? <p className={styles.message}>{message}</p> : null}
    </> : <div className={styles.loading}>در حال آماده‌سازی آگهی…</div>}</section> : <section className={styles.selector}>
      <span className={styles.sectionKicker}>شروع کن</span><h2>کدام خودرو فرصت خوبی است؟</h2><p>یکی از آگهی‌های فعال خودت را برای بررسی انتخاب کن.</p>
      {listings.length ? <div className={styles.listingGrid}>{listings.map((listing) => <button key={listing.id} type="button" onClick={() => window.location.assign(`/account/market-floor?listing_id=${listing.id}`)}><span className={styles.carIcon}>◇</span><span><strong>{listing.title || [listing.brand, listing.model].filter(Boolean).join(" ") || `آگهی ${listing.id}`}</strong><small>{[listing.city, listing.province].filter(Boolean).join("، ") || "آگهی فعال"}</small></span><b>←</b></button>)}</div> : <Link className={styles.primaryLink} href="/account/listings">مشاهده آگهی‌های من</Link>}
    </section>}

    {(data?.entries?.length || 0) > 0 ? <section className={styles.history}><span className={styles.sectionKicker}>پیگیری</span><h2>درخواست‌های من</h2><div>{data?.entries?.map((entry) => <article key={entry.id}><span className={styles.score}>{entry.score}</span><div><strong>{labels[entry.status] || entry.status}</strong><p>{entry.reason}</p></div></article>)}</div></section> : null}
  </main>;
}
