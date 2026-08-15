"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import {
  ACTIVE_ACCOUNT_EVENT,
  readActiveAccount,
  type ActiveAccountSelection,
} from "../../lib/active-account";
import {
  buildDailyCard,
  formatPersianCardDate,
  getIdentityInitials,
} from "../../lib/daily-card";
import styles from "./page.module.css";

type ImageValue = string | { url?: string | null; image_url?: string | null } | null;

type User = {
  id?: string | number;
  mobile?: string;
  full_name?: string | null;
  display_name?: string | null;
  business_name?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  logo_url?: string | null;
  photo_url?: string | null;
  avatar?: ImageValue;
  profile_image?: ImageValue;
};

type MeResponse = {
  success?: boolean;
  user?: User | null;
  message?: string;
};

type AccountActivity = {
  id: number;
  type: string;
  name: string;
  external_dealer_id?: number | null;
  logo_url?: string | null;
};

type AccountMembership = {
  type: string;
  name: string;
  external_dealer_id?: number | null;
  role?: string;
  logo_url?: string | null;
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: AccountActivity[];
  memberships?: AccountMembership[];
};

type CardCssVariables = CSSProperties & Record<`--${string}`, string>;

type ResolvedCardIdentity = {
  key: string;
  name: string;
  label: string;
  logo: string;
};

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function readCachedUser() {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem("chakod_user");
    return cached ? (JSON.parse(cached) as User) : null;
  } catch {
    return null;
  }
}

function displayName(user: User | null) {
  return user?.display_name?.trim()
    || user?.full_name?.trim()
    || user?.business_name?.trim()
    || "حساب چاکود";
}

function imageFromValue(value?: ImageValue) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return value.url?.trim() || value.image_url?.trim() || "";
}

function identityImage(user: User | null) {
  if (!user) return "";
  return user.avatar_url?.trim()
    || user.profile_image_url?.trim()
    || user.logo_url?.trim()
    || user.photo_url?.trim()
    || imageFromValue(user.avatar)
    || imageFromValue(user.profile_image);
}

function accountLabel(type: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}

function resolveCardIdentity(
  selection: ActiveAccountSelection,
  user: User | null,
  activities: AccountActivity[],
  memberships: AccountMembership[],
): ResolvedCardIdentity {
  const personalName = displayName(user);
  const personalLogo = identityImage(user);
  const userKey = String(user?.id || user?.mobile || personalName);

  if (selection.kind === "activity") {
    const current = activities.find((item) => item.id === selection.id);
    const name = current?.name?.trim() || selection.name.trim() || personalName;
    const type = current?.type || selection.type;
    return {
      key: `${userKey}|activity:${selection.id}:${type}`,
      name,
      label: accountLabel(type),
      logo: current?.logo_url?.trim() || selection.logo_url?.trim() || personalLogo,
    };
  }

  if (selection.kind === "membership") {
    const current = memberships.find((item) => Number(item.external_dealer_id || 0) === selection.external_dealer_id);
    const name = current?.name?.trim() || selection.name.trim() || personalName;
    const type = current?.type || selection.type;
    return {
      key: `${userKey}|membership:${selection.external_dealer_id}:${type}`,
      name,
      label: accountLabel(type),
      logo: current?.logo_url?.trim() || selection.logo_url?.trim() || personalLogo,
    };
  }

  return {
    key: `${userKey}|personal`,
    name: personalName,
    label: "حساب شخصی",
    logo: personalLogo,
  };
}

function splitQuote(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const [lead, ...rest] = normalized.split("؛");
  const tail = rest.join("؛").trim().replace(/[.。]+$/, "");
  return {
    lead: lead.trim(),
    tail,
  };
}

export default function DailyCardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<ActiveAccountSelection>({ kind: "personal" });
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const syncActiveAccount = () => setActiveAccount(readActiveAccount());
    syncActiveAccount();
    window.addEventListener(ACTIVE_ACCOUNT_EVENT, syncActiveAccount);
    window.addEventListener("storage", syncActiveAccount);
    return () => {
      window.removeEventListener(ACTIVE_ACCOUNT_EVENT, syncActiveAccount);
      window.removeEventListener("storage", syncActiveAccount);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const cached = readCachedUser();
    if (cached) setUser(cached);

    void Promise.allSettled([
      fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      }).then(async (response) => {
        const result = (await response.json().catch(() => null)) as MeResponse | null;
        if (ignore) return;
        if (response.ok && result?.success && result.user) {
          setUser(result.user);
          localStorage.setItem("chakod_user", JSON.stringify(result.user));
          setError("");
          return;
        }
        if (!cached) setError(result?.message || "برای دیدن کارت روز، وارد حساب چاکود شو.");
      }),
      fetch("/api/auth/account-activities", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      }).then(async (response) => {
        const result = (await response.json().catch(() => null)) as ActivitiesResponse | null;
        if (ignore || !response.ok || !result?.success) return;
        setActivities(Array.isArray(result.activities) ? result.activities : []);
        setMemberships(Array.isArray(result.memberships) ? result.memberships : []);
      }),
    ]).finally(() => {
      if (!ignore) setLoading(false);
    });

    return () => { ignore = true; };
  }, []);

  const identity = useMemo(
    () => resolveCardIdentity(activeAccount, user, activities, memberships),
    [activeAccount, user, activities, memberships],
  );
  const recipe = useMemo(() => buildDailyCard(identity.key, today), [identity.key, today]);
  const quote = useMemo(() => splitQuote(recipe.quote), [recipe.quote]);
  const dateLabel = useMemo(() => formatPersianCardDate(today), [today]);
  const initials = getIdentityInitials(identity.name);

  const cardStyle: CardCssVariables = {
    "--card-background": recipe.style.background,
    "--card-foreground": recipe.style.foreground,
    "--card-accent": recipe.style.accent,
    "--card-muted": recipe.style.muted,
    "--card-line": recipe.style.line,
    "--brand-surface": recipe.style.brandSurface,
    "--glow-x": `${recipe.glowX}%`,
    "--glow-y": `${recipe.glowY}%`,
    "--motif-rotation": `${recipe.rotation}deg`,
  };

  const motifClass = [
    styles.motifOrbit,
    styles.motifRoad,
    styles.motifBeam,
    styles.motifBlocks,
  ][recipe.motif];

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span>کارت روز</span>
            <strong>امروزِ تو، آماده‌ی دیده‌شدن</strong>
          </div>
          <Link href="/" aria-label="صفحه اصلی چاکود" className={styles.homeLink}>چاکود</Link>
        </header>

        {loading && !user ? <div className={styles.state}>در حال ساخت کارت امروزت…</div> : null}

        {!loading && !user ? (
          <section className={styles.emptyState}>
            <strong>کارت روز برای حساب تو ساخته می‌شود.</strong>
            <p>{error || "برای دریافت کارت امروز وارد حساب چاکود شو."}</p>
            <Link href="/login">ورود به حساب</Link>
          </section>
        ) : null}

        {user ? (
          <>
            <article className={`${styles.card} ${motifClass}`} style={cardStyle} aria-label={`کارت روز ${identity.name}`}>
              <div className={styles.ambient} aria-hidden="true" />
              <div className={styles.motif} aria-hidden="true" />

              <div className={styles.identityRow}>
                <div className={styles.accountType}>
                  <span>کارت روز کسب‌وکار</span>
                  <strong>{identity.label}</strong>
                </div>
                <div className={styles.datePill} aria-label={`${dateLabel.weekday} ${dateLabel.date}`}>
                  <strong>{dateLabel.weekday}</strong>
                  <span>{dateLabel.date}</span>
                </div>
              </div>

              <div className={styles.quoteArea}>
                <span className={styles.quoteMark} aria-hidden="true">“</span>
                <p aria-label={recipe.quote}>
                  <span className={styles.quoteLead}>{quote.lead}</span>
                  {quote.tail ? <span className={styles.quoteTail}>{quote.tail}</span> : null}
                </p>
                <div className={styles.quoteRule} aria-hidden="true" />
              </div>

              <div className={styles.footer}>
                <div className={styles.businessSignature}>
                  <div className={styles.footerAvatar}>
                    {identity.logo ? <img src={identity.logo} alt="" /> : <span>{initials}</span>}
                  </div>
                  <div className={styles.businessCopy}>
                    <strong>{identity.name}</strong>
                    <small>{identity.label} عضو چاکود</small>
                  </div>
                </div>
                <div className={styles.brandWatermark} aria-label="ساخته‌شده با چاکود">
                  <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
                </div>
              </div>
            </article>

            <p className={styles.caption}>کارت بر اساس حساب یا کسب‌وکار فعال ساخته می‌شود و برای امروز ثابت می‌ماند.</p>
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
