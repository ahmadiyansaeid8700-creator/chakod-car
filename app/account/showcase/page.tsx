"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
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

type CardCssVariables = CSSProperties & Record<`--${string}`, string>;

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

export default function DailyCardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let ignore = false;
    const cached = readCachedUser();
    if (cached) setUser(cached);

    void fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json", ...authHeaders() },
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => null)) as MeResponse | null;
        if (ignore) return;
        if (response.ok && result?.success && result.user) {
          setUser(result.user);
          localStorage.setItem("chakod_user", JSON.stringify(result.user));
          setError("");
          return;
        }
        if (!cached) setError(result?.message || "برای دیدن کارت روز، وارد حساب چاکود شو.");
      })
      .catch(() => {
        if (!ignore && !cached) setError("کارت روز الان دریافت نشد. دوباره تلاش کن.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, []);

  const name = displayName(user);
  const seedKey = String(user?.id || user?.mobile || name);
  const recipe = useMemo(() => buildDailyCard(seedKey, today), [seedKey, today]);
  const dateLabel = useMemo(() => formatPersianCardDate(today), [today]);
  const logo = identityImage(user);
  const initials = getIdentityInitials(name);

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
            <article className={`${styles.card} ${motifClass}`} style={cardStyle} aria-label={`کارت روز ${name}`}>
              <div className={styles.ambient} aria-hidden="true" />
              <div className={styles.motif} aria-hidden="true" />

              <div className={styles.identityRow}>
                <div className={styles.identity}>
                  <div className={styles.avatar}>
                    {logo ? <img src={logo} alt="" /> : <span>{initials}</span>}
                  </div>
                  <div className={styles.identityCopy}>
                    <small>کارت امروز من</small>
                    <strong>{name}</strong>
                  </div>
                </div>
                <div className={styles.datePill}>
                  <strong>{dateLabel.weekday}</strong>
                  <span>{dateLabel.date}</span>
                </div>
              </div>

              <div className={styles.quoteArea}>
                <span className={styles.quoteMark} aria-hidden="true">“</span>
                <p>{recipe.quote}</p>
                <div className={styles.quoteRule} aria-hidden="true" />
              </div>

              <div className={styles.footer}>
                <div className={styles.dailyMeta}>
                  <span>جمله امروز</span>
                  <strong>هر روز یک شروع تازه</strong>
                </div>
                <div className={styles.brandMark} aria-label="چاکود">
                  <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
                </div>
              </div>
            </article>

            <p className={styles.caption}>این کارت برای امروز ثابت می‌ماند؛ فردا جمله و فضای بصری تازه‌ای می‌گیرد.</p>
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
