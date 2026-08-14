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

  const headline = activeTotal >= 6
    ? "این روزها پرقدرت روی ویترینم"
    : activeTotal >= 2
      ? "این انتخاب‌ها الآن روی ویترین من‌اند"
      : businesses.length > 0
        ? "اعتبار حرفه‌ای من در چاکود"
        : "ویترین من در چاکود";

  async function createShareFile() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const background = ctx.createLinearGradient(1080, 0, 0, 1920);
    background.addColorStop(0, "#1f0a38");
    background.addColorStop(0.55, "#5b21b6");
    background.addColorStop(1, "#8b5cf6");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(120, 1720, 360, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1000, 120, 290, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 42px sans-serif";
    ctx.fillText("ویترین من · چاکود", 940, 150);
    ctx.font = "900 70px sans-serif";
    ctx.fillText(headline, 940, 300, 860);

    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.font = "700 30px sans-serif";
    ctx.fillText("ساخته‌شده از داده‌های واقعی حساب من", 940, 360);

    const stats = [
      [formatNumber(activeTotal), "آگهی فعال"],
      [formatNumber(businesses.length), "کسب‌وکار متصل"],
      [formatNumber(listings.length), "انتخاب تازه"],
    ];
    stats.forEach(([value, label], index) => {
      const x = 80 + index * 310;
      roundedRect(ctx, x, 440, 285, 185, 34);
      ctx.fillStyle = "rgba(255,255,255,.13)";
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 55px sans-serif";
      ctx.fillText(value, x + 142, 520);
      ctx.fillStyle = "rgba(255,255,255,.76)";
      ctx.font = "800 25px sans-serif";
      ctx.fillText(label, x + 142, 570);
    });

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 36px sans-serif";
    ctx.fillText(listings.length ? "سه انتخاب تازه من" : "هویت حرفه‌ای من", 940, 720);

    if (listings.length) {
      const images = await Promise.all(listings.map((item) => loadCanvasImage(item.cover_image?.image_url)));
      for (let index = 0; index < listings.length; index += 1) {
        const listing = listings[index];
        const y = 770 + index * 300;
        roundedRect(ctx, 80, y, 920, 250, 34);
        ctx.fillStyle = "rgba(255,255,255,.94)";
        ctx.fill();

        const image = images[index];
        roundedRect(ctx, 710, y + 18, 270, 214, 26);
        ctx.save();
        ctx.clip();
        if (image) {
          const scale = Math.max(270 / image.width, 214 / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          ctx.drawImage(image, 710 + (270 - width) / 2, y + 18 + (214 - height) / 2, width, height);
        } else {
          ctx.fillStyle = "#eee6fb";
          ctx.fillRect(710, y + 18, 270, 214);
        }
        ctx.restore();

        ctx.textAlign = "right";
        ctx.fillStyle = "#24122e";
        ctx.font = "900 31px sans-serif";
        ctx.fillText(shortTitle(listing), 665, y + 82, 530);
        ctx.fillStyle = "#6d28d9";
        ctx.font = "900 27px sans-serif";
        ctx.fillText(formatPrice(listing.price_toman), 665, y + 145, 530);
        const vehicle = [listing.brand, listing.model, listing.year].filter(Boolean).join(" · ");
        if (vehicle) {
          ctx.fillStyle = "#776982";
          ctx.font = "700 23px sans-serif";
          ctx.fillText(vehicle, 665, y + 195, 530);
        }
      }
    } else {
      const names = businesses.slice(0, 3);
      names.forEach((name, index) => {
        const y = 785 + index * 155;
        roundedRect(ctx, 80, y, 920, 120, 30);
        ctx.fillStyle = "rgba(255,255,255,.94)";
        ctx.fill();
        ctx.fillStyle = "#35134d";
        ctx.font = "900 29px sans-serif";
        ctx.fillText(name, 940, y + 72, 820);
      });
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "900 30px sans-serif";
    ctx.fillText("اعتبار من در چاکود ✦", 540, 1710);
    ctx.fillStyle = "rgba(255,255,255,.62)";
    ctx.font = "700 23px sans-serif";
    ctx.fillText(window.location.host, 540, 1760);

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
              <div className={styles.brandRow}>
                <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
                <span>ویترین من</span>
              </div>

              <div className={styles.intro}>
                <span>اعتبار من در چاکود</span>
                <h1>{headline}</h1>
                <p>این ویترین از فعالیت واقعی من ساخته شده.</p>
              </div>

              <div className={styles.stats}>
                <article><strong>{formatNumber(activeTotal)}</strong><span>آگهی فعال</span></article>
                <article><strong>{formatNumber(businesses.length)}</strong><span>کسب‌وکار</span></article>
                <article><strong>{formatNumber(listings.length)}</strong><span>انتخاب تازه</span></article>
              </div>

              <div className={styles.featured}>
                <span className={styles.featuredLabel}>{listings.length ? "سه انتخاب تازه من" : "هویت حرفه‌ای من"}</span>
                {listings.length ? (
                  <div className={styles.listings}>
                    {listings.map((listing) => (
                      <article className={styles.listing} key={listing.id}>
                        <div className={styles.imageWrap}>
                          {listing.cover_image?.image_url
                            ? <img src={listing.cover_image.image_url} alt={shortTitle(listing)} loading="eager" decoding="async" />
                            : <span>چاکود</span>}
                        </div>
                        <div className={styles.listingCopy}>
                          <strong>{shortTitle(listing)}</strong>
                          <b>{formatPrice(listing.price_toman)}</b>
                          <small>{[listing.brand, listing.model, listing.year].filter(Boolean).join(" · ")}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.businesses}>
                    {businesses.slice(0, 3).map((name) => <strong key={name}>{name}</strong>)}
                  </div>
                )}
              </div>

              <div className={styles.footerMark}>
                <strong>✦ اعتبار من در چاکود</strong>
                <span>chakod.com</span>
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
