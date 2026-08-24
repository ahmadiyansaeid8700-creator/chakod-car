"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

  return <main dir="rtl" style={{ width: "min(1120px,calc(100% - 24px))", margin: "28px auto 90px", display: "grid", gap: 18 }}>
    <header style={{ padding: "30px clamp(18px,5vw,52px)", borderRadius: 28, color: "#fff", background: "radial-gradient(circle at 15% 0,#f59e0b55,transparent 35%),linear-gradient(135deg,#21102f,#6d28d9)" }}><span style={{ color: "#fde68a", fontWeight: 900 }}>از دل بازار، برای خرید بهتر</span><h1 style={{ margin: "9px 0", fontSize: "clamp(28px,5vw,48px)" }}>کف بازار</h1><p style={{ maxWidth: 680, lineHeight: 2, opacity: .82 }}>کارت فقط درخواست بررسی است؛ چاکود قیمت، وضعیت، کارکرد و کیفیت آگهی را می‌سنجد.</p></header>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>{[["کارت باقی‌مانده", data?.wallet?.availableCards ?? "…"],["ظرفیت هر استان", "۱۰"],["شروع چرخه", "۸ صبح"]].map(([label,value]) => <div key={label} style={{ padding: 17, border: "1px solid #e9e1ef", borderRadius: 17, background: "#fff" }}><small>{label}</small><strong style={{ display: "block", marginTop: 7, fontSize: 22 }}>{value}</strong></div>)}</section>
    {error ? <section style={{ padding: 16, border: "1px solid #fecaca", borderRadius: 16, color: "#991b1b", background: "#fff1f2" }}><strong>اتصال کف بازار کامل نشد</strong><p style={{ marginBottom: 0 }}>{error}</p></section> : null}
    {listingId ? <section style={{ padding: 22, border: "1px solid #e9e1ef", borderRadius: 22, background: "#fff" }}>{data?.listing ? <><small>آگهی انتخاب‌شده</small><h2>{data.listing.title}</h2><p>{[data.listing.city, data.listing.province].filter(Boolean).join("، ")}</p><div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}><button disabled={busy} onClick={() => void submit(false)} style={{ padding: "12px 18px", border: 0, borderRadius: 12, color: "#fff", background: "#6d28d9" }}>بررسی چرخه فعلی</button><button disabled={busy} onClick={() => void submit(true)} style={{ padding: "12px 18px", border: "1px solid #6d28d9", borderRadius: 12, color: "#6d28d9", background: "#fff" }}>رزرو فردا</button></div>{message ? <p style={{ padding: 12, borderRadius: 12, background: "#f5f0fa" }}>{message}</p> : null}</> : <p>در حال دریافت آگهی…</p>}</section> : <section style={{ padding: 22, borderRadius: 22, background: "#fff" }}><h2>یک آگهی فعال انتخاب کن</h2><p>آگهی‌های خودت را همین‌جا انتخاب و برای بررسی ارسال کن.</p>{listings.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>{listings.map((listing) => <button key={listing.id} type="button" onClick={() => window.location.assign(`/account/market-floor?listing_id=${listing.id}`)} style={{ padding: 15, border: "1px solid #e6ddef", borderRadius: 15, textAlign: "right", color: "#281637", background: "#fff", cursor: "pointer" }}><strong>{listing.title || [listing.brand, listing.model].filter(Boolean).join(" ") || `آگهی ${listing.id}`}</strong><small style={{ display: "block", marginTop: 6, color: "#7b6d84" }}>{[listing.city, listing.province].filter(Boolean).join("، ") || "انتخاب آگهی"}</small></button>)}</div> : <Link href="/account/listings">رفتن به آگهی‌های من</Link>}</section>}
    {(data?.entries?.length || 0) > 0 ? <section><h2>درخواست‌های من</h2><div style={{ display: "grid", gap: 9 }}>{data?.entries?.map((entry) => <article key={entry.id} style={{ padding: 16, border: "1px solid #e9e1ef", borderRadius: 16, background: "#fff" }}><strong>{labels[entry.status] || entry.status} · امتیاز {entry.score}</strong><p style={{ marginBottom: 0 }}>{entry.reason}</p></article>)}</div></section> : null}
  </main>;
}
