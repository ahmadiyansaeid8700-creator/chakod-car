"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import BusinessWalletCard from "../../../account/components/BusinessWalletCard";
import dealerStyles from "../../../account/business/DealerCommandCenter.module.css";
import MobileBottomNav from "../../../components/MobileBottomNav";
import BusinessResumeEditor from "./BusinessResumeEditor";
import BusinessTeamPanel from "./BusinessTeamPanel";
import orderStyles from "./BusinessOrder.module.css";
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
type TabKey = "overview" | "showcase" | "team";
type ProfileSection = "resume" | "info";

const tabs: Array<[TabKey, string]> = [
  ["overview", "نمای کلی"],
  ["showcase", "ویترین"],
  ["team", "تیم"],
];

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

function accessLabel(role?: string) {
  if (role === "owner") return "مالک";
  if (role === "manager") return "مدیر";
  if (role === "sales") return "فروش";
  if (role === "content") return "محتوا";
  if (role === "finance") return "مالی";
  return "عضو تیم";
}

function tabIcon(tab: TabKey) {
  if (tab === "overview") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 7v5c0 4-2.5 6.8-7 8.5C7.5 18.8 5 16 5 12V7l7-3.5Z"/><path d="m9 12 2 2 4-4"/></svg>;
  }
  if (tab === "showcase") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h5"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3.8 19c.5-3.2 2.5-5 5.2-5s4.7 1.8 5.2 5M14.5 15.2c2.7-.3 4.8 1.1 5.5 3.8"/></svg>;
}

function factIcon(kind: "business" | "location" | "role" | "showcase") {
  if (kind === "location") return <svg viewBox="0 0 24 24"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>;
  if (kind === "role") return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5"/></svg>;
  if (kind === "showcase") return <svg viewBox="0 0 24 24"><path d="M7 4.5h10v15L12 16l-5 3.5v-15Z"/></svg>;
  return <svg viewBox="0 0 24 24"><path d="M5 8.5 12 4l7 4.5V19H5V8.5Z"/><path d="M9 19v-6h6v6"/></svg>;
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
  const searchParams = useSearchParams();
  const id = Number(params?.id || 0);
  const requestedTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = tabs.some(([key]) => key === requestedTab) ? requestedTab! : "overview";
  const requestedSection = searchParams.get("section") as ProfileSection | null;
  const activeProfileSection: ProfileSection = requestedSection === "info" ? "info" : "resume";

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
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={dealerStyles.page} dir="rtl">
      <div className={dealerStyles.shell}>
        <header className={dealerStyles.appBar}>
          <Link href="/account" className={dealerStyles.backButton} aria-label="بازگشت">←</Link>
          <Link href="/" className={dealerStyles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
          <span className={dealerStyles.appBarSpacer} aria-hidden="true" />
        </header>

        {loading ? <section className={styles.state}>در حال دریافت کسب‌وکار…</section> : null}
        {error ? <div className={dealerStyles.error}>{error}</div> : null}
        {notice ? <div className={dealerStyles.notice}>{notice}</div> : null}

        {!loading && activity ? (
          <>
            <section className={dealerStyles.businessHero}>
              <div className={dealerStyles.heroCopy}>
                <span className={dealerStyles.heroEyebrow}>پنل {label(activity.type)}</span>
                <h1>{activity.name}</h1>
                <p>{[activity.city, activity.province].filter(Boolean).join("، ") || "موقعیت مجموعه را تکمیل کنید"}</p>
                <div className={dealerStyles.roleLine}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5"/></svg>
                  <span>نقش شما: {accessLabel(activity.access_role)}</span>
                </div>
              </div>
              <div className={dealerStyles.dealerAvatar} aria-hidden="true">{activityIcon(activity.type)}</div>
              <div className={dealerStyles.heroBadges}>
                <span className={dealerStyles.neutralBadge}>حساب کسب‌وکار</span>
                {activity.can_manage ? <span className={dealerStyles.activeBadge}>دسترسی مدیریت</span> : null}
              </div>
            </section>

            <div className={orderStyles.overviewDeck} aria-label="دسترسی‌های اصلی مجموعه">
              <BusinessWalletCard
                accountName={activity.name}
                accountType={activity.type}
                activityId={activity.id}
                role={activity.access_role}
                compact
              />

              {activity.can_manage ? (
                <>
                  <section className={`${styles.promoteCard} ${orderStyles.promoteTile}`}>
                    <div className={styles.promoteIcon} aria-hidden="true">✦</div>
                    <div className={styles.promoteCopy}>
                      <span>تبلیغ در صفحه اول</span>
                      <h2>جایگاه ویژه</h2>
                      <p>این مجموعه را در بخش‌های منتخب و پربازدید چاکود برجسته‌تر نمایش بده.</p>
                    </div>
                    <Link href="/account/selected" className={`${styles.promoteButton} ${orderStyles.promoteAction}`}>ورود به جایگاه ویژه</Link>
                  </section>

                  <section className={`${styles.promoteCard} ${orderStyles.promoteTile} ${orderStyles.storyTile}`}>
                    <div className={styles.promoteIcon} aria-hidden="true">▣</div>
                    <div className={styles.promoteCopy}>
                      <span>انتشار و اشتراک‌گذاری</span>
                      <h2>دبل استوری</h2>
                      <p>برای معرفی سریع‌تر مجموعه و خدمات، استوری‌های چاکود را از همین حساب مدیریت کن.</p>
                    </div>
                    <Link href="/account/stories" className={`${styles.promoteButton} ${orderStyles.promoteAction}`}>ساخت دبل استوری</Link>
                  </section>
                </>
              ) : null}
            </div>

            <nav className={dealerStyles.tabs} aria-label="بخش‌های پنل کسب‌وکار">
              {tabs.map(([key, title]) => (
                <Link
                  key={key}
                  href={`?tab=${key}`}
                  className={activeTab === key ? dealerStyles.activeTab : ""}
                  aria-current={activeTab === key ? "page" : undefined}
                >
                  {tabIcon(key)}
                  <span>{title}</span>
                </Link>
              ))}
            </nav>

            {activeTab === "overview" ? (
              <>
                <section className={`${dealerStyles.statGrid} ${orderStyles.factGrid}`} aria-label="خلاصه مجموعه">
                  <article>
                    <span className={dealerStyles.statIcon}>{factIcon("business")}</span>
                    <div><small>نوع مجموعه</small><strong>{label(activity.type)}</strong></div>
                  </article>
                  <article>
                    <span className={dealerStyles.statIcon}>{factIcon("location")}</span>
                    <div><small>موقعیت</small><strong>{activity.city || "تکمیل نشده"}</strong></div>
                  </article>
                  <article>
                    <span className={dealerStyles.statIcon}>{factIcon("role")}</span>
                    <div><small>نقش شما</small><strong>{accessLabel(activity.access_role)}</strong></div>
                  </article>
                  <article>
                    <span className={dealerStyles.statIcon}>{factIcon("showcase")}</span>
                    <div><small>ویترین مجموعه</small><strong>{activity.is_owner ? "قابل مدیریت" : "مشاهده"}</strong></div>
                  </article>
                </section>

                <section className={dealerStyles.actionCard}>
                  <Link href="/account/showcase" className={dealerStyles.primaryAction}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                    <span>مدیریت کارت روز</span>
                  </Link>
                </section>

                <section className={`${dealerStyles.statusCard} ${orderStyles.managementCard}`}>
                  <div className={dealerStyles.statusHead}>
                    <div>
                      <span>مرکز مدیریت مجموعه</span>
                      <h2>همه ابزارهای اصلی در همین پنل</h2>
                    </div>
                    <span className={orderStyles.managementIcon}>✓</span>
                  </div>
                  <div className={orderStyles.managementLinks}>
                    {activity.is_owner ? <Link href="?tab=showcase&section=resume">رزومه و آلبوم</Link> : null}
                    {activity.can_manage ? <Link href="?tab=showcase&section=info">اطلاعات مجموعه</Link> : null}
                    <Link href="?tab=team">تیم و دسترسی‌ها</Link>
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === "showcase" ? (
              <section className={orderStyles.tabPanel}>
                <div className={orderStyles.profileTabs}>
                  {activity.is_owner ? (
                    <Link
                      href="?tab=showcase&section=resume"
                      className={activeProfileSection === "resume" ? orderStyles.profileTabActive : ""}
                    >رزومه و آلبوم</Link>
                  ) : null}
                  {activity.can_manage ? (
                    <Link
                      href="?tab=showcase&section=info"
                      className={activeProfileSection === "info" || !activity.is_owner ? orderStyles.profileTabActive : ""}
                    >اطلاعات مجموعه</Link>
                  ) : null}
                </div>

                {activity.is_owner && activeProfileSection === "resume" ? (
                  <BusinessResumeEditor activityId={activity.id} activityName={activity.name} />
                ) : null}

                {activity.can_manage && (activeProfileSection === "info" || !activity.is_owner) ? (
                  <section className={styles.card} id="business-info">
                    <div className={styles.sectionTitle}>
                      <span>اطلاعات مجموعه</span>
                      <h2>ویرایش اطلاعات پایه</h2>
                    </div>
                    <label><span>نام مجموعه</span><input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></label>
                    <label><span>شماره تماس</span><input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} inputMode="tel" /></label>
                    <div className={styles.twoCols}>
                      <label><span>استان</span><select value={form.province} onChange={(e) => void changeProvince(e.target.value)}><option value="">انتخاب استان</option>{provinces.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                      <label><span>شهر</span><select value={form.city} disabled={!form.province} onChange={(e) => void changeCity(e.target.value)}><option value="">انتخاب شهر</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    </div>
                    {hasNeighborhoods ? <label><span>محله</span><select value={form.neighborhood} onChange={(e) => setForm((current) => ({ ...current, neighborhood: e.target.value }))}><option value="">انتخاب محله</option>{neighborhoods.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
                    <label><span>آدرس</span><textarea value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} /></label>
                    <button type="button" disabled={saving || form.name.trim().length < 2 || !form.province || !form.city} onClick={() => void save()}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button>
                  </section>
                ) : null}

                {activity.is_owner && activeProfileSection === "info" ? (
                  <section className={styles.dangerZone}>
                    <span>تنظیمات حساب کسب‌وکار</span>
                    <Link href={`/account-v2/business-delete?activity_id=${activity.id}`}>درخواست حذف با کد تأیید</Link>
                  </section>
                ) : null}
              </section>
            ) : null}

            {activeTab === "team" ? (
              <section className={orderStyles.tabPanel}>
                <BusinessTeamPanel activityId={activity.id} />
              </section>
            ) : null}
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
