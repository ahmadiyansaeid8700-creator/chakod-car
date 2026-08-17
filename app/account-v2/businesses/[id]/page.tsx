"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import MobileBottomNav from "../../../components/MobileBottomNav";
import BusinessResumeEditor from "./BusinessResumeEditor";
import BusinessTeamPanel from "./BusinessTeamPanel";
import styles from "./page.module.css";

type Activity = {
  id: number;
  type: "dealer" | "parts_store" | "repair_shop" | "car_service" | string;
  name: string;
  phone: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  status: string;
  verification_status: string;
  access_role?: string;
  is_owner?: boolean;
  can_manage?: boolean;
};
type ActivityResponse = { success?: boolean; message?: string; activity?: Activity | null };
type GeoResponse = { success?: boolean; data?: string[]; has_neighborhoods?: boolean };

function label(type: string) {
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}
function activityIcon(type: string) {
  if (type === "parts_store") return "قطعه";
  if (type === "repair_shop") return "تعمیر";
  if (type === "car_service") return "خدمت";
  return "کسب";
}
function statusLabel(status: string) {
  if (status === "active") return "فعال";
  if (status === "disabled") return "غیرفعال";
  if (status === "draft") return "پیش‌نویس";
  return "ثبت‌شده";
}
function verificationLabel(status: string) {
  if (status === "verified") return "تأیید شده";
  if (status === "pending") return "در انتظار تأیید";
  if (status === "rejected") return "نیازمند اصلاح";
  return "تأیید نشده";
}
function accessLabel(role?: string) {
  if (role === "owner") return "مالک";
  if (role === "manager") return "مدیر";
  if (role === "sales") return "فروش";
  if (role === "content") return "محتوا";
  if (role === "finance") return "مالی";
  return "عضو تیم";
}
async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try { return JSON.parse(text) as T; } catch { throw new Error("پاسخ سرور معتبر نیست."); }
}
async function geo(params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();
  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);
  const response = await fetch(`/api/geo-locations${search.size ? `?${search}` : ""}`, { cache: "no-store" });
  const payload = await readJson<GeoResponse>(response);
  return { items: Array.isArray(payload.data) ? payload.data : [], hasNeighborhoods: Boolean(payload.has_neighborhoods) };
}

export default function BusinessActivityPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id || 0);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", province: "", city: "", neighborhood: "", address: "" });
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [hasNeighborhoods, setHasNeighborhoods] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const [response, provinceResult] = await Promise.all([
          fetch(`/api/auth/account-activities/${id}`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }),
          geo(),
        ]);
        const payload = await readJson<ActivityResponse>(response);
        if (!response.ok || !payload.success || !payload.activity) throw new Error(payload.message || "کسب‌وکار دریافت نشد.");
        const item = payload.activity;
        if (item.type === "dealer") {
          window.location.replace("/account/business");
          return;
        }
        setActivity(item);
        setForm({ name: item.name, phone: item.phone || "", province: item.province || "", city: item.city || "", neighborhood: item.neighborhood || "", address: item.address || "" });
        setProvinces(provinceResult.items);
        if (item.province) {
          const cityResult = await geo({ province: item.province });
          setCities(cityResult.items);
          if (item.city) {
            const neighborhoodResult = await geo({ province: item.province, city: item.city });
            setNeighborhoods(neighborhoodResult.items);
            setHasNeighborhoods(neighborhoodResult.hasNeighborhoods && neighborhoodResult.items.length > 0);
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "اطلاعات کسب‌وکار دریافت نشد.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function changeProvince(value: string) {
    setForm((current) => ({ ...current, province: value, city: "", neighborhood: "" }));
    setCities([]);
    setNeighborhoods([]);
    setHasNeighborhoods(false);
    if (!value) return;
    try { setCities((await geo({ province: value })).items); } catch { setCities([]); }
  }

  async function changeCity(value: string) {
    setForm((current) => ({ ...current, city: value, neighborhood: "" }));
    setNeighborhoods([]);
    setHasNeighborhoods(false);
    if (!form.province || !value) return;
    try {
      const result = await geo({ province: form.province, city: value });
      setNeighborhoods(result.items);
      setHasNeighborhoods(result.hasNeighborhoods && result.items.length > 0);
    } catch { setNeighborhoods([]); }
  }

  async function save() {
    if (!activity || saving || !activity.can_manage) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/account-activities/${activity.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await readJson<ActivityResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "ذخیره انجام نشد.");
      if (payload.activity) setActivity(payload.activity);
      setNotice(payload.message || "اطلاعات ذخیره شد.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ذخیره انجام نشد.");
    } finally { setSaving(false); }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.homeLink}>صفحه اصلی</Link>
          <Link href="/" className={styles.logo}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
        </header>

        {loading ? <section className={styles.state}>در حال دریافت کسب‌وکار…</section> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        {!loading && activity ? (
          <>
            <section className={styles.hero}>
              <div className={styles.heroIcon} aria-hidden="true">{activityIcon(activity.type)}</div>
              <div className={styles.heroCopy}>
                <span>{label(activity.type)} · {accessLabel(activity.access_role)}</span>
                <h1>{activity.name}</h1>
                <p>{[activity.city, activity.province].filter(Boolean).join("، ") || "موقعیت مجموعه را تکمیل کنید"}</p>
              </div>
            </section>

            <section className={styles.statusGrid} aria-label="وضعیت مجموعه">
              <div><strong>{statusLabel(activity.status)}</strong><span>وضعیت فعالیت</span></div>
              <div><strong>{verificationLabel(activity.verification_status)}</strong><span>وضعیت تأیید</span></div>
              <div><strong>{activity.phone || "ثبت نشده"}</strong><span>شماره تماس</span></div>
            </section>

            {activity.can_manage ? (
              <section className={styles.promoteCard}>
                <div className={styles.promoteIcon} aria-hidden="true">✦</div>
                <div className={styles.promoteCopy}>
                  <span>جایگاه ویژه</span>
                  <h2>تبلیغ {activity.name}</h2>
                  <p>رزومه و ویترین این مجموعه را در بخش منتخب صفحه اول چاکود بالاتر از نمایش عادی به کاربران نشان بده.</p>
                </div>
                <Link href="/account/selected" className={styles.promoteButton}>تبلیغ این مجموعه</Link>
              </section>
            ) : null}

            <section className={styles.quickActions}>
              {activity.is_owner ? (
                <a href="#business-resume" className={styles.quickAction}>
                  <span>▦</span><div><strong>رزومه و آلبوم</strong><small>معرفی، تخصص‌ها و نمونه‌کارها</small></div>
                </a>
              ) : null}
              <a href="#business-team" className={styles.quickAction}>
                <span>♙</span><div><strong>تیم مجموعه</strong><small>پرسنل، نقش‌ها و دسترسی‌ها</small></div>
              </a>
              {activity.can_manage ? (
                <a href="#business-info" className={styles.quickAction}>
                  <span>✎</span><div><strong>ویرایش اطلاعات</strong><small>نام، تماس و آدرس مجموعه</small></div>
                </a>
              ) : null}
              <Link href="/account/showcase" className={styles.quickAction}>
                <span>▣</span><div><strong>کارت روز</strong><small>محتوای روزانه برای اشتراک‌گذاری</small></div>
              </Link>
            </section>

            {activity.is_owner ? <BusinessResumeEditor activityId={activity.id} activityName={activity.name} /> : null}

            <BusinessTeamPanel activityId={activity.id} />

            {activity.can_manage ? (
              <section className={styles.card} id="business-info">
                <div className={styles.sectionTitle}>
                  <span>اطلاعات مجموعه</span>
                  <h2>ویرایش اطلاعات پایه</h2>
                </div>
                <label><span>نام مجموعه</span><input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} /></label>
                <label><span>شماره تماس</span><input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} inputMode="tel" /></label>
                <div className={styles.twoCols}>
                  <label><span>استان</span><select value={form.province} onChange={(e) => void changeProvince(e.target.value)}><option value="">انتخاب استان</option>{provinces.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label><span>شهر</span><select value={form.city} disabled={!form.province} onChange={(e) => void changeCity(e.target.value)}><option value="">انتخاب شهر</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                </div>
                {hasNeighborhoods ? <label><span>محله</span><select value={form.neighborhood} onChange={(e) => setForm((c) => ({ ...c, neighborhood: e.target.value }))}><option value="">انتخاب محله</option>{neighborhoods.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
                <label><span>آدرس</span><textarea value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} /></label>
                <button type="button" disabled={saving || form.name.trim().length < 2 || !form.province || !form.city} onClick={() => void save()}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button>
              </section>
            ) : null}

            {activity.is_owner ? (
              <section className={styles.dangerZone}>
                <span>تنظیمات حساب کسب‌وکار</span>
                <Link href={`/account-v2/business-delete?activity_id=${activity.id}`}>درخواست حذف با کد تأیید</Link>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
