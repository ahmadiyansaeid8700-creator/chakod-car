"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  subscription?: {
    status: string;
    service_key: string;
    starts_at?: string | null;
    expires_at?: string | null;
  } | null;
};

type TabKey = "overview" | "listings" | "team" | "info" | "finance";

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

const memberStatusLabels: Record<string, string> = {
  active: "فعال",
  invited: "دعوت‌شده",
  disabled: "غیرفعال",
  removed: "حذف دسترسی",
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

const tabItems: Array<[TabKey, string]> = [
  ["overview", "نمای کلی"],
  ["listings", "آگهی‌ها"],
  ["team", "تیم"],
  ["info", "اطلاعات"],
  ["finance", "مالی"],
];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
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
  return `${value.slice(0, 4)}••••${value.slice(-3)}`;
}

function Icon({ name }: { name: "car" | "eye" | "bookmark" | "team" | "plus" | "shield" | "list" | "building" | "clock" | "media" | "wallet" | "chevron" | "profile" }) {
  const paths = {
    car: <><path d="M5 15.5h14l-1.4-5H6.4l-1.4 5Z"/><path d="M7 10.5 8.4 7h7.2l1.4 3.5M6.5 15.5V19M17.5 15.5V19"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></>,
    eye: <><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"/><circle cx="12" cy="12" r="2.3"/></>,
    bookmark: <path d="M7 4.5h10v15L12 16l-5 3.5v-15Z"/>,
    team: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3.8 19c.5-3.2 2.5-5 5.2-5s4.7 1.8 5.2 5M14.5 15.2c2.7-.3 4.8 1.1 5.5 3.8"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    shield: <><path d="M12 3.5 19 7v5c0 4-2.5 6.8-7 8.5C7.5 18.8 5 16 5 12V7l7-3.5Z"/><path d="m9 12 2 2 4-4"/></>,
    list: <><path d="M8 6h11M8 12h11M8 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></>,
    building: <><path d="M5 20V6l7-3v17M12 9h7v11M8 8h1M8 12h1M8 16h1M15 12h1M15 16h1"/></>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    media: <><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m6 17 4-4 3 3 2-2 3 3"/></>,
    wallet: <><path d="M4 7.5h14a2 2 0 0 1 2 2v8.5H6a2 2 0 0 1-2-2V7.5Z"/><path d="M4 8V6a2 2 0 0 1 2-2h10v3.5M15 12h5"/></>,
    chevron: <path d="m14.5 6.5-5.5 5.5 5.5 5.5"/>,
    profile: <><circle cx="12" cy="8" r="3.3"/><path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function DealerCommandCenter() {
  const searchParams = useSearchParams();
  const requestedDealerId = Number(searchParams.get("dealer_id") || 0);
  const requestedTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = tabItems.some(([key]) => key === requestedTab) ? requestedTab! : "overview";

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
      if (!response.ok || !payload.success) throw new Error(payload.message || "اطلاعات مدیریتی نمایشگاه دریافت نشد.");
      setData(payload);
      if (payload.dealer?.id) setDealerId(payload.dealer.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(requestedDealerId || undefined);
  }, [requestedDealerId]);

  useEffect(() => {
    if (activeTab === "team" && searchParams.get("invite") === "1") setShowInvite(true);
  }, [activeTab, searchParams]);

  const canManageTeam = useMemo(
    () => Boolean(data?.permissions?.includes("*") || data?.permissions?.includes("team.manage")),
    [data?.permissions],
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
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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
        <section className={styles.loadingCard}><span className={styles.loader} /><strong>در حال آماده‌سازی پنل نمایشگاه…</strong></section>
      </main>
    );
  }

  if (!data?.dealer) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.loadingCard}>
          <h1>نمایشگاه پیدا نشد</h1>
          <p>{error || "این نمایشگاه به حساب شما متصل نیست."}</p>
          <Link href="/account">بازگشت به حساب</Link>
        </section>
      </main>
    );
  }

  const summary = data.summary || { total: 0, active: 0, pending: 0, inactive: 0, sold: 0, rejected: 0, views: 0, favorites: 0, expiring_soon: 0 };
  const currentDealerId = dealerId || data.dealer.id;
  const members = data.members || [];
  const mainInfoReady = Boolean(data.dealer.name && data.dealer.province && data.dealer.city);
  const verificationProgress = data.dealer.is_verified ? 100 : mainInfoReady ? 60 : 30;
  const location = [data.dealer.province, data.dealer.city].filter(Boolean).join("، ") || "محدوده ثبت نشده";

  const tabHref = (tab: TabKey, extra = "") => `/account/business?dealer_id=${currentDealerId}&tab=${tab}${extra}`;

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <div className={styles.appBar}>
          <Link href="/account" className={styles.backButton} aria-label="بازگشت به حساب">←</Link>
          <Link href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
          <span className={styles.appBarSpacer} />
        </div>

        <header className={styles.businessHero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>پنل نمایشگاه</span>
            <h1>{data.dealer.name}</h1>
            <p>{location}</p>
            <div className={styles.roleLine}><Icon name="profile" /><span>نقش شما: {roleLabels[data.role || "viewer"] || data.role || "عضو"}</span></div>
          </div>
          <div className={styles.dealerAvatar}>{data.dealer.logo_url ? <img src={data.dealer.logo_url} alt="" /> : "چ"}</div>
          <div className={styles.heroBadges}>
            <span className={data.dealer.is_verified ? styles.verifiedBadge : styles.pendingBadge}>{data.dealer.is_verified ? "تأییدشده" : "در انتظار تأیید"}</span>
            <span className={data.subscription?.status === "active" ? styles.activeBadge : styles.neutralBadge}>{data.subscription?.status === "active" ? `اشتراک تا ${formatDate(data.subscription.expires_at)}` : "اشتراک غیرفعال"}</span>
          </div>
          {(data.dealers?.length || 0) > 1 ? (
            <select className={styles.dealerSelect} value={currentDealerId} onChange={(event) => { const next = Number(event.target.value); setDealerId(next); void load(next); }}>
              {data.dealers?.map((dealer) => <option key={dealer.dealer_id} value={dealer.dealer_id}>{dealer.dealer_name}</option>)}
            </select>
          ) : null}
        </header>

        <nav className={styles.tabs} aria-label="بخش‌های نمایشگاه">
          {tabItems.map(([key, label]) => <Link key={key} href={tabHref(key)} className={activeTab === key ? styles.activeTab : ""}>{label}</Link>)}
        </nav>

        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        {activeTab === "overview" ? (
          <>
            <section className={styles.statGrid} aria-label="آمار نمایشگاه">
              <article><span className={styles.statIcon}><Icon name="car" /></span><div><small>خودروهای فعال</small><strong>{formatNumber(summary.active)}</strong><em>خودرو</em></div></article>
              <article><span className={styles.statIcon}><Icon name="eye" /></span><div><small>بازدید کل</small><strong>{formatNumber(summary.views)}</strong><em>بازدید</em></div></article>
              <article><span className={styles.statIcon}><Icon name="bookmark" /></span><div><small>نشان‌شده‌ها</small><strong>{formatNumber(summary.favorites)}</strong><em>مورد</em></div></article>
              <article><span className={styles.statIcon}><Icon name="team" /></span><div><small>اعضای تیم</small><strong>{formatNumber(members.length)}</strong><em>نفر</em></div></article>
            </section>

            <section className={styles.actionCard}>
              <Link href={`/account/listings/new?dealer_id=${currentDealerId}`} className={styles.primaryAction}><Icon name="plus" /><span>ثبت آگهی جدید</span></Link>
              {canManageTeam ? <Link href={tabHref("team", "&invite=1")} className={styles.secondaryAction}><Icon name="team" /><span>افزودن پرسنل</span></Link> : null}
            </section>

            <section className={styles.statusCard}>
              <div className={styles.statusHead}><div><span>وضعیت مجموعه</span><h2>{data.dealer.is_verified ? "نمایشگاه تأیید شده" : "در حال بررسی"}</h2></div><span className={styles.shieldBubble}><Icon name="shield" /></span></div>
              <div className={styles.progressTrack}><i style={{ width: `${verificationProgress}%` }} /></div>
              <div className={styles.progressMeta}><span>{formatNumber(verificationProgress)}٪ تکمیل</span><span>{data.dealer.is_verified ? "آماده فعالیت" : "فرآیند تأیید مجموعه"}</span></div>
              <div className={styles.statusChecks}>
                <div><span className={mainInfoReady ? styles.checkOk : styles.checkWait}>{mainInfoReady ? "✓" : "•"}</span><strong>اطلاعات اصلی</strong></div>
                <div><span className={data.dealer.is_verified ? styles.checkOk : styles.checkWait}>{data.dealer.is_verified ? "✓" : "•"}</span><strong>تأیید مجموعه</strong></div>
                <div><span className={data.subscription?.status === "active" ? styles.checkOk : styles.checkWait}>{data.subscription?.status === "active" ? "✓" : "•"}</span><strong>اشتراک خدمات</strong></div>
              </div>
            </section>

            <section className={styles.quickSection}>
              <div className={styles.sectionTitle}><h2>اقدامات سریع</h2></div>
              <div className={styles.quickList}>
                <Link href={tabHref("listings")}><span className={styles.quickIcon}><Icon name="list" /></span><span><strong>مدیریت آگهی‌ها</strong><small>موجودی و عملکرد آگهی‌های این نمایشگاه</small></span><Icon name="chevron" /></Link>
                <Link href={`/account/business/edit?dealer_id=${currentDealerId}`}><span className={styles.quickIcon}><Icon name="building" /></span><span><strong>اطلاعات نمایشگاه</strong><small>نام، آدرس و مشخصات مجموعه</small></span><Icon name="chevron" /></Link>
                <Link href={`/account/business/hours?dealer_id=${currentDealerId}`}><span className={styles.quickIcon}><Icon name="clock" /></span><span><strong>ساعات کاری</strong><small>روزها و ساعت پاسخ‌گویی</small></span><Icon name="chevron" /></Link>
                <Link href={`/account/business/media?dealer_id=${currentDealerId}`}><span className={styles.quickIcon}><Icon name="media" /></span><span><strong>رسانه‌ها</strong><small>لوگو و تصاویر نمایشگاه</small></span><Icon name="chevron" /></Link>
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "listings" ? (
          <section className={styles.contentCard}>
            <div className={styles.sectionTitleRow}><div><span>آگهی‌های نمایشگاه</span><h2>موجودی و عملکرد</h2></div><Link href={`/account/listings?dealer_id=${currentDealerId}`}>همه آگهی‌ها</Link></div>
            <div className={styles.listingSummary}>
              <div><strong>{formatNumber(summary.active)}</strong><span>فعال</span></div><div><strong>{formatNumber(summary.pending)}</strong><span>در بررسی</span></div><div><strong>{formatNumber(summary.sold)}</strong><span>فروخته</span></div><div><strong>{formatNumber(summary.expiring_soon)}</strong><span>نزدیک انقضا</span></div>
            </div>
            <div className={styles.listingCards}>
              {(data.top_listings || []).length ? data.top_listings?.map((listing) => (
                <Link href={`/account/listings/${listing.id}`} key={listing.id} className={styles.listingCard}>
                  <span className={styles.listingIcon}><Icon name="car" /></span>
                  <span><strong>{listing.title}</strong><small>{formatNumber(listing.views_count)} بازدید · {formatNumber(listing.favorite_count)} نشان‌شده</small></span>
                  <em>{listing.status}</em><Icon name="chevron" />
                </Link>
              )) : <div className={styles.empty}>هنوز آگهی‌ای برای این نمایشگاه ثبت نشده است.</div>}
            </div>
            <Link href={`/account/listings/new?dealer_id=${currentDealerId}`} className={styles.fullPrimary}><Icon name="plus" />ثبت آگهی جدید</Link>
          </section>
        ) : null}

        {activeTab === "team" ? (
          <section className={styles.contentCard}>
            <div className={styles.sectionTitleRow}><div><span>تیم نمایشگاه</span><h2>پرسنل و دسترسی‌ها</h2></div>{canManageTeam ? <button onClick={() => setShowInvite((value) => !value)}>{showInvite ? "بستن" : "+ افزودن پرسنل"}</button> : null}</div>

            {showInvite && canManageTeam ? (
              <div className={styles.inviteForm}>
                <label>شماره موبایل<input value={invite.mobile} onChange={(event) => setInvite({ ...invite, mobile: event.target.value })} placeholder="0912..." inputMode="tel" /></label>
                <label>نام نمایشی<input value={invite.display_name} onChange={(event) => setInvite({ ...invite, display_name: event.target.value })} placeholder="نام و نام خانوادگی" /></label>
                <label>عنوان شغلی<input value={invite.job_title} onChange={(event) => setInvite({ ...invite, job_title: event.target.value })} placeholder="مثلاً کارشناس فروش" /></label>
                <label>نقش<select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <div className={styles.permissionGrid}>{permissionOptions.map(([value, label]) => <label key={value} className={invite.permissions.includes(value) ? styles.checkedPermission : ""}><input type="checkbox" checked={invite.permissions.includes(value)} onChange={() => toggleInvitePermission(value)} /><span>{label}</span></label>)}</div>
                <button className={styles.primaryButton} disabled={working || !invite.mobile} onClick={() => void inviteMember()}>{working ? "در حال ثبت…" : "ثبت دعوت عضو"}</button>
              </div>
            ) : null}

            <div className={styles.memberGrid}>
              {members.length ? members.map((member) => (
                <article className={styles.memberCard} key={member.id}>
                  <div className={styles.memberTop}><span className={styles.memberAvatar}>{member.display_name?.trim().charAt(0) || "چ"}</span><div><strong>{member.display_name}</strong><small>{member.job_title || roleLabels[member.role] || "عضو تیم"}</small><small>{maskMobile(member.mobile)}</small></div><span className={`${styles.memberStatus} ${styles[`member_${member.status}`] || ""}`}>{memberStatusLabels[member.status] || member.status}</span></div>
                  <div className={styles.memberMetrics}><span><strong>{formatNumber(member.listing_count)}</strong><small>آگهی</small></span><span><strong>{formatNumber(member.sold_count)}</strong><small>فروخته</small></span><span><strong>{formatNumber(member.views_count)}</strong><small>بازدید</small></span></div>
                  <div className={styles.memberFoot}><span>{roleLabels[member.role] || member.role}</span>{canManageTeam && member.role !== "owner" ? <button onClick={() => startEdit(member)}>مدیریت دسترسی</button> : null}</div>
                </article>
              )) : <div className={styles.empty}>هنوز پرسنلی برای این نمایشگاه ثبت نشده است.</div>}
            </div>

            {editingMemberId ? (
              <div className={styles.editDrawer}>
                <div className={styles.editDrawerHeader}><h3>ویرایش دسترسی پرسنل</h3><button onClick={() => setEditingMemberId(null)}>×</button></div>
                <div className={styles.editGrid}>
                  <label>نام نمایشی<input value={String(memberDraft.display_name || "")} onChange={(event) => setMemberDraft({ ...memberDraft, display_name: event.target.value })} /></label>
                  <label>عنوان شغلی<input value={String(memberDraft.job_title || "")} onChange={(event) => setMemberDraft({ ...memberDraft, job_title: event.target.value })} /></label>
                  <label>نقش<select value={String(memberDraft.role || "sales")} onChange={(event) => setMemberDraft({ ...memberDraft, role: event.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label>وضعیت<select value={String(memberDraft.status || "active")} onChange={(event) => setMemberDraft({ ...memberDraft, status: event.target.value })}><option value="active">فعال</option><option value="disabled">غیرفعال</option><option value="removed">حذف دسترسی</option></select></label>
                </div>
                <div className={styles.permissionGrid}>{permissionOptions.map(([value, label]) => { const checked = Array.isArray(memberDraft.permissions) && memberDraft.permissions.includes(value); return <label key={value} className={checked ? styles.checkedPermission : ""}><input type="checkbox" checked={Boolean(checked)} onChange={() => toggleMemberPermission(value)} /><span>{label}</span></label>; })}</div>
                <button className={styles.primaryButton} disabled={working} onClick={() => void saveMember(editingMemberId)}>{working ? "در حال ذخیره…" : "ذخیره دسترسی"}</button>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "info" ? (
          <section className={styles.contentCard}>
            <div className={styles.sectionTitleRow}><div><span>اطلاعات نمایشگاه</span><h2>تنظیمات مجموعه</h2></div></div>
            <div className={styles.infoHero}><span className={styles.infoLogo}>{data.dealer.logo_url ? <img src={data.dealer.logo_url} alt="" /> : "چ"}</span><div><strong>{data.dealer.name}</strong><small>{location}</small><span>{data.dealer.is_verified ? "نمایشگاه تأییدشده" : "در انتظار تأیید"}</span></div></div>
            <div className={styles.quickList}>
              <Link href={`/account/business/edit?dealer_id=${currentDealerId}`}><span className={styles.quickIcon}><Icon name="building" /></span><span><strong>اطلاعات اصلی</strong><small>نام، آدرس، تماس و مشخصات نمایشگاه</small></span><Icon name="chevron" /></Link>
              <Link href={`/account/business/hours?dealer_id=${currentDealerId}`}><span className={styles.quickIcon}><Icon name="clock" /></span><span><strong>ساعات کاری</strong><small>تنظیم روزها و زمان پاسخ‌گویی</small></span><Icon name="chevron" /></Link>
              <Link href={`/account/business/media?dealer_id=${currentDealerId}`}><span className={styles.quickIcon}><Icon name="media" /></span><span><strong>لوگو و رسانه‌ها</strong><small>تصاویر و هویت بصری نمایشگاه</small></span><Icon name="chevron" /></Link>
              <Link href={`/account/business/portfolio?dealer_id=${currentDealerId}`}><span className={styles.quickIcon}><Icon name="car" /></span><span><strong>نمونه‌کارها</strong><small>محتوای معرفی و سابقه مجموعه</small></span><Icon name="chevron" /></Link>
            </div>
          </section>
        ) : null}

        {activeTab === "finance" ? (
          <section className={styles.contentCard}>
            <div className={styles.sectionTitleRow}><div><span>مالی نمایشگاه</span><h2>هزینه‌ها و خدمات</h2></div><Link href="/account/services">خدمات</Link></div>
            {data.finance ? (
              <div className={styles.financeGrid}>
                <article><span>هزینه ۳۰ روز اخیر</span><strong>{formatToman(data.finance.spend_30d)}</strong></article>
                <article><span>کل هزینه ثبت‌شده</span><strong>{formatToman(data.finance.total_spend)}</strong></article>
                <article><span>پرداخت‌های موفق</span><strong>{formatNumber(data.finance.paid_orders)}</strong><small>سفارش</small></article>
              </div>
            ) : <div className={styles.empty}>اطلاعات مالی برای سطح دسترسی فعلی در دسترس نیست.</div>}
            <div className={styles.quickList}>
              <Link href="/account/services"><span className={styles.quickIcon}><Icon name="wallet" /></span><span><strong>خدمات و اشتراک</strong><small>خرید و مدیریت خدمات نمایشگاه</small></span><Icon name="chevron" /></Link>
              <Link href="/account/payments"><span className={styles.quickIcon}><Icon name="wallet" /></span><span><strong>پرداخت‌ها</strong><small>سوابق پرداخت و سفارش‌ها</small></span><Icon name="chevron" /></Link>
            </div>
          </section>
        ) : null}

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
