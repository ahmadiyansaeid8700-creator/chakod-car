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

type Member = {
  id: number;
  auth_user_id?: number | null;
  display_name: string;
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

type VerificationResponse = {
  success?: boolean;
  message?: string;
  verification?: { status?: string } | null;
};

type ProfessionalProfileResponse = {
  success?: boolean;
  profile?: { dealer_id?: number | null; logo_url?: string | null } | null;
};

type VerificationStatus = "loading" | "unverified" | "pending" | "verified" | "rejected" | "suspended" | "unavailable";
type TabKey = "overview" | "listings" | "team";
type IconName = "car" | "eye" | "bookmark" | "team" | "plus" | "shield" | "list" | "chevron" | "profile";

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
  invited: "در انتظار قبول دعوت",
  disabled: "غیرفعال",
  removed: "حذف دسترسی",
};

const tabItems: Array<[TabKey, string, IconName]> = [
  ["overview", "نمای کلی", "shield"],
  ["listings", "آگهی‌ها", "list"],
  ["team", "تیم", "team"],
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

function Icon({ name }: { name: IconName }) {
  const paths = {
    car: <><path d="M5 15.5h14l-1.4-5H6.4l-1.4 5Z"/><path d="M7 10.5 8.4 7h7.2l1.4 3.5M6.5 15.5V19M17.5 15.5V19"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></>,
    eye: <><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"/><circle cx="12" cy="12" r="2.3"/></>,
    bookmark: <path d="M7 4.5h10v15L12 16l-5 3.5v-15Z"/>,
    team: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3.8 19c.5-3.2 2.5-5 5.2-5s4.7 1.8 5.2 5M14.5 15.2c2.7-.3 4.8 1.1 5.5 3.8"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    shield: <><path d="M12 3.5 19 7v5c0 4-2.5 6.8-7 8.5C7.5 18.8 5 16 5 12V7l7-3.5Z"/><path d="m9 12 2 2 4-4"/></>,
    list: <><path d="M8 6h11M8 12h11M8 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></>,
    chevron: <path d="m14.5 6.5-5.5 5.5 5.5 5.5"/>,
    profile: <><circle cx="12" cy="8" r="3.3"/><path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function verificationCopy(status: VerificationStatus) {
  if (status === "pending") {
    return {
      title: "مدرک شما در انتظار تأیید مدیریت است",
      body: "تا پایان بررسی مدیریت چاکود امکان دعوت پرسنل فعال نمی‌شود.",
      action: "مشاهده وضعیت مدرک",
    };
  }
  if (status === "rejected") {
    return {
      title: "مدرک مدیریت نیاز به اصلاح دارد",
      body: "برای فعال شدن افزودن پرسنل، مدرک اصلاح‌شده را بارگذاری کنید و منتظر تأیید مدیریت بمانید.",
      action: "اصلاح و بارگذاری مدرک",
    };
  }
  if (status === "suspended") {
    return {
      title: "تأیید مدیریت مجموعه متوقف شده است",
      body: "تا تعیین تکلیف پرونده توسط مدیریت چاکود، امکان افزودن پرسنل وجود ندارد.",
      action: "مشاهده پرونده",
    };
  }
  if (status === "unavailable") {
    return {
      title: "وضعیت تأیید مدیریت در دسترس نیست",
      body: "برای امنیت مجموعه، تا زمانی که وضعیت تأیید قابل بررسی نباشد افزودن پرسنل قفل می‌ماند.",
      action: "بررسی پرونده تأیید",
    };
  }
  return {
    title: "برای افزودن پرسنل ابتدا مجوز را ثبت کنید",
    body: "برای ثبت مدیریت این مجموعه، پروانه کسب یا مدرک فعالیت معتبر را بارگذاری کنید. بعد از تأیید مدیریت چاکود، افزودن پرسنل فعال می‌شود.",
    action: "بارگذاری مجوز",
  };
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
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showVerificationGate, setShowVerificationGate] = useState(false);
  const [teamVerificationStatus, setTeamVerificationStatus] = useState<VerificationStatus>("loading");
  const [invite, setInvite] = useState({ mobile: "", display_name: "", role: "sales" });
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingMemberOriginalStatus, setEditingMemberOriginalStatus] = useState("");
  const [memberDraft, setMemberDraft] = useState<Partial<Member>>({});

  async function loadTeamVerification(targetDealerId: number) {
    setTeamVerificationStatus("loading");
    try {
      const response = await fetch(`/api/auth/business-verification?dealer_id=${targetDealerId}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<VerificationResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "وضعیت تأیید مدیریت دریافت نشد.");
      const status = String(payload.verification?.status || "unverified");
      if (["pending", "verified", "rejected", "suspended"].includes(status)) {
        setTeamVerificationStatus(status as VerificationStatus);
      } else {
        setTeamVerificationStatus("unverified");
      }
    } catch {
      setTeamVerificationStatus("unavailable");
    }
  }

  async function load(targetDealerId?: number) {
    setLoading(true);
    setError("");
    setShowInvite(false);
    setShowVerificationGate(false);
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

      if (payload.dealer && !payload.dealer.logo_url) {
        try {
          const profileResponse = await fetch("/api/auth/professional-profile", {
            cache: "no-store",
            credentials: "include",
            headers: { Accept: "application/json", ...authHeaders() },
          });
          const profilePayload = await readJson<ProfessionalProfileResponse>(profileResponse);
          const profileDealerId = Number(profilePayload.profile?.dealer_id || 0);
          const sameDealer = !profileDealerId || profileDealerId === payload.dealer.id;
          if (profileResponse.ok && profilePayload.success && sameDealer && profilePayload.profile?.logo_url) {
            payload.dealer.logo_url = profilePayload.profile.logo_url;
          }
        } catch {
          // لوگوی پنل اختیاری است؛ خطای پروفایل نباید کل مرکز فرمان را از کار بیندازد.
        }
      }

      setData(payload);
      if (payload.dealer?.id) {
        setDealerId(payload.dealer.id);
        await loadTeamVerification(payload.dealer.id);
      }
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
    if (activeTab !== "team" || searchParams.get("invite") !== "1") return;
    if (teamVerificationStatus === "verified") {
      setShowVerificationGate(false);
      setShowInvite(true);
    } else if (teamVerificationStatus !== "loading") {
      setShowInvite(false);
      setShowVerificationGate(true);
    }
  }, [activeTab, searchParams, teamVerificationStatus]);

  const canManageTeam = useMemo(
    () => Boolean(data?.permissions?.includes("*") || data?.permissions?.includes("team.manage")),
    [data?.permissions],
  );

  function handleAddStaff() {
    if (showInvite) {
      setShowInvite(false);
      return;
    }
    if (teamVerificationStatus === "verified") {
      setShowVerificationGate(false);
      setShowInvite(true);
      return;
    }
    setShowInvite(false);
    setShowVerificationGate(true);
  }

  async function inviteMember() {
    if (!dealerId || teamVerificationStatus !== "verified") return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/dealer-command-center?dealer_id=${dealerId}`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "invite_member",
          dealer_id: dealerId,
          mobile: invite.mobile,
          display_name: invite.display_name,
          role: invite.role,
          status: "invited",
        }),
      });
      const payload = await readJson<{ success?: boolean; message?: string }>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "ارسال دعوت انجام نشد.");
      setNotice("دعوت ارسال شد. عضویت این شخص فقط بعد از قبول دعوت توسط خودش فعال می‌شود.");
      setInvite({ mobile: "", display_name: "", role: "sales" });
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
    setEditingMemberOriginalStatus(member.status);
    setMemberDraft({
      display_name: member.display_name,
      role: member.role,
      status: member.status,
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
      setNotice(payload.message || "اطلاعات عضو ذخیره شد.");
      setEditingMemberId(null);
      setEditingMemberOriginalStatus("");
      await load(dealerId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "خطای ناشناخته");
    } finally {
      setWorking(false);
    }
  }

  async function removeMember(member: Member) {
    if (member.role === "owner" || removingMemberId) return;
    const confirmed = window.confirm(`عضو «${member.display_name}» از تیم حذف شود؟ دسترسی او به این مجموعه قطع خواهد شد.`);
    if (!confirmed) return;

    setRemovingMemberId(member.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/dealer-command-center?dealer_id=${dealerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ dealer_id: dealerId, member_id: member.id, status: "removed" }),
      });
      const payload = await readJson<{ success?: boolean; message?: string }>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "حذف عضو انجام نشد.");
      setNotice(`«${member.display_name}» از تیم حذف شد.`);
      if (editingMemberId === member.id) {
        setEditingMemberId(null);
        setEditingMemberOriginalStatus("");
      }
      await load(dealerId);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "حذف عضو انجام نشد.");
    } finally {
      setRemovingMemberId(null);
    }
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
  const members = (data.members || []).filter((member) => member.status !== "removed");
  const mainInfoReady = Boolean(data.dealer.name && data.dealer.province && data.dealer.city);
  const verificationProgress = data.dealer.is_verified ? 100 : mainInfoReady ? 60 : 30;
  const location = [data.dealer.province, data.dealer.city].filter(Boolean).join("، ") || "محدوده ثبت نشده";
  const tabHref = (tab: TabKey) => `/account/business?dealer_id=${currentDealerId}&tab=${tab}`;
  const verificationHref = `/account-v2/verification?dealer_id=${currentDealerId}&return_to=${encodeURIComponent(tabHref("team"))}`;
  const gateCopy = verificationCopy(teamVerificationStatus);

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
          <Link
            href={`/account/business/media?dealer_id=${currentDealerId}`}
            className={styles.dealerAvatar}
            aria-label={data.dealer.logo_url ? "تغییر لوگوی نمایشگاه" : "بارگذاری لوگوی نمایشگاه"}
            title={data.dealer.logo_url ? "تغییر لوگو" : "بارگذاری لوگو"}
          >
            {data.dealer.logo_url ? <img src={data.dealer.logo_url} alt="لوگوی نمایشگاه" /> : <span>+ لوگو</span>}
          </Link>
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
          {tabItems.map(([key, label, icon]) => (
            <Link key={key} href={tabHref(key)} className={activeTab === key ? styles.activeTab : ""}>
              <Icon name={icon} />
              <span>{label}</span>
            </Link>
          ))}
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
            <div className={styles.sectionTitleRow}>
              <div><span>تیم نمایشگاه</span><h2>پرسنل</h2></div>
              {canManageTeam ? <button onClick={handleAddStaff}>{showInvite ? "بستن" : "+ افزودن پرسنل"}</button> : null}
            </div>

            {showVerificationGate && canManageTeam ? (
              <div className={styles.verificationGate}>
                <span className={styles.verificationIcon}><Icon name="shield" /></span>
                <div><strong>{gateCopy.title}</strong><p>{gateCopy.body}</p></div>
                <Link href={verificationHref}>{gateCopy.action}</Link>
              </div>
            ) : null}

            {showInvite && canManageTeam && teamVerificationStatus === "verified" ? (
              <div className={styles.inviteForm}>
                <div className={styles.inviteNotice}>دعوت برای این شماره ارسال می‌شود و عضویت فقط بعد از قبول دعوت توسط خود شخص فعال خواهد شد.</div>
                <label>شماره موبایل<input value={invite.mobile} onChange={(event) => setInvite({ ...invite, mobile: event.target.value })} placeholder="0912..." inputMode="tel" /></label>
                <label>نام نمایشی<input value={invite.display_name} onChange={(event) => setInvite({ ...invite, display_name: event.target.value })} placeholder="نام و نام خانوادگی" /></label>
                <label>نقش<select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <button className={styles.primaryButton} disabled={working || !invite.mobile} onClick={() => void inviteMember()}>{working ? "در حال ارسال…" : "ارسال دعوت"}</button>
              </div>
            ) : null}

            <div className={styles.memberGrid}>
              {members.length ? members.map((member) => (
                <article className={styles.memberCard} key={member.id}>
                  <div className={styles.memberTop}>
                    <span className={styles.memberAvatar}>{member.display_name?.trim().charAt(0) || "چ"}</span>
                    <div><strong>{member.display_name}</strong><small>{roleLabels[member.role] || "عضو تیم"}</small><small>{maskMobile(member.mobile)}</small></div>
                    <span className={`${styles.memberStatus} ${styles[`member_${member.status}`] || ""}`}>{memberStatusLabels[member.status] || member.status}</span>
                  </div>
                  <div className={styles.memberMetrics}><span><strong>{formatNumber(member.listing_count)}</strong><small>آگهی</small></span><span><strong>{formatNumber(member.sold_count)}</strong><small>فروخته</small></span><span><strong>{formatNumber(member.views_count)}</strong><small>بازدید</small></span></div>
                  {canManageTeam && member.role !== "owner" ? (
                    <div className={styles.memberFoot}>
                      <button onClick={() => startEdit(member)}>{member.status === "invited" ? "مدیریت دعوت" : "ویرایش عضو"}</button>
                      <button
                        onClick={() => void removeMember(member)}
                        disabled={removingMemberId === member.id}
                        style={{ color: "#a12b43", background: "#fff0f3", borderColor: "#f2cbd5" }}
                      >
                        {removingMemberId === member.id ? "در حال حذف…" : member.status === "invited" ? "لغو دعوت" : "حذف عضو"}
                      </button>
                    </div>
                  ) : null}
                </article>
              )) : <div className={styles.empty}>هنوز پرسنلی برای این نمایشگاه ثبت نشده است.</div>}
            </div>

            {editingMemberId ? (
              <div className={styles.editDrawer}>
                <div className={styles.editDrawerHeader}><h3>{editingMemberOriginalStatus === "invited" ? "مدیریت دعوت" : "ویرایش پرسنل"}</h3><button onClick={() => { setEditingMemberId(null); setEditingMemberOriginalStatus(""); }}>×</button></div>
                <div className={styles.editGrid}>
                  <label>نام نمایشی<input value={String(memberDraft.display_name || "")} onChange={(event) => setMemberDraft({ ...memberDraft, display_name: event.target.value })} /></label>
                  <label>نقش<select value={String(memberDraft.role || "sales")} onChange={(event) => setMemberDraft({ ...memberDraft, role: event.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label>وضعیت<select value={String(memberDraft.status || "active")} onChange={(event) => setMemberDraft({ ...memberDraft, status: event.target.value })}>
                    {editingMemberOriginalStatus === "invited" ? <><option value="invited">در انتظار قبول دعوت</option><option value="removed">لغو دعوت</option></> : <><option value="active">فعال</option><option value="disabled">غیرفعال</option><option value="removed">حذف دسترسی</option></>}
                  </select></label>
                </div>
                {editingMemberOriginalStatus === "invited" ? <div className={styles.editHint}>فعال شدن عضو دعوت‌شده از این پنل ممکن نیست؛ خود شخص باید دعوت را قبول کند.</div> : null}
                <button className={styles.primaryButton} disabled={working} onClick={() => void saveMember(editingMemberId)}>{working ? "در حال ذخیره…" : "ذخیره"}</button>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
