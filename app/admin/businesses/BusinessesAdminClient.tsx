"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./BusinessesAdminClient.module.css";

type ModerationStatus = "pending" | "approved" | "rejected" | "suspended";
type BusinessType = "dealer" | "repair_shop" | "car_service" | "parts_store";

type AdminBusiness = {
  id: number;
  activity_id?: number;
  source?: "native" | "external";
  auth_user_id: number | null;
  owner_mobile?: string;
  owner_name?: string;
  business_type: BusinessType;
  name: string;
  phone: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  logo_url: string;
  public_slug: string;
  profile_status: "draft" | "complete";
  moderation_status: ModerationStatus;
  moderation_note?: string | null;
  service_categories: string[];
  services: string[];
  is_active: boolean;
  is_verified: boolean;
  home_featured: boolean;
  mobile_service: boolean;
  updated_at?: string;
};

type Stats = { total: number; pending: number; approved: number; rejected: number; suspended: number; featured: number };
type ReadResponse = { success?: boolean; message?: string; items?: AdminBusiness[]; total?: number; stats?: Partial<Stats>; can_manage?: boolean };
type PatchResponse = { success?: boolean; message?: string; item?: AdminBusiness };

const statusLabels: Record<ModerationStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
  suspended: "تعلیق‌شده",
};
const typeLabels: Record<BusinessType, string> = {
  dealer: "نمایشگاه خودرو",
  repair_shop: "تعمیرگاه خودرو",
  car_service: "مرکز خدمات خودرو",
  parts_store: "فروشگاه قطعات و لوازم خودرو",
};
const categoryLabels: Record<string, string> = {
  vehicle_sales: "فروش خودرو", vehicle_purchase: "خرید خودرو", vehicle_exchange: "تعویض خودرو", consignment_sales: "فروش امانی", financing: "فروش اقساطی",
  mechanical: "مکانیکی", auto_electrical: "برق خودرو", battery: "باتری", suspension: "جلوبندی", engine_tune: "تنظیم موتور", gearbox: "تعمیر گیربکس", engine_repair: "تعمیر موتور", oil_change: "تعویض روغن", body_paint: "صافکاری و نقاشی", tire_service: "لاستیک و آپاراتی", air_conditioning: "کولر خودرو", exhaust: "اگزوزسازی", diagnostics: "دیاگ", roadside_assistance: "امداد خودرو", other_repair: "سایر تعمیرات",
  car_wash: "کارواش", mobile_car_wash: "کارواش سیار", interior_cleaning: "صفرشویی", detailing: "دیتیلینگ", polishing: "پولیش و واکس", ceramic_coating: "سرامیک بدنه", paint_restoration: "احیای رنگ", window_tint: "شیشه دودی", vehicle_wrap: "کاور بدنه", ppf: "محافظ رنگ PPF", accessories_installation: "نصب لوازم جانبی", audio_alarm: "سیستم صوتی و دزدگیر", seat_cover_floor_mat: "روکش و کف‌پوش", auto_glass: "شیشه خودرو", headlight_restoration: "ترمیم چراغ", mobile_service: "خدمات در محل", other_car_service: "سایر خدمات خودرو",
  spare_parts: "قطعات یدکی", consumables: "لوازم مصرفی", oil_filter: "روغن و فیلتر", tire_wheel: "لاستیک و رینگ", accessories: "لوازم جانبی", decorative_parts: "لوازم تزئینی", audio_equipment: "تجهیزات صوتی", body_parts: "قطعات بدنه", used_parts: "قطعات استوک", other_parts: "سایر قطعات",
};

function getToken() {
  return typeof window === "undefined" ? "" : localStorage.getItem("chakod_session_token") || "";
}
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}
async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try { return JSON.parse(text) as T; } catch { return { success: false, message: "پاسخ سرور معتبر نیست." } as T; }
}

export default function BusinessesAdminClient() {
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, suspended: 0, featured: 0 });
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const search = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (query.trim()) params.set("q", query.trim());
    return params.toString();
  }, [status, type, query]);

  async function load() {
    setLoading(true); setError("");
    try {
      const options = { cache: "no-store" as const, credentials: "include" as const, headers: { Accept: "application/json", ...authHeaders() } };
      const [response, nativeResponse] = await Promise.all([
        fetch(`/api/admin/businesses?${search}`, options),
        fetch("/api/admin/account-activities", options),
      ]);
      const [result, nativeResult] = await Promise.all([readJson<ReadResponse>(response), readJson<ReadResponse>(nativeResponse)]);
      if (!response.ok || !result.success) throw new Error(result.message || "دریافت کسب‌وکارها انجام نشد.");
      const externalItems = (Array.isArray(result.items) ? result.items : []).map((item) => ({ ...item, source: "external" as const }));
      const nativeItems = nativeResponse.ok && nativeResult.success && Array.isArray(nativeResult.items)
        ? nativeResult.items.filter((item) => {
            if (status && item.moderation_status !== status) return false;
            if (type && item.business_type !== type) return false;
            const needle = query.trim().toLocaleLowerCase("fa");
            return !needle || [item.name, item.phone, item.city, item.province, String(item.activity_id || "")]
              .some((value) => String(value || "").toLocaleLowerCase("fa").includes(needle));
          })
        : [];
      setItems([...nativeItems, ...externalItems]);
      setStats({
        total: Number(result.stats?.total || 0) + nativeItems.length, pending: Number(result.stats?.pending || 0) + nativeItems.filter((item) => item.moderation_status === "pending").length, approved: Number(result.stats?.approved || 0) + nativeItems.filter((item) => item.moderation_status === "approved").length,
        rejected: Number(result.stats?.rejected || 0) + nativeItems.filter((item) => item.moderation_status === "rejected").length, suspended: Number(result.stats?.suspended || 0) + nativeItems.filter((item) => item.moderation_status === "suspended").length, featured: Number(result.stats?.featured || 0),
      });
      setCanManage(Boolean(result.can_manage || nativeResult.can_manage));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت کسب‌وکارها انجام نشد.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [search]);

  async function patch(item: AdminBusiness, body: Record<string, unknown>) {
    if (!canManage || savingId !== null) return;
    setSavingId(item.id); setError(""); setMessage("");
    try {
      const response = await fetch(item.source === "native" ? "/api/admin/account-activities" : "/api/admin/businesses", {
        method: "PATCH", credentials: "include", cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(item.source === "native" ? { activity_id: item.activity_id, ...body } : { dealer_id: item.id, ...body }),
      });
      const result = await readJson<PatchResponse>(response);
      if (!response.ok || !result.success || !result.item) throw new Error(result.message || "ذخیره وضعیت انجام نشد.");
      setItems((current) => current.map((row) => row.id === item.id ? result.item! : row));
      setMessage(result.message || "تغییرات ذخیره شد.");
      window.setTimeout(() => void load(), 500);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ذخیره وضعیت انجام نشد."); }
    finally { setSavingId(null); }
  }

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.header}>
        <div><span>مدیریت چاکود</span><h1>کسب‌وکارهای خودرو</h1><p>بررسی، تأیید، تعلیق و انتخاب جایگاه صفحه اصلی؛ بدون دسترسی به مبلغ یا موجودی کاربران.</p></div>
        <nav><button type="button" onClick={() => window.history.back()}>بازگشت</button><a href="/admin">مدیریت اصلی</a><a href="/businesses">نمای عمومی</a><a href="/">صفحه اصلی</a></nav>
      </header>

      <section className={styles.stats}>
        {[['کل کسب‌وکارها',stats.total],['در انتظار',stats.pending],['تأییدشده',stats.approved],['ردشده',stats.rejected],['تعلیق‌شده',stats.suspended],['ویژه صفحه اصلی',stats.featured]].map(([label,value]) => <div key={String(label)}><span>{label}</span><strong>{Number(value).toLocaleString("fa-IR")}</strong></div>)}
      </section>

      <section className={styles.toolbar}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو با نام، موبایل، شهر یا شناسه" />
        <select value={type} onChange={(event) => setType(event.target.value)}><option value="">همه نوع‌ها</option>{Object.entries(typeLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">همه وضعیت‌ها</option>{Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
        <button type="button" onClick={() => void load()}>تازه‌سازی</button>
      </section>

      {message && <div className={styles.success}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}
      {!canManage && !loading && <div className={styles.notice}>دسترسی فعلی فقط مشاهده است. دکمه‌های مدیریتی غیرفعال‌اند.</div>}

      <section className={styles.list}>
        {loading ? <div className={styles.state}>در حال دریافت اطلاعات…</div> : items.length ? items.map((item) => (
          <article className={styles.card} key={item.id}>
            <div className={styles.identity}>
              {item.logo_url ? <img src={item.logo_url} alt="" /> : <b>{item.name.slice(0,1)}</b>}
              <div><span>{typeLabels[item.business_type]}</span><h2>{item.name}</h2><p>{[item.neighborhood,item.city,item.province].filter(Boolean).join("، ")}</p></div>
              <em className={styles[item.moderation_status]}>{statusLabels[item.moderation_status]}</em>
            </div>
            <div className={styles.meta}>
              <div><span>مالک حساب</span><strong>{item.owner_name || "ثبت نشده"}</strong><small>{item.owner_mobile || ""}</small></div>
              <div><span>تماس عمومی</span><strong>{item.phone || "ثبت نشده"}</strong></div>
              <div><span>پروفایل</span><strong>{item.profile_status === "complete" ? "کامل" : "ناقص"}</strong></div>
              <div><span>شناسه عمومی</span><strong>{item.public_slug || "ساخته نشده"}</strong></div>
            </div>
            <div className={styles.services}>{[...item.service_categories.map((value) => categoryLabels[value] || value),...item.services].slice(0,8).map((value) => <span key={value}>{value}</span>)}</div>
            {item.moderation_note && <div className={styles.previousNote}>یادداشت مدیریت: {item.moderation_note}</div>}
            <textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({...current,[item.id]:event.target.value}))} placeholder="دلیل رد یا تعلیق و یادداشت بررسی" maxLength={1000} disabled={!canManage} />
            <div className={styles.actions}>
              <button disabled={!canManage || savingId === item.id} onClick={() => void patch(item,{ action:"set_status",status:"approved",note:notes[item.id] || "" })}>تأیید</button>
              <button disabled={!canManage || savingId === item.id} onClick={() => void patch(item,{ action:"set_status",status:"pending",note:notes[item.id] || "" })}>بررسی مجدد</button>
              <button className={styles.reject} disabled={!canManage || savingId === item.id} onClick={() => void patch(item,{ action:"set_status",status:"rejected",note:notes[item.id] || "" })}>رد</button>
              <button className={styles.suspend} disabled={!canManage || savingId === item.id} onClick={() => void patch(item,{ action:"set_status",status:"suspended",note:notes[item.id] || "" })}>تعلیق</button>
              <button className={styles.feature} disabled={!canManage || savingId === item.id || item.moderation_status !== "approved"} onClick={() => void patch(item,{ action:"set_featured",featured:!item.home_featured,sort_order:0 })}>{item.home_featured ? "حذف از صفحه اصلی" : "ویژه صفحه اصلی"}</button>
              {item.source === "native" && item.activity_id ? <a href={`/businesses/activity/${item.activity_id}`} target="_blank">نمایش عمومی</a> : item.public_slug && <a href={`/businesses/${item.public_slug}`} target="_blank">نمایش عمومی</a>}
            </div>
          </article>
        )) : <div className={styles.state}>کسب‌وکاری با این فیلتر پیدا نشد.</div>}
      </section>
    </main>
  );
}
