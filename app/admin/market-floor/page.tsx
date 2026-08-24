"use client";
import { useEffect, useState } from "react";

type Entry = { id: number; listingId: number; province: string; status: string; score: number; grade: string; reason: string; cycleKey: string; cardState: string; listing?: { title?: string; brand?: string; model?: string; priceToman?: number } };
const statusLabel: Record<string, string> = { active: "فعال", pending_admin: "بررسی مدیر", waitlisted: "صف ظرفیت", rejected: "ردشده", cancelled: "لغوشده", qualified: "واجد شرایط" };

export default function MarketFloorAdminPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const response = await fetch("/api/admin/market-floor", { cache: "no-store" }); const data = await response.json(); setItems(data.success ? data.data : []); setLoading(false); }
  useEffect(() => { void load(); }, []);
  async function act(id: number, action: string) { await fetch("/api/admin/market-floor", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) }); await load(); }
  return <main dir="rtl" style={{ display: "grid", gap: 18 }}>
    <header style={{ padding: 24, borderRadius: 24, color: "white", background: "linear-gradient(135deg,#241138,#7c3aed)" }}><small>هوش و بازار چاکود</small><h1 style={{ margin: "8px 0" }}>مدیریت کف بازار</h1><p style={{ margin: 0, opacity: .8 }}>امتیاز، دلیل تصمیم، ظرفیت استان‌ها و بازگشت کارت‌ها</p></header>
    {loading ? <p>در حال دریافت…</p> : <section style={{ display: "grid", gap: 10 }}>{items.map((item) => <article key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) repeat(4,auto)", alignItems: "center", gap: 12, padding: 16, border: "1px solid #e9e1ef", borderRadius: 17, background: "#fff" }}>
      <div><strong>{item.listing?.title || `آگهی ${item.listingId}`}</strong><small style={{ display: "block", marginTop: 5, color: "#7c7085" }}>{item.province} · چرخه {item.cycleKey}</small><p style={{ margin: "7px 0 0", fontSize: 11 }}>{item.reason}</p></div>
      <b style={{ color: item.score >= 80 ? "#047857" : "#b45309" }}>{item.score}/۱۰۰</b><span>{statusLabel[item.status] || item.status}</span>
      <button onClick={() => void act(item.id, "approve")}>تأیید</button><button onClick={() => void act(item.id, "reject")}>رد و بازگشت کارت</button>
    </article>)}</section>}
  </main>;
}
