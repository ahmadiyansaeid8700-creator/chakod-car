"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./DealerCommandCenter.module.css";

type DealerOption = {
  dealer_id: number;
  dealer_name: string;
  role: string;
};

type Summary = {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  sold: number;
  rejected: number;
  views: number;
  favorites: number;
  expiring_soon: number;
};

type Finance = {
  total_spend: number;
  spend_30d: number;
  paid_orders: number;
};

type Member = {
  id: number;
  auth_user_id?: number | null;
  display_name: string;
  job_title?: string | null;
  mobile?: string | null;
  role: string;
  status: string;
  permissions: string[];
  listing_count: number;
  active_count: number;
  sold_count: number;
  views_count: number;
  favorite_count: number;
  last_activity_at?: string | null;
};

type Listing = {
  id: number;
  title: string;
  status: string;
  views_count: number;
  favorite_count: number;
  expires_at?: string | null;
};

type Trend = { day: string; created_count: number; views: number };

type CommandResponse = {
  success?: boolean;
  message?: string;
  dealer?: {
    id: number;
    name: string;
    logo_url?: string | null;
    province?: string | null;
    city?: string | null;
    is_verified?: boolean;
    profile_status?: string;
    business_type?: string;
  };
  dealers?: DealerOption[];
  role?: string;
  permissions?: string[];
  summary?: Summary;
  finance?: Finance | null;
  events?: Record<string, number>;
  top_listings?: Listing[];
  members?: Member[];
  trend?: Trend[];
  subscription?: {
    status: string;
    service_key: string;
    starts_at?: string | null;
    expires_at?: string | null;
  } | null;
};

const roles = [
  ["manager", "مدیر"],
  ["branch_manager", "مدیر شعبه"],
  ["sales", "کارشناس فروش"],
  ["content", "مدیر محتوا"],
  ["finance", "مالی"],
  ["viewer", "ناظر"],
] as const;

const roleLabels: Record<string, string> = {
  owner: "مالک",
  manager: "مدیر",
  branch_manager: "مدیر شعبه",
  sales: "کارشناس فروش",
  content: "مدیر محتوا",
  finance: "مالی",
  viewer: "ناظر",
};

const permissionOptions = [
  ["team.manage", "مدیریت تیم"],
  ["settings.manage", "تنظیمات مجموعه"],
  ["listings.manage", "مدیریت آگهی‌ها"],
  ["payments.view", "مشاهده پرداخت‌ها"],
  ["payments.manage", "مدیریت پرداخت‌ها"],
  ["analytics.view", "مشاهده تحلیل‌ها"],
  ["ads.manage", "مدیریت تبلیغات"],
] as const;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("پاسخ سرور معتبر نیست.");
  }
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

function formatToman(value?: number | null) {
  return `${formatNumber(value)} تومان`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function maskMobile(value?: string | null) {
  if (!value || value.length < 8) return value || "—";
  return `${value.slice(0, 4)}****${value.slice(-3)}`;
}

export default function DealerCommandCenter() {
  const [data, setData] = useState<CommandResponse | null>(null);
  const [dealerId, setDealerId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({
    mobile: "",
    display_name: "",
    job_title: "",
    role: "sales",
    permissions: ["listings.manage", "analytics.view"],
  });
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [memberDraft, setMemberDraft] = useState<Partial<Member>>({});

  async function load(targetDealerId?: number) {
    setLoading(true);
    setError("");
    try {
      const id = targetDealerId || dealerId;
      const query = id ? `?dealer_id=${id}` : "";
      const response = await fetch(`/api/auth/dealer-command-center${query}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<CommandResponse>(response);
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "اطلاعات مدیریتی نمایشگاه دریافت نشد.");
      }
      setData(payload);
      if (!dealerId && payload.dealer?.id) setDealerId(payload.dealer.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canManageTeam = useMemo(
    () => Boolean(data?.permissions?.includes("*") || data?.permissions?.includes("team.manage")),
    [data?.permissions],
  );

  const maxListingViews = useMemo(
    () => Math.max(1, ...(data?.top_listings || []).map((item) => item.views_count)),
    [data?.top_listings],
  );

  async function inviteMember() {
    if (!dealerId) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/dealer-command-center?dealer_id=${dealerId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ action: "invite_member", dealer_id: dealerId, ...invite }),
      });
      const payload = await readJson<{ success?: boolean; message?: string }>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "دعوت عضو انجام نشد.");
      setNotice(payload.message || "عضو تیم ثبت شد.");
      setInvite({ mobile: "", display_name: "", job_title: "", role: "sales", permissions: ["listings.manage", "analytics.view"] });
      setShowInvite(false);
      await load(dealerId);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "خطای ناشناخته");
    } finally {
      setWorking(false);
    }
  }

  function startEdit(member: Member) {
    setEditingMemberId(member.id);
    setMemberDraft({
      display_name: member.display_name,
      job_title: member.job_title,
      role: member.role,
      status: member.status,
      permissions: member.permissions.filter((permission) => permission !== "*"),
    });
  }

  async function saveMember(memberId: number) {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/dealer-command-center?dealer_id=${dealerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ dealer_id: dealerId, member_id: memberId, ...memberDraft }),
      });
      const payload = await readJson<{ success?: boolean; message?: string }>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "ذخیره عضو انجام نشد.");
      setNotice(payload.message || "دسترسی عضو ذخیره شد.");
      setEditingMemberId(null);
      await load(dealerId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "خطای ناشناخته");
    } finally {
      setWorking(false);
    }
  }

  function toggleInvitePermission(permission: string) {
    setInvite((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  function toggleMemberPermission(permission: string) {
    const current = Array.isArray(memberDraft.permissions) ? memberDraft.permissions : [];
    setMemberDraft((draft) => ({
      ...draft,
      permissions: current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    }));
  }

  if (loading) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.loadingCard}>
          <span className={styles.loader} />
          <h1>در حال ساخت نمای مدیریتی نمایشگاه</h1>
          <p>آگهی‌ها، تیم و شاخص‌های عملکرد در حال محاسبه‌اند.</p>
        </section>
      </main>
    );
  }

  if (!data?.dealer) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.loadingCard}>
          <h1>نمایشگاهی به حساب متصل نیست</h1>
          <p>{error || "ابتدا یک نمایشگاه را به حساب خود متصل کنید."}</p>
          <Link href="/account/business/dealers">افزودن نمایشگاه</Link>
        </section>
      </main>
    );
  }

  const summary = data.summary || {
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    sold: 0,
    rejected: 0,
    views: 0,
    favorites: 0,
    expiring_soon: 0,
  };

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <Link href="/account" className={styles.back}>← حساب من</Link>
            <div className={styles.heroActions}>
              <Link href="/account/services">خدمات و پرداخت</Link>
              <Link href="/account/business/dealers">نمایشگاه‌های من</Link>
              <Link href="/account/ads">نمایشگاه منتخب</Link>
            </div>
          </div>
          <div className={styles.identity}>
            <div className={styles.dealerAvatar}>
              {data.dealer.logo_url ? <img src={data.dealer.logo_url} alt="" /> : "چ"}
            </div>
            <div>
              <span>مرکز فرمان نمایشگاه</span>
              <h1>{data.dealer.name}</h1>
              <p>{[data.dealer.province, data.dealer.city].filter(Boolean).join("، ") || "محدوده ثبت نشده"}</p>
            </div>
            <div className={styles.heroBadges}>
              <span>{roleLabels[data.role || "viewer"] || data.role}</span>
              <span>{data.dealer.is_verified ? "تأییدشده" : "در انتظار تأیید"}</span>
              <span>{data.subscription?.status === "active" ? `اشتراک تا ${formatDate(data.subscription.expires_at)}` : "اشتراک غیرفعال"}</span>
            </div>
          </div>
          {(data.dealers?.length || 0) > 1 && (
            <select
              className={styles.dealerSelect}
              value={dealerId}
              onChange={(event) => {
                const next = Number(event.target.value);
                setDealerId(next);
                void load(next);
              }}
            >
              {data.dealers?.map((dealer) => <option key={dealer.dealer_id} value={dealer.dealer_id}>{dealer.dealer_name}</option>)}
            </select>
          )}
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        <section className={styles.statGrid}>
          <article><span>خودروهای فعال</span><strong>{formatNumber(summary.active)}</strong><small>از {formatNumber(summary.total)} آگهی</small></article>
          <article><span>فروخته‌شده</span><strong>{formatNumber(summary.sold)}</strong><small>ثبت‌شده توسط تیم</small></article>
          <article><span>بازدید کل</span><strong>{formatNumber(summary.views)}</strong><small>{formatNumber(data.events?.listing_view)} رویداد ۳۰ روز اخیر</small></article>
          <article><span>نشان‌شده‌ها</span><strong>{formatNumber(summary.favorites)}</strong><small>علاقه‌مندی کاربران</small></article>
          <article className={summary.expiring_soon ? styles.warningStat : ""}><span>نزدیک انقضا</span><strong>{formatNumber(summary.expiring_soon)}</strong><small>تا ۷ روز آینده</small></article>
        </section>

        <section className={styles.dashboardGrid}>
          <article className={styles.panel}>
            <header><div><span>عملکرد موجودی</span><h2>آگهی‌های پربازدید</h2></div><Link href="/account/listings">همه آگهی‌ها</Link></header>
            <div className={styles.rankingList}>
              {(data.top_listings || []).length ? data.top_listings?.map((listing, index) => (
                <div className={styles.rankingRow} key={listing.id}>
                  <b>{formatNumber(index + 1)}</b>
                  <div className={styles.rankingBody}>
                    <div><strong>{listing.title}</strong><span>{formatNumber(listing.views_count)} بازدید · {formatNumber(listing.favorite_count)} ذخیره</span></div>
                    <i style={{ width: `${Math.max(6, (listing.views_count / maxListingViews) * 100)}%` }} />
                  </div>
                  <small>{listing.status}</small>
                </div>
              )) : <div className={styles.empty}>هنوز داده‌ای برای تحلیل آگهی‌ها وجود ندارد.</div>}
            </div>
          </article>

          <aside className={styles.sideStack}>
            <article className={styles.panel}>
              <header><div><span>تعامل مشتری</span><h2>۳۰ روز اخیر</h2></div></header>
              <div className={styles.miniStats}>
                <div><strong>{formatNumber(data.events?.contact_click)}</strong><span>کلیک تماس</span></div>
                <div><strong>{formatNumber(data.events?.whatsapp_click)}</strong><span>واتساپ</span></div>
                <div><strong>{formatNumber(data.events?.save)}</strong><span>ذخیره</span></div>
              </div>
            </article>
            {data.finance && (
              <article className={`${styles.panel} ${styles.financePanel}`}>
                <header><div><span>هزینه تبلیغات</span><h2>کنترل مالی</h2></div><Link href="/account/services">جزئیات</Link></header>
                <strong>{formatToman(data.finance.spend_30d)}</strong>
                <p>هزینه ۳۰ روز اخیر؛ مجموع پرداخت موفق {formatNumber(data.finance.paid_orders)} سفارش است.</p>
                <small>کل هزینه ثبت‌شده: {formatToman(data.finance.total_spend)}</small>
              </article>
            )}
          </aside>
        </section>

        <section className={styles.panel}>
          <header className={styles.teamHeader}>
            <div><span>ساختار سازمانی</span><h2>تیم نمایشگاه</h2><p>هر عضو با شماره خودش وارد می‌شود، اما فعالیت عمومی با نام نمایشگاه ثبت می‌شود.</p></div>
            {canManageTeam && <button onClick={() => setShowInvite((value) => !value)}>{showInvite ? "بستن فرم" : "+ افزودن پرسنل"}</button>}
          </header>

          {showInvite && canManageTeam && (
            <div className={styles.inviteForm}>
              <label>شماره موبایل<input value={invite.mobile} onChange={(event) => setInvite({ ...invite, mobile: event.target.value })} placeholder="0912..." inputMode="tel" /></label>
              <label>نام نمایشی<input value={invite.display_name} onChange={(event) => setInvite({ ...invite, display_name: event.target.value })} placeholder="نام و نام خانوادگی" /></label>
              <label>عنوان شغلی<input value={invite.job_title} onChange={(event) => setInvite({ ...invite, job_title: event.target.value })} placeholder="مثلاً کارشناس فروش" /></label>
              <label>نقش<select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}>{roles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <div className={styles.permissionGrid}>
                {permissionOptions.map(([value,label]) => (
                  <label key={value} className={invite.permissions.includes(value) ? styles.checkedPermission : ""}>
                    <input type="checkbox" checked={invite.permissions.includes(value)} onChange={() => toggleInvitePermission(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <button className={styles.primaryButton} disabled={working || !invite.mobile} onClick={() => void inviteMember()}>{working ? "در حال ثبت..." : "ثبت دعوت عضو"}</button>
            </div>
          )}

          <div className={styles.teamTableWrap}>
            <table className={styles.teamTable}>
              <thead><tr><th>پرسنل</th><th>نقش</th><th>آگهی</th><th>فروخته</th><th>بازدید</th><th>وضعیت</th><th /></tr></thead>
              <tbody>
                {(data.members || []).map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.display_name}</strong><small>{member.job_title || maskMobile(member.mobile)}</small></td>
                    <td>{roleLabels[member.role] || member.role}</td>
                    <td>{formatNumber(member.listing_count)}</td>
                    <td>{formatNumber(member.sold_count)}</td>
                    <td>{formatNumber(member.views_count)}</td>
                    <td><span className={`${styles.memberStatus} ${styles[`member_${member.status}`] || ""}`}>{member.status}</span></td>
                    <td>{canManageTeam && member.role !== "owner" && <button className={styles.editButton} onClick={() => startEdit(member)}>مدیریت</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingMemberId && (
            <div className={styles.editDrawer}>
              <div className={styles.editDrawerHeader}><h3>ویرایش دسترسی پرسنل</h3><button onClick={() => setEditingMemberId(null)}>×</button></div>
              <div className={styles.editGrid}>
                <label>نام نمایشی<input value={String(memberDraft.display_name || "")} onChange={(event) => setMemberDraft({ ...memberDraft, display_name: event.target.value })} /></label>
                <label>عنوان شغلی<input value={String(memberDraft.job_title || "")} onChange={(event) => setMemberDraft({ ...memberDraft, job_title: event.target.value })} /></label>
                <label>نقش<select value={String(memberDraft.role || "sales")} onChange={(event) => setMemberDraft({ ...memberDraft, role: event.target.value })}>{roles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                <label>وضعیت<select value={String(memberDraft.status || "active")} onChange={(event) => setMemberDraft({ ...memberDraft, status: event.target.value })}><option value="active">فعال</option><option value="disabled">غیرفعال</option><option value="removed">حذف دسترسی</option></select></label>
              </div>
              <div className={styles.permissionGrid}>
                {permissionOptions.map(([value,label]) => {
                  const checked = Array.isArray(memberDraft.permissions) && memberDraft.permissions.includes(value);
                  return <label key={value} className={checked ? styles.checkedPermission : ""}><input type="checkbox" checked={Boolean(checked)} onChange={() => toggleMemberPermission(value)} /><span>{label}</span></label>;
                })}
              </div>
              <button className={styles.primaryButton} disabled={working} onClick={() => void saveMember(editingMemberId)}>{working ? "در حال ذخیره..." : "ذخیره دسترسی"}</button>
            </div>
          )}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
