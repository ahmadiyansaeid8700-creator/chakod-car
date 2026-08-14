"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type Activity = {
  id: number;
  type: string;
  name: string;
};

type Membership = {
  type: string;
  name: string;
};

type Listing = {
  id: number;
  title?: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  cover_image?: { image_url?: string } | null;
  status?: { code?: string };
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: Activity[];
  memberships?: Membership[];
};

type ListingsResponse = {
  success?: boolean;
  data?: Listing[];
  pagination?: { total?: number };
};

type ShowcaseTheme = {
  id: "luxury" | "sales" | "performance";
  name: string;
  eyebrow: string;
  kicker: string;
  canvasStart: string;
  canvasMid: string;
  canvasEnd: string;
  accent: string;
  softAccent: string;
  darkOverlay: string;
};

const THEMES: ShowcaseTheme[] = [
  {
    id: "luxury",
    name: "لوکس",
    eyebrow: "PRIVATE SHOWCASE",
    kicker: "انتخاب‌های خاص من",
    canvasStart: "#070707",
    canvasMid: "#211607",
    canvasEnd: "#9a671d",
    accent: "#f4d58d",
    softAccent: "#fff0bd",
    darkOverlay: "rgba(5,4,2,.91)",
  },
  {
    id: "sales",
    name: "فروش",
    eyebrow: "HOT DROP",
    kicker: "ویترین فروش من",
    canvasStart: "#25040c",
    canvasMid: "#8c1134",
    canvasEnd: "#fb4165",
    accent: "#ffe0e7",
    softAccent: "#fff1f4",
    darkOverlay: "rgba(35,4,13,.92)",
  },
  {
    id: "performance",
    name: "عملکرد",
    eyebrow: "MY PERFORMANCE",
    kicker: "عملکرد امروز من",
    canvasStart: "#031522",
    canvasMid: "#075985",
    canvasEnd: "#06b6d4",
    accent: "#a5f3fc",
    softAccent: "#ecfeff",
    darkOverlay: "rgba(2,20,31,.91)",
  },
];

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatPrice(value: Listing["price_toman"]) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "قیمت توافقی";
  if (amount >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(amount / 1_000_000_000)} میلیارد`;
  }
  if (amount >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(amount / 1_000_000)} میلیون`;
  }
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`;
}

function activityLabel(type: string) {
  if (type === "dealer") return "نمایشگاه";
  if (type === "parts_store") return "لوازم یدکی";
  if (type === "repair_shop") return "تعمیرگاه";
  if (type === "car_service") return "خدمات خودرو";
  return "کسب‌وکار";
}

function shortTitle(listing: Listing) {
  return listing.title || [listing.brand, listing.model, listing.year].filter(Boolean).join(" ") || "آگهی فعال";
}

function todayLabel() {
  try {
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" }).format(new Date());
  } catch {
    return "امروز";
  }
}

function loadCanvasImage(src?: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, x: number, y: number, width: number, height: number, radius: number) {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.save();
  ctx.clip();
  if (image) {
    const scale = Math.max(width / image.width, height / image.height);
    const renderedWidth = image.width * scale;
    const renderedHeight = image.height * scale;
    ctx.drawImage(
      image,
      x + (width - renderedWidth) / 2,
      y + (height - renderedHeight) / 2,
      renderedWidth,
      renderedHeight,
    );
  } else {
    const placeholder = ctx.createLinearGradient(x, y, x + width, y + height);
    placeholder.addColorStop(0, "#f5f3ff");
    placeholder.addColorStop(1, "#ddd6fe");
    ctx.fillStyle = placeholder;
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}

export default function ShowcasePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);
  const [themeIndex, setThemeIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareLabel, setShareLabel] = useState("اشتراک‌گذاری ویترین");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const headers = { Accept: "application/json", ...authHeaders() };
        const [activitiesResponse, listingsResponse] = await Promise.all([
          fetch("/api/auth/account-activities", { credentials: "include", cache: "no-store", headers }),
          fetch("/api/auth/dashboard-listings?page=1&per_page=3&status=active&owner=all", { credentials: "include", cache: "no-store", headers }),
        ]);
        const activitiesPayload = (await activitiesResponse.json().catch(() => null)) as ActivitiesResponse | null;
        const listingsPayload = (await listingsResponse.json().catch(() => null)) as ListingsResponse | null;

        if (!activitiesResponse.ok && !listingsResponse.ok) throw new Error("برای دیدن ویترینت وارد حساب چاکود شو.");
        if (ignore) return;

        if (activitiesResponse.ok && activitiesPayload?.success) {
          setActivities(Array.isArray(activitiesPayload.activities) ? activitiesPayload.activities : []);
          setMemberships(Array.isArray(activitiesPayload.memberships) ? activitiesPayload.memberships : []);
        }
        if (listingsResponse.ok && listingsPayload?.success) {
          const active = Array.isArray(listingsPayload.data)
            ? listingsPayload.data.filter((item) => String(item.status?.code || "").toLowerCase() === "active")
            : [];
          setListings(active.slice(0, 3));
          setActiveTotal(Number(listingsPayload.pagination?.total || active.length));
        }
      } catch (caught) {
        if (!ignore) setError(caught instanceof Error ? caught.message : "ویترین دریافت نشد.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => { ignore = true; };
  }, []);

  const businesses = useMemo(() => {
    const items = new Map<string, string>();
    activities.forEach((item) => {
      if (item.name) items.set(`${item.type}:${item.name}`, `${item.name} · ${activityLabel(item.type)}`);
    });
    memberships.forEach((item) => {
      if (item.name) items.set(`${item.type}:${item.name}`, `${item.name} · ${activityLabel(item.type)}`);
    });
    return Array.from(items.values());
  }, [activities, memberships]);

  const theme = THEMES[themeIndex];
  const heroMetric = activeTotal > 0 ? activeTotal : businesses.length;
  const heroMetricLabel = activeTotal > 0 ? "آگهی فعال" : "هویت حرفه‌ای";
  const firstListing = listings[0];
  const secondaryListings = listings.slice(1, 3);

  const themeHeadline = theme.id === "luxury"
    ? firstListing
      ? "انتخاب‌هایی که این روزها با افتخار نمایش می‌دم"
      : "اعتبار حرفه‌ای من، یک‌جا"
    : theme.id === "sales"
      ? firstListing
        ? "تازه‌های فروش من؛ آماده‌ی دیده‌شدن"
        : "ویترین من آماده‌ی فروشه"
      : activeTotal > 0
        ? "امروز ویترین من روی فرم است"
        : "عملکرد حرفه‌ای من در چاکود";

  const themeClass = theme.id === "luxury"
    ? styles.themeLuxury
    : theme.id === "sales"
      ? styles.themeSales
      : styles.themePerformance;

  function moveTheme(direction: number) {
    setThemeIndex((current) => (current + direction + THEMES.length) % THEMES.length);
  }

  function handleTouchEnd(clientX: number) {
    if (touchStartX === null) return;
    const distance = clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(distance) < 42) return;
    moveTheme(distance < 0 ? 1 : -1);
  }

  async function createShareFile() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const background = ctx.createLinearGradient(1080, 0, 0, 1920);
    background.addColorStop(0, theme.canvasStart);
    background.addColorStop(0.52, theme.canvasMid);
    background.addColorStop(1, theme.canvasEnd);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1920);

    const glow = ctx.createRadialGradient(920, 140, 20, 920, 140, 460);
    glow.addColorStop(0, theme.id === "luxury" ? "rgba(244,213,141,.24)" : "rgba(255,255,255,.23)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(470, 0, 610, 620);

    ctx.globalAlpha = theme.id === "sales" ? 0.12 : 0.08;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.arc(60, 1780, 190 + index * 54, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = theme.accent;
    ctx.font = "900 25px sans-serif";
    ctx.fillText(theme.eyebrow, 950, 108);
    ctx.fillStyle = "rgba(255,255,255,.68)";
    ctx.font = "800 24px sans-serif";
    ctx.fillText(todayLabel(), 950, 152);

    roundedRect(ctx, 735, 195, 215, 54, 27);
    ctx.fillStyle = theme.id === "luxury" ? "rgba(244,213,141,.15)" : "rgba(255,255,255,.14)";
    ctx.fill();
    ctx.strokeStyle = theme.id === "luxury" ? "rgba(244,213,141,.45)" : "rgba(255,255,255,.28)";
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.font = "900 22px sans-serif";
    ctx.fillText(theme.kicker, 920, 231);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 64px sans-serif";
    ctx.fillText(themeHeadline, 950, 355, 870);

    ctx.fillStyle = "#ffffff";
    ctx.font = "1000 122px sans-serif";
    ctx.fillText(formatNumber(heroMetric), 950, 500);
    ctx.fillStyle = theme.accent;
    ctx.font = "900 26px sans-serif";
    ctx.fillText(heroMetricLabel, 950, 548);

    const images = await Promise.all(listings.map((item) => loadCanvasImage(item.cover_image?.image_url)));

    if (firstListing) {
      drawCoverImage(ctx, images[0], 80, 610, 920, 650, 56);
      roundedRect(ctx, 80, 610, 920, 650, 56);
      ctx.save();
      ctx.clip();
      const overlay = ctx.createLinearGradient(0, 820, 0, 1260);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(1, theme.darkOverlay);
      ctx.fillStyle = overlay;
      ctx.fillRect(80, 610, 920, 650);
      ctx.restore();

      if (theme.id === "sales") {
        roundedRect(ctx, 120, 650, 196, 58, 29);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.textAlign = "center";
        ctx.fillStyle = "#b3123d";
        ctx.font = "1000 24px sans-serif";
        ctx.fillText("فروش داغ", 218, 688);
        ctx.textAlign = "right";
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "1000 44px sans-serif";
      ctx.fillText(shortTitle(firstListing), 925, 1140, 760);
      ctx.fillStyle = theme.accent;
      ctx.font = "1000 31px sans-serif";
      ctx.fillText(formatPrice(firstListing.price_toman), 925, 1197, 760);
    }

    if (secondaryListings.length > 0) {
      const cardWidth = secondaryListings.length === 1 ? 920 : 444;
      secondaryListings.forEach((listing, index) => {
        const x = secondaryListings.length === 1 ? 80 : 80 + index * 476;
        drawCoverImage(ctx, images[index + 1], x, 1295, cardWidth, 300, 42);
        roundedRect(ctx, x, 1295, cardWidth, 300, 42);
        ctx.save();
        ctx.clip();
        const overlay = ctx.createLinearGradient(0, 1400, 0, 1595);
        overlay.addColorStop(0, "rgba(0,0,0,0)");
        overlay.addColorStop(1, theme.darkOverlay);
        ctx.fillStyle = overlay;
        ctx.fillRect(x, 1295, cardWidth, 300);
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        ctx.font = "1000 27px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(shortTitle(listing), x + cardWidth - 26, 1526, cardWidth - 52);
        ctx.fillStyle = theme.accent;
        ctx.font = "900 21px sans-serif";
        ctx.fillText(formatPrice(listing.price_toman), x + cardWidth - 26, 1565, cardWidth - 52);
      });
    } else if (!firstListing && businesses.length > 0) {
      businesses.slice(0, 3).forEach((name, index) => {
        const y = 680 + index * 170;
        roundedRect(ctx, 80, y, 920, 128, 36);
        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.22)";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "1000 30px sans-serif";
        ctx.fillText(name, 940, y + 78, 820);
      });
    }

    ctx.textAlign = "right";
    const stats = [
      [formatNumber(activeTotal), "آگهی فعال"],
      [formatNumber(businesses.length), "کسب‌وکار"],
      [formatNumber(listings.length), "انتخاب تازه"],
    ];
    stats.forEach(([value, label], index) => {
      const x = 80 + index * 270;
      ctx.fillStyle = "#ffffff";
      ctx.font = "1000 34px sans-serif";
      ctx.fillText(value, x + 220, 1712);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.font = "800 18px sans-serif";
      ctx.fillText(label, x + 220, 1746);
    });

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.62)";
    ctx.font = "1000 25px sans-serif";
    ctx.fillText("CHAKOD", 80, 1840);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
    return blob ? new File([blob], `chakod-showcase-${theme.id}.png`, { type: "image/png" }) : null;
  }

  async function shareShowcase() {
    if (sharing) return;
    setSharing(true);
    setShareLabel("در حال آماده‌سازی…");
    try {
      const file = await createShareFile();
      if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ویترین من در چاکود", text: themeHeadline });
        setShareLabel("اشتراک‌گذاری ویترین");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "ویترین من در چاکود", text: themeHeadline, url: window.location.href });
        setShareLabel("اشتراک‌گذاری ویترین");
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setShareLabel("لینک ویترین کپی شد");
      window.setTimeout(() => setShareLabel("اشتراک‌گذاری ویترین"), 2200);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setShareLabel("اشتراک‌گذاری ویترین");
      } else {
        setShareLabel("دوباره تلاش کن");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.stage}>
        {!loading && !error ? (
          <div className={styles.themeSwitcher} aria-label="انتخاب ظاهر ویترین">
            <button type="button" onClick={() => moveTheme(-1)} aria-label="تم قبلی">‹</button>
            <div className={styles.themeName}>
              <span>تم ویترین</span>
              <strong>{theme.name}</strong>
            </div>
            <button type="button" onClick={() => moveTheme(1)} aria-label="تم بعدی">›</button>
          </div>
        ) : null}

        <section
          className={`${styles.preview} ${themeClass}`}
          aria-label={`پیش‌نمایش ویترین ${theme.name}`}
          onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
        >
          {loading ? (
            <div className={styles.state}><span className={styles.loader} /><strong>در حال ساخت ویترین…</strong></div>
          ) : error ? (
            <div className={styles.state}><strong>{error}</strong></div>
          ) : (
            <>
              <div className={styles.texture} aria-hidden="true" />
              <div className={styles.topline}>
                <span>{theme.eyebrow}</span>
                <b>{todayLabel()}</b>
              </div>

              <section className={styles.billboard}>
                <span className={styles.kicker}>{theme.kicker}</span>
                <h1>{themeHeadline}</h1>
                <div className={styles.heroMetric}>
                  <strong>{formatNumber(heroMetric)}</strong>
                  <span>{heroMetricLabel}</span>
                </div>
              </section>

              {firstListing ? (
                <section className={styles.heroProduct}>
                  <div className={styles.heroProductImage}>
                    {firstListing.cover_image?.image_url
                      ? <img src={firstListing.cover_image.image_url} alt={shortTitle(firstListing)} loading="eager" decoding="async" />
                      : <span>CHAKOD</span>}
                  </div>
                  {theme.id === "sales" ? <span className={styles.saleBadge}>فروش داغ</span> : null}
                  <div className={styles.heroProductCopy}>
                    <small>{theme.id === "performance" ? "انتخاب برتر امروز" : "انتخاب اول ویترین"}</small>
                    <strong>{shortTitle(firstListing)}</strong>
                    <b>{formatPrice(firstListing.price_toman)}</b>
                  </div>
                </section>
              ) : null}

              {secondaryListings.length > 0 ? (
                <div className={`${styles.secondaryGrid} ${secondaryListings.length === 1 ? styles.singleSecondary : ""}`}>
                  {secondaryListings.map((listing, index) => (
                    <article className={styles.secondaryCard} key={listing.id}>
                      <div className={styles.secondaryImage}>
                        {listing.cover_image?.image_url
                          ? <img src={listing.cover_image.image_url} alt={shortTitle(listing)} loading="eager" decoding="async" />
                          : <span>{formatNumber(index + 2)}</span>}
                      </div>
                      <div className={styles.secondaryCopy}>
                        <strong>{shortTitle(listing)}</strong>
                        <b>{formatPrice(listing.price_toman)}</b>
                      </div>
                    </article>
                  ))}
                </div>
              ) : !firstListing && businesses.length > 0 ? (
                <div className={styles.businessStack}>
                  {businesses.slice(0, 3).map((name) => <strong key={name}>{name}</strong>)}
                </div>
              ) : null}

              <div className={styles.performanceStrip}>
                <div><strong>{formatNumber(activeTotal)}</strong><span>آگهی فعال</span></div>
                <div><strong>{formatNumber(businesses.length)}</strong><span>کسب‌وکار</span></div>
                <div><strong>{formatNumber(listings.length)}</strong><span>انتخاب تازه</span></div>
                <em>CHAKOD</em>
              </div>
            </>
          )}
        </section>

        {!loading && !error ? (
          <>
            <div className={styles.themeDots} aria-label="تم‌های ویترین">
              {THEMES.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === themeIndex ? styles.activeDot : ""}
                  onClick={() => setThemeIndex(index)}
                  aria-label={`تم ${item.name}`}
                  aria-current={index === themeIndex ? "true" : undefined}
                />
              ))}
            </div>
            <button type="button" className={styles.shareButton} onClick={() => void shareShowcase()} disabled={sharing}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                <path d="m8.2 10.9 7.5-4.4M8.2 13.1l7.5 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {shareLabel}
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
