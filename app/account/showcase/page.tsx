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

type Creative = {
  id: "spotlight" | "drop" | "momentum";
  label: string;
  campaign: string;
  headline: string;
  cta: string;
  canvasStart: string;
  canvasMid: string;
  canvasEnd: string;
  accent: string;
  ink: string;
  overlay: string;
};

const CREATIVES: Creative[] = [
  {
    id: "spotlight",
    label: "طرح ۱",
    campaign: "ویترین تازه",
    headline: "سه انتخاب تازه؛ آماده‌ی دیده‌شدن",
    cta: "ویترین من را در چاکود ببین",
    canvasStart: "#23003f",
    canvasMid: "#6d28d9",
    canvasEnd: "#ff4f8b",
    accent: "#fff26b",
    ink: "#ffffff",
    overlay: "rgba(26,2,42,.92)",
  },
  {
    id: "drop",
    label: "طرح ۲",
    campaign: "NEW DROP",
    headline: "این‌ها الان روی ویترین من‌اند",
    cta: "انتخاب‌های بیشتر در چاکود",
    canvasStart: "#fff9f1",
    canvasMid: "#f7edff",
    canvasEnd: "#e8dcff",
    accent: "#6d28d9",
    ink: "#28123a",
    overlay: "rgba(35,10,54,.90)",
  },
  {
    id: "momentum",
    label: "طرح ۳",
    campaign: "روی فرم",
    headline: "ویترین من این روزها جدی‌تر از همیشه‌ست",
    cta: "مشاهده ویترین در چاکود",
    canvasStart: "#10051d",
    canvasMid: "#40106a",
    canvasEnd: "#7c3aed",
    accent: "#67f4d3",
    ink: "#ffffff",
    overlay: "rgba(13,3,24,.93)",
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
    ctx.drawImage(image, x + (width - renderedWidth) / 2, y + (height - renderedHeight) / 2, renderedWidth, renderedHeight);
  } else {
    const placeholder = ctx.createLinearGradient(x, y, x + width, y + height);
    placeholder.addColorStop(0, "#efe7ff");
    placeholder.addColorStop(1, "#c4b5fd");
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
  const [creativeIndex, setCreativeIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareLabel, setShareLabel] = useState("اشتراک‌گذاری این بنر");

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

  const creative = CREATIVES[creativeIndex];
  const firstListing = listings[0];
  const secondaryListings = listings.slice(1, 3);
  const heroMetric = activeTotal || businesses.length || listings.length;
  const headline = firstListing ? creative.headline : businesses.length ? "این هویت حرفه‌ای من در چاکود است" : "ویترین من آماده‌ی دیده‌شدن است";

  const creativeClass = creative.id === "spotlight"
    ? styles.creativeSpotlight
    : creative.id === "drop"
      ? styles.creativeDrop
      : styles.creativeMomentum;

  function moveCreative(direction: number) {
    setCreativeIndex((current) => (current + direction + CREATIVES.length) % CREATIVES.length);
  }

  function handleTouchEnd(clientX: number) {
    if (touchStartX === null) return;
    const distance = clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(distance) < 42) return;
    moveCreative(distance < 0 ? 1 : -1);
  }

  async function createShareFile() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const background = ctx.createLinearGradient(1080, 0, 0, 1920);
    background.addColorStop(0, creative.canvasStart);
    background.addColorStop(0.52, creative.canvasMid);
    background.addColorStop(1, creative.canvasEnd);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.direction = "rtl";
    ctx.textAlign = "right";

    const images = await Promise.all(listings.map((item) => loadCanvasImage(item.cover_image?.image_url)));

    if (firstListing) {
      drawCoverImage(ctx, images[0], 54, 310, 972, 950, 70);
      roundedRect(ctx, 54, 310, 972, 950, 70);
      ctx.save();
      ctx.clip();
      const fade = ctx.createLinearGradient(0, 560, 0, 1260);
      fade.addColorStop(0, "rgba(0,0,0,.02)");
      fade.addColorStop(0.56, "rgba(0,0,0,.12)");
      fade.addColorStop(1, creative.overlay);
      ctx.fillStyle = fade;
      ctx.fillRect(54, 310, 972, 950);
      ctx.restore();
    }

    ctx.fillStyle = creative.id === "drop" ? "#6d28d9" : creative.accent;
    ctx.font = "1000 25px sans-serif";
    ctx.fillText(creative.campaign, 950, 105);

    ctx.fillStyle = creative.ink;
    ctx.font = "1000 72px sans-serif";
    ctx.fillText(headline, 950, 235, 880);

    if (firstListing) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "1000 48px sans-serif";
      ctx.fillText(shortTitle(firstListing), 930, 1090, 790);
      ctx.fillStyle = creative.accent;
      ctx.font = "1000 31px sans-serif";
      ctx.fillText(formatPrice(firstListing.price_toman), 930, 1148, 790);
    }

    if (secondaryListings.length > 0) {
      const cardWidth = secondaryListings.length === 1 ? 972 : 472;
      secondaryListings.forEach((listing, index) => {
        const x = secondaryListings.length === 1 ? 54 : 54 + index * 500;
        drawCoverImage(ctx, images[index + 1], x, 1300, cardWidth, 300, 38);
        roundedRect(ctx, x, 1300, cardWidth, 300, 38);
        ctx.save();
        ctx.clip();
        const fade = ctx.createLinearGradient(0, 1410, 0, 1600);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(20,4,31,.9)");
        ctx.fillStyle = fade;
        ctx.fillRect(x, 1300, cardWidth, 300);
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        ctx.font = "1000 26px sans-serif";
        ctx.fillText(shortTitle(listing), x + cardWidth - 24, 1532, cardWidth - 48);
        ctx.fillStyle = creative.accent;
        ctx.font = "900 20px sans-serif";
        ctx.fillText(formatPrice(listing.price_toman), x + cardWidth - 24, 1572, cardWidth - 48);
      });
    }

    roundedRect(ctx, 420, 1660, 606, 104, 52);
    ctx.fillStyle = creative.id === "drop" ? "#6d28d9" : "rgba(255,255,255,.95)";
    ctx.fill();
    ctx.fillStyle = creative.id === "drop" ? "#ffffff" : "#35114d";
    ctx.font = "1000 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(creative.cta, 723, 1725, 530);

    ctx.textAlign = "right";
    ctx.fillStyle = creative.id === "drop" ? "#6d28d9" : creative.accent;
    ctx.font = "1000 58px sans-serif";
    ctx.fillText(formatNumber(heroMetric), 255, 1724);
    ctx.fillStyle = creative.id === "drop" ? "rgba(40,18,58,.62)" : "rgba(255,255,255,.60)";
    ctx.font = "900 18px sans-serif";
    ctx.fillText(activeTotal ? "آگهی فعال" : "هویت حرفه‌ای", 255, 1760);

    ctx.textAlign = "left";
    ctx.fillStyle = creative.id === "drop" ? "rgba(57,26,77,.64)" : "rgba(255,255,255,.68)";
    ctx.font = "1000 25px sans-serif";
    ctx.fillText("CHAKOD", 60, 1850);
    ctx.font = "800 18px sans-serif";
    ctx.fillText(window.location.host, 60, 1882);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
    return blob ? new File([blob], `chakod-banner-${creative.id}.png`, { type: "image/png" }) : null;
  }

  async function shareShowcase() {
    if (sharing) return;
    setSharing(true);
    setShareLabel("در حال آماده‌سازی…");
    try {
      const file = await createShareFile();
      if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ویترین من در چاکود", text: headline });
        setShareLabel("اشتراک‌گذاری این بنر");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "ویترین من در چاکود", text: headline, url: window.location.href });
        setShareLabel("اشتراک‌گذاری این بنر");
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setShareLabel("لینک ویترین کپی شد");
      window.setTimeout(() => setShareLabel("اشتراک‌گذاری این بنر"), 2200);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setShareLabel("اشتراک‌گذاری این بنر");
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
        <section
          className={`${styles.preview} ${creativeClass}`}
          aria-label={`بنر تبلیغاتی ${creative.label}`}
          onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
        >
          {loading ? (
            <div className={styles.state}><span className={styles.loader} /><strong>در حال ساخت بنر…</strong></div>
          ) : error ? (
            <div className={styles.state}><strong>{error}</strong></div>
          ) : (
            <>
              <div className={styles.art} aria-hidden="true" />
              <div className={styles.topline}>
                <span>{creative.campaign}</span>
                <b>{todayLabel()}</b>
              </div>

              <header className={styles.adHeadline}>
                <h1>{headline}</h1>
              </header>

              {firstListing ? (
                <section className={styles.heroAd}>
                  <div className={styles.heroAdImage}>
                    {firstListing.cover_image?.image_url
                      ? <img src={firstListing.cover_image.image_url} alt={shortTitle(firstListing)} loading="eager" decoding="async" />
                      : <span>CHAKOD</span>}
                  </div>
                  <span className={styles.ribbon}>{creative.id === "drop" ? "تازه روی ویترین" : creative.id === "momentum" ? "انتخاب برتر" : "پیشنهاد من"}</span>
                  <div className={styles.heroAdCopy}>
                    <strong>{shortTitle(firstListing)}</strong>
                    <b>{formatPrice(firstListing.price_toman)}</b>
                  </div>
                </section>
              ) : (
                <section className={styles.identityAd}>
                  <strong>{businesses[0] || "ویترین من در چاکود"}</strong>
                  <span>{businesses.length ? `${formatNumber(businesses.length)} هویت حرفه‌ای متصل` : "آماده‌ی دیده‌شدن"}</span>
                </section>
              )}

              {secondaryListings.length > 0 ? (
                <div className={`${styles.productRail} ${secondaryListings.length === 1 ? styles.singleProduct : ""}`}>
                  {secondaryListings.map((listing) => (
                    <article className={styles.productMini} key={listing.id}>
                      <div className={styles.productMiniImage}>
                        {listing.cover_image?.image_url
                          ? <img src={listing.cover_image.image_url} alt={shortTitle(listing)} loading="eager" decoding="async" />
                          : <span>CHAKOD</span>}
                      </div>
                      <div><strong>{shortTitle(listing)}</strong><b>{formatPrice(listing.price_toman)}</b></div>
                    </article>
                  ))}
                </div>
              ) : null}

              <footer className={styles.adFooter}>
                <div className={styles.socialProof}>
                  <strong>{formatNumber(heroMetric)}</strong>
                  <span>{activeTotal ? "آگهی فعال" : "هویت حرفه‌ای"}</span>
                </div>
                <div className={styles.fakeCta}>{creative.cta}<span>←</span></div>
                <em>CHAKOD</em>
              </footer>
            </>
          )}
        </section>

        {!loading && !error ? (
          <>
            <div className={styles.creativeNav} aria-label="طرح‌های بنر">
              <button type="button" onClick={() => moveCreative(-1)} aria-label="طرح قبلی">‹</button>
              <div className={styles.dots}>
                {CREATIVES.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={index === creativeIndex ? styles.activeDot : ""}
                    onClick={() => setCreativeIndex(index)}
                    aria-label={item.label}
                    aria-current={index === creativeIndex ? "true" : undefined}
                  />
                ))}
              </div>
              <button type="button" onClick={() => moveCreative(1)} aria-label="طرح بعدی">›</button>
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
