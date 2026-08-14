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
    placeholder.addColorStop(0, "#ede9fe");
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

  const heroMetric = activeTotal > 0 ? activeTotal : businesses.length;
  const heroMetricLabel = activeTotal > 0 ? "آگهی فعال در ویترین من" : "هویت حرفه‌ای متصل";
  const headline = listings.length >= 3
    ? "این سه انتخاب، ویترین این روزهای من‌اند"
    : activeTotal >= 6
      ? "ویترین من این روزها حسابی پر شده"
      : listings.length > 0
        ? "تازه‌های ویترین من"
        : businesses.length > 0
          ? "هویت حرفه‌ای من، یک‌جا"
          : "ویترین من در چاکود";
  const firstListing = listings[0];
  const secondaryListings = listings.slice(1, 3);

  async function createShareFile() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const background = ctx.createLinearGradient(1080, 0, 0, 1920);
    background.addColorStop(0, "#170523");
    background.addColorStop(0.44, "#3b0f67");
    background.addColorStop(0.78, "#6d28d9");
    background.addColorStop(1, "#8b5cf6");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1920);

    const glow = ctx.createRadialGradient(920, 160, 10, 920, 160, 420);
    glow.addColorStop(0, "rgba(216,180,254,.34)");
    glow.addColorStop(1, "rgba(216,180,254,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(500, 0, 580, 580);

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath();
      ctx.arc(70, 1740, 180 + index * 46, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "800 27px sans-serif";
    ctx.fillText(`ویترین من · ${todayLabel()}`, 950, 120);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 126px sans-serif";
    ctx.fillText(formatNumber(heroMetric), 950, 285);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "800 29px sans-serif";
    ctx.fillText(heroMetricLabel, 950, 340);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 61px sans-serif";
    ctx.fillText(headline, 950, 455, 870);

    const images = await Promise.all(listings.map((item) => loadCanvasImage(item.cover_image?.image_url)));

    if (firstListing) {
      drawCoverImage(ctx, images[0], 80, 535, 920, 650, 54);
      const overlay = ctx.createLinearGradient(0, 800, 0, 1185);
      overlay.addColorStop(0, "rgba(14,4,25,0)");
      overlay.addColorStop(1, "rgba(14,4,25,.88)");
      roundedRect(ctx, 80, 535, 920, 650, 54);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = overlay;
      ctx.fillRect(80, 535, 920, 650);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 45px sans-serif";
      ctx.fillText(shortTitle(firstListing), 925, 1072, 760);
      ctx.fillStyle = "#ddd6fe";
      ctx.font = "900 31px sans-serif";
      ctx.fillText(formatPrice(firstListing.price_toman), 925, 1125, 760);
    }

    if (secondaryListings.length > 0) {
      const cardWidth = secondaryListings.length === 1 ? 920 : 444;
      secondaryListings.forEach((listing, index) => {
        const x = secondaryListings.length === 1 ? 80 : 80 + index * 476;
        drawCoverImage(ctx, images[index + 1], x, 1220, cardWidth, 320, 42);
        roundedRect(ctx, x, 1220, cardWidth, 320, 42);
        ctx.save();
        ctx.clip();
        const overlay = ctx.createLinearGradient(0, 1360, 0, 1540);
        overlay.addColorStop(0, "rgba(17,5,31,0)");
        overlay.addColorStop(1, "rgba(17,5,31,.84)");
        ctx.fillStyle = overlay;
        ctx.fillRect(x, 1220, cardWidth, 320);
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 27px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(shortTitle(listing), x + cardWidth - 28, 1468, cardWidth - 56);
        ctx.fillStyle = "#ddd6fe";
        ctx.font = "800 22px sans-serif";
        ctx.fillText(formatPrice(listing.price_toman), x + cardWidth - 28, 1510, cardWidth - 56);
      });
    } else if (!firstListing && businesses.length > 0) {
      businesses.slice(0, 3).forEach((name, index) => {
        const y = 640 + index * 170;
        roundedRect(ctx, 80, y, 920, 132, 38);
        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.18)";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 30px sans-serif";
        ctx.fillText(name, 940, y + 80, 820);
      });
    }

    const statsY = 1600;
    const miniStats = [
      [formatNumber(businesses.length), "کسب‌وکار"],
      [formatNumber(listings.length), "انتخاب تازه"],
    ];
    miniStats.forEach(([value, label], index) => {
      const x = 80 + index * 250;
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 38px sans-serif";
      ctx.fillText(value, x + 190, statsY + 42);
      ctx.fillStyle = "rgba(255,255,255,.58)";
      ctx.font = "800 20px sans-serif";
      ctx.fillText(label, x + 190, statsY + 78);
    });

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.66)";
    ctx.font = "900 26px sans-serif";
    ctx.fillText("CHAKOD", 80, 1815);
    ctx.fillStyle = "rgba(255,255,255,.38)";
    ctx.font = "700 19px sans-serif";
    ctx.fillText(window.location.host, 80, 1852);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
    return blob ? new File([blob], "chakod-showcase.png", { type: "image/png" }) : null;
  }

  async function shareShowcase() {
    if (sharing) return;
    setSharing(true);
    setShareLabel("در حال آماده‌سازی…");
    try {
      const file = await createShareFile();
      if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ویترین من در چاکود", text: "ویترین من در چاکود" });
        setShareLabel("اشتراک‌گذاری ویترین");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "ویترین من در چاکود", text: headline, url: window.location.href });
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
        <section className={styles.preview} aria-label="پیش‌نمایش ویترین قابل اشتراک">
          {loading ? (
            <div className={styles.state}><span className={styles.loader} /><strong>در حال ساخت ویترین…</strong></div>
          ) : error ? (
            <div className={styles.state}><strong>{error}</strong></div>
          ) : (
            <>
              <div className={styles.topline}>
                <span>ویترین من · {todayLabel()}</span>
                <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
              </div>

              <section className={styles.hero}>
                <div className={styles.metricBlock}>
                  <strong>{formatNumber(heroMetric)}</strong>
                  <span>{heroMetricLabel}</span>
                </div>
                <h1>{headline}</h1>
              </section>

              {firstListing ? (
                <section className={styles.coverStory}>
                  <div className={styles.coverImage}>
                    {firstListing.cover_image?.image_url
                      ? <img src={firstListing.cover_image.image_url} alt={shortTitle(firstListing)} loading="eager" decoding="async" />
                      : <span>CHAKOD</span>}
                  </div>
                  <div className={styles.coverCopy}>
                    <small>انتخاب اول ویترین</small>
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

              <div className={styles.bottomMeta}>
                <div className={styles.miniMetric}>
                  <strong>{formatNumber(businesses.length)}</strong>
                  <span>کسب‌وکار</span>
                </div>
                <div className={styles.miniMetric}>
                  <strong>{formatNumber(listings.length)}</strong>
                  <span>انتخاب تازه</span>
                </div>
                <div className={styles.chakodMark} aria-label="چاکود">CHAKOD</div>
              </div>
            </>
          )}
        </section>

        {!loading && !error ? (
          <button type="button" className={styles.shareButton} onClick={() => void shareShowcase()} disabled={sharing}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.8" />
              <path d="m8.2 10.9 7.5-4.4M8.2 13.1l7.5 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {shareLabel}
          </button>
        ) : null}
      </div>
    </main>
  );
}
