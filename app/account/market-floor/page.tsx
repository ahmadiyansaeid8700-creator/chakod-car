"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Data = { success?: boolean; message?: string; wallet?: { availableCards: number; consumedCards: number; refundedCards: number }; listing?: { id: number; title: string; province: string; city: string; priceToman: number } | null; entries?: Array<{ id: number; listingId: number; status: string; score: number; reason: string; cycleKey: string; cardState: string }> };
const statusLabel: Record<string, string> = { active: "فعال در کف بازار", pending_admin: "در انتظار بررسی مدیر", waitlisted: "در صف ظرفیت", rejected: "رد شده", cancelled: "لغو شده" };

export default function MarketFloorAccountPage() {
  const params = useSearchParams();
  const listingId = Number(params.get("listing_id") || 0);
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() { const query = listingId ? `?listing_id=${listingId}` : ""; const response = await fetch(`/api/market-floor${query}`, { cache: "no-store" }); const body = await response.json(); if (response.status === 401) { window.location.assign(`/login?returnTo=${encodeURIComponent(`/account/market-floor${query}`)}`); return; } setData(body); }
  useEffect(() => { void load(); }, [listingId]);
  async function submit(reserveNext: boolean) { if (!listingId) return; setBusy(true); setMessage(""); const response = await fetch("/api/market-floor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listing_id: listingId, scope: "province", reserve_next_cycle: reserveNext }) }); const body = await response.json(); setMessage(body.message || "درخواست ثبت شد."); setBusy(false); await load(); }
  return <main dir="rtl" style={{ width: "min(1120px,calc(100% - 24px))", margin: "28px auto 90px", display: "grid", gap: 18 }}>
    <header style={{ padding: "30px clamp(18px,5vw,52px)", borderRadius: 28, color: "#fff", background: "radial-gradient(circle at 15% 0,#f59e0b55,transparent 35%),linear-gradient(135deg,#21102f,#6d28d9)" }}><span style={{ color: "#fde68a", fontWeight: 900 }}>از دل بازار، برای خرید بهتر</span><h1 style={{ margin: "9px 0", fontSize: "clamp(28px,5vw,48px)" }}>کف بازار</h1><p style={{ maxWidth: 680, lineHeight: 2, opacity: .82 }}>کارت فقط درخواست بررسی است؛ چاکود قیمت، وضعیت خودرو، کارکرد و کیفیت آگهی را می‌سنجد و فقط فرصت‌های واقعی را نمایش می‌دهد.</p></header>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>{[["کارت باقی‌مانده",data?.wallet?.availableCards ?? "—"],["ظرفیت هر استان",10],["شروع چرخه","۸ صبح"]].map(([label,value]) => <div key={String(label)} style={{ padding: 17, border: "1px solid #e9e1ef", borderRadius: 17, background: "#fff" }}><small>{label}</small><strong style={{ display: "block", marginTop: 7, fontSize: 22 }}>{value}</strong></div>)}</section>
    {listingId ? <section style={{ padding: 22, border: "1px solid #e9e1ef", borderRadius: 22, background: "#fff" }}>{data?.listing ? <><small>آگهی انتخاب‌شده</small><h2>{data.listing.title}</h2><p>{data.listing.city}، {data.listing.province}</p><div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}><button disabled={busy} onClick={() => void submit(false)} style={{ padding: "12px 18px", border: 0, borderRadius: 12, color: "#fff", background: "#6d28d9" }}>بررسی برای چرخه فعلی</button><button disabled={busy} onClick={() => void submit(true)} style={{ padding: "12px 18px", border: "1px solid #6d28d9", borderRadius: 12, color: "#6d28d9", background: "#fff" }}>رزرو چرخه فردا</button></div>{message ? <p style={{ padding: 12, borderRadius: 12, background: "#f5f0fa" }}>{message}</p> : null}</> : <p>{data?.message || "در حال دریافت آگهی…"}</p>}</section> : <section style={{ padding: 22, borderRadius: 22, background: "#fff" }}><h2>یک آگهی انتخاب کن</h2><p>از مدیریت آگهی‌ها، گزینه «شرکت در کف بازار» را بزن.</p><Link href="/account/listings">رفتن به آگهی‌های من</Link></section>}
    {(data?.entries?.length || 0) > 0 ? <section><h2>درخواست‌های من</h2><div style={{ display: "grid", gap: 9 }}>{data?.entries?.map((entry) => <article key={entry.id} style={{ padding: 16, border: "1px solid #e9e1ef", borderRadius: 16, background: "#fff" }}><strong>{statusLabel[entry.status] || entry.status} · امتیاز {entry.score}</strong><p style={{ marginBottom: 0 }}>{entry.reason}</p></article>)}</div></section> : null}
  </main>;
}
