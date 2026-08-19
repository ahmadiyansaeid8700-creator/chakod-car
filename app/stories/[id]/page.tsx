"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  canShareImageFile,
  createDoubleStoryShareFile,
  downloadShareFile,
} from "../../lib/double-story-share";

type StoryItem = {
  story_id: number;
  listing_id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  cover_image?: { image_id: number; image_url: string } | null;
  media_type?: "image" | "video";
  media_url?: string | null;
  public_url: string;
  expires_at?: string | null;
  is_active?: boolean;
};

type StoriesResponse = {
  success?: boolean;
  count?: number;
  data?: StoryItem[];
  message?: string;
};

type ShareState = "idle" | "copied" | "shared" | "error";

const API_BASE = "https://api.chakod.com";

function mediaUrl(value: string | null | undefined) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatPrice(value: number | string | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";
  if (number >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} میلیارد تومان`;
  }
  if (number >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(number / 1_000_000)} میلیون تومان`;
  }
  return `${new Intl.NumberFormat("fa-IR").format(number)} تومان`;
}

function appendRef(value: string, ref: string) {
  if (!value) return "/";
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}ref=${encodeURIComponent(ref)}`;
}

function listingPath(value: string | undefined, listingId: number) {
  if (!listingId) return "";
  const current = String(value || "").trim();
  if (!current || /^\/cars\/\d+(?:[/?#]|$)/i.test(current)) return `/listing/${listingId}`;
  return current;
}

const pageStyle: CSSProperties = {
  minHeight: "100dvh",
  padding: "18px 12px 34px",
  direction: "rtl",
  color: "#fff",
  background: "radial-gradient(circle at 50% -10%, #442273 0%, #180d27 44%, #08050d 100%)",
};

const shellStyle: CSSProperties = {
  width: "min(100%, 470px)",
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  minHeight: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const storyStyle: CSSProperties = {
  position: "relative",
  isolation: "isolate",
  width: "100%",
  aspectRatio: "9 / 16",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 30,
  background: "linear-gradient(150deg,#261039,#6d28d9 58%,#db2777)",
  boxShadow: "0 34px 90px rgba(0,0,0,.44)",
};

const topStyle: CSSProperties = {
  position: "absolute",
  zIndex: 4,
  top: 0,
  right: 0,
  left: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "20px 18px",
};

const bottomStyle: CSSProperties = {
  position: "absolute",
  zIndex: 4,
  right: 0,
  bottom: 0,
  left: 0,
  padding: "120px 20px 22px",
  background: "linear-gradient(180deg,transparent,rgba(8,5,13,.86) 42%,rgba(8,5,13,.98))",
};

const primaryStyle: CSSProperties = {
  minHeight: 50,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 18px",
  border: 0,
  borderRadius: 15,
  color: "#fff",
  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
  boxShadow: "0 14px 32px rgba(124,58,237,.28)",
  font: "inherit",
  fontSize: 12,
  fontWeight: 950,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryStyle: CSSProperties = {
  minHeight: 44,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 13,
  color: "rgba(255,255,255,.86)",
  background: "rgba(255,255,255,.06)",
  font: "inherit",
  fontSize: 10.5,
  fontWeight: 900,
  cursor: "pointer",
};

export default function PublicStoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const storyId = Number(String(params?.id || "").replace(/\D/g, ""));
  const [story, setStory] = useState<StoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");

  useEffect(() => {
    if (!Number.isSafeInteger(storyId) || storyId <= 0) {
      setLoading(false);
      setError("لینک استوری معتبر نیست.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/stories/public?story_id=${encodeURIComponent(String(storyId))}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as StoriesResponse | null;
        if (!response.ok || !payload?.success || !Array.isArray(payload.data) || !payload.data[0]) {
          throw new Error(payload?.message || "این استوری پیدا نشد.");
        }
        setStory(payload.data[0]);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setStory(null);
        setError(reason instanceof Error ? reason.message : "استوری دریافت نشد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [storyId]);

  const vehicle = useMemo(
    () => [story?.brand, story?.model, story?.year].filter(Boolean).join(" · "),
    [story],
  );
  const location = useMemo(
    () => [story?.neighborhood, story?.city, story?.province].filter(Boolean).join("، "),
    [story],
  );
  const image = mediaUrl(story?.media_url || story?.cover_image?.image_url);
  const resolvedListingPath = listingPath(story?.public_url, Number(story?.listing_id || 0));
  const listingHref = resolvedListingPath ? appendRef(resolvedListingPath, "double-story") : "";

  useEffect(() => {
    let ignore = false;
    setShareFile(null);
    setShareState("idle");
    if (!story || typeof window === "undefined") return () => { ignore = true; };

    void createDoubleStoryShareFile({
      title: story.title,
      sellerName: story.seller_display_name,
      brand: story.brand,
      model: story.model,
      year: story.year,
      priceToman: story.price_toman,
      location,
      imageUrl: image,
      publicStoryUrl: window.location.href,
    })
      .then((file) => {
        if (!ignore) setShareFile(file);
      })
      .catch(() => {
        if (!ignore) setShareFile(null);
      });

    return () => { ignore = true; };
  }, [image, location, story]);

  function goBack() {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  async function shareStory() {
    if (typeof window === "undefined") return;
    setShareState("idle");
    if (!canShareImageFile(shareFile) || !shareFile) {
      setShareState("error");
      return;
    }

    try {
      await navigator.share({
        title: `${story?.seller_display_name || "چاکود"} | دبل استوری`,
        text: `${story?.title || "دبل استوری چاکود"}\n${window.location.href}`,
        files: [shareFile],
      });
      setShareState("shared");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setShareState("error");
    }
  }

  async function copyStoryLink() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState("copied");
    } catch {
      window.prompt("لینک استوری را کپی کنید:", window.location.href);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <header style={headerStyle}>
          <button
            type="button"
            onClick={goBack}
            style={{ padding: 0, border: 0, color: "rgba(255,255,255,.74)", background: "transparent", font: "inherit", fontSize: 11, fontWeight: 850, cursor: "pointer" }}
          >
            برگشت
          </button>
          <Link href="/" aria-label="چاکود" style={{ display: "inline-flex" }}>
            <img src="/brand/chakod-logo-full-light.png" alt="چاکود" style={{ width: 108, height: "auto" }} />
          </Link>
        </header>

        {loading ? (
          <section style={{ ...storyStyle, display: "grid", placeItems: "center", color: "rgba(255,255,255,.75)", fontSize: 12, fontWeight: 900 }}>
            در حال بازکردن دبل استوری…
          </section>
        ) : error || !story ? (
          <section style={{ padding: "42px 24px", border: "1px solid rgba(255,255,255,.14)", borderRadius: 26, textAlign: "center", background: "rgba(255,255,255,.06)" }}>
            <strong style={{ display: "block", fontSize: 20 }}>استوری در دسترس نیست</strong>
            <p style={{ color: "rgba(255,255,255,.64)", fontSize: 11, lineHeight: 1.9 }}>{error || "این استوری پیدا نشد."}</p>
            <Link href="/" style={primaryStyle}>رفتن به چاکود</Link>
          </section>
        ) : (
          <>
            <article style={storyStyle} aria-label={`دبل استوری ${story.title}`}>
              {image ? (
                <img src={image} alt={story.title} style={{ position: "absolute", zIndex: 0, inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
              <div style={{ position: "absolute", zIndex: 1, inset: 0, background: "linear-gradient(180deg,rgba(8,5,13,.55),transparent 28%,transparent 55%,rgba(8,5,13,.72))" }} aria-hidden="true" />

              <div style={topStyle}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ display: "block", marginBottom: 3, color: "rgba(255,255,255,.65)", fontSize: 9, fontWeight: 800 }}>دبل استوری چاکود</span>
                  <strong style={{ display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 15, fontWeight: 950 }}>
                    {story.seller_display_name || (story.listing_owner_type === "dealer" ? "نمایشگاه خودرو" : "فروشنده چاکود")}
                  </strong>
                </div>
                <span style={{ flex: "0 0 auto", padding: "6px 9px", border: "1px solid rgba(255,255,255,.22)", borderRadius: 999, color: story.is_active ? "#dcfce7" : "#fde68a", background: "rgba(10,7,14,.36)", fontSize: 8, fontWeight: 900 }}>
                  {story.is_active ? "فعال" : "پایان‌یافته"}
                </span>
              </div>

              <div style={bottomStyle}>
                <span style={{ display: "inline-flex", marginBottom: 8, padding: "6px 9px", borderRadius: 999, color: "#f3e8ff", background: "rgba(124,58,237,.55)", fontSize: 9, fontWeight: 900 }}>
                  {formatPrice(story.price_toman)}
                </span>
                <h1 style={{ margin: 0, fontSize: "clamp(23px,7vw,32px)", lineHeight: 1.45, textShadow: "0 8px 30px rgba(0,0,0,.42)" }}>{story.title}</h1>
                {vehicle ? <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.82)", fontSize: 11 }}>{vehicle}</p> : null}
                {location ? <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.62)", fontSize: 9 }}>{location}</p> : null}
                {listingHref ? (
                  <a href={listingHref} style={{ ...primaryStyle, width: "100%", marginTop: 17 }}>
                    مشاهده آگهی خودرو
                  </a>
                ) : null}
              </div>
            </article>

            <section style={{ display: "grid", gap: 9, marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, background: "rgba(255,255,255,.055)" }}>
              <button
                type="button"
                disabled={!shareFile}
                onClick={() => void shareStory()}
                style={{ ...primaryStyle, width: "100%", opacity: shareFile ? 1 : 0.62 }}
              >
                {shareFile ? "اشتراک‌گذاری برای استوری یا پست" : "در حال آماده‌سازی تصویر…"}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <button type="button" disabled={!shareFile} onClick={() => downloadShareFile(shareFile)} style={{ ...secondaryStyle, opacity: shareFile ? 1 : 0.55 }}>
                  ذخیره تصویر
                </button>
                <button type="button" onClick={() => void copyStoryLink()} style={secondaryStyle}>
                  {shareState === "copied" ? "لینک کپی شد" : "کپی لینک دبل استوری"}
                </button>
              </div>
              <small style={{ color: "rgba(255,255,255,.56)", textAlign: "center", lineHeight: 1.8 }}>
                اشتراک اصلی یک تصویر ۹:۱۶ می‌فرستد؛ انتخاب استوری، پست، واتساپ یا تلگرام را اپ مقصد انجام می‌دهد.
              </small>
              {shareState === "shared" ? <small style={{ color: "#bbf7d0", textAlign: "center" }}>تصویر برای اشتراک‌گذاری ارسال شد.</small> : null}
              {shareState === "error" ? <small style={{ color: "#fecaca", textAlign: "center" }}>اشتراک تصویری روی این دستگاه باز نشد؛ «ذخیره تصویر» را بزن و از داخل اپ مقصد منتشر کن.</small> : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
