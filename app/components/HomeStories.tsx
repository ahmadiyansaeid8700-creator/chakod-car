"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  getHomeLocationScopes,
  loadHomeLocation,
  type HomeLocationSelection,
} from "./home-location";

const API_BASE = "https://api.chakod.com";
const STORY_DURATION_MS = 6500;

type HomeStoryItem = {
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
  cover_image?: {
    image_id: number;
    image_url: string;
  } | null;
  public_url: string;

  // آماده برای API نسخهٔ ویدئویی استوری؛ نبودن این فیلدها مشکلی ایجاد نمی‌کند.
  media_type?: "image" | "video";
  media_url?: string | null;
  thumbnail_url?: string | null;
};

type HomeStoriesResponse = {
  success: boolean;
  message?: string;
  count?: number;
  data?: HomeStoryItem[];
};

function formatPrice(value: number | string | null | undefined) {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "قیمت توافقی";
  }

  if (numericValue >= 1_000_000_000) {
    return `${(numericValue / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد`;
  }

  if (numericValue >= 1_000_000) {
    return `${(numericValue / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون`;
  }

  return `${numericValue.toLocaleString("fa-IR")} تومان`;
}

function shortTitle(value: string, maxLength = 18) {
  if (!value) return "آگهی چاکود";
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

function getMediaUrl(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

function getStoryImage(item: HomeStoryItem) {
  return getMediaUrl(
    item.thumbnail_url || item.cover_image?.image_url || item.media_url,
  );
}

function getStoryMedia(item: HomeStoryItem) {
  return getMediaUrl(item.media_url || item.cover_image?.image_url);
}

function getStoryLocation(item: HomeStoryItem) {
  return [item.city, item.neighborhood].filter(Boolean).join("، ") || "ایران";
}

export default function HomeStories() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<HomeStoryItem[]>([]);
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const activeStory = useMemo(
    () => (activeIndex === null ? null : stories[activeIndex] || null),
    [activeIndex, stories],
  );

  useEffect(() => {
    setLocation(loadHomeLocation());

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
      setActiveIndex(null);
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);

    return () => {
      window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadStories() {
      setLoading(true);

      try {
        const scopes = getHomeLocationScopes(location);
        const queries =
          location.mode === "all" || scopes.length === 0
            ? [new URLSearchParams({ scope: "all", limit: "12" })]
            : scopes.map((scope) => {
                const params = new URLSearchParams({
                  province: scope.province,
                  limit: "12",
                });

                if (!scope.allCities) {
                  scope.cities.forEach((city) => params.append("cities[]", city));
                }

                return params;
              });

        const responses = await Promise.all(
          queries.map(async (params) => {
            const response = await fetch(
              `${API_BASE}/api/home-stories.php?${params.toString()}`,
              { method: "GET", cache: "no-store" },
            );

            if (!response.ok) return [] as HomeStoryItem[];
            const json: HomeStoriesResponse = await response.json();
            return json.success && Array.isArray(json.data) ? json.data : [];
          }),
        );

        if (!ignore) {
          const merged = new Map<number, HomeStoryItem>();
          responses.flat().forEach((item) => merged.set(item.story_id, item));
          setStories(Array.from(merged.values()).slice(0, 12));
        }
      } catch {
        if (!ignore) setStories([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadStories();

    return () => {
      ignore = true;
    };
  }, [location]);

  const trackClick = useCallback((item: HomeStoryItem) => {
    try {
      const payload = JSON.stringify({
        story_id: item.story_id,
        event: "click",
      });

      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${API_BASE}/api/story-track.php`, blob);
        return;
      }

      fetch(`${API_BASE}/api/story-track.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // ثبت آمار نباید نمایش استوری را مختل کند.
    }
  }, []);

  const closeStory = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || stories.length === 0) return null;
      return (current - 1 + stories.length) % stories.length;
    });
  }, [stories.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || stories.length === 0) return null;
      return (current + 1) % stories.length;
    });
  }, [stories.length]);

  function openStory(index: number) {
    const item = stories[index];
    if (!item) return;
    trackClick(item);
    setActiveIndex(index);
  }

  useEffect(() => {
    if (!activeStory) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeStory();
      if (event.key === "ArrowLeft") showNext();
      if (event.key === "ArrowRight") showPrevious();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeStory, closeStory, showNext, showPrevious]);

  useEffect(() => {
    if (!activeStory) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) return;

    const timer = window.setTimeout(showNext, STORY_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeStory, activeIndex, showNext]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;

    if (startX === null || endX === undefined) return;

    const distance = endX - startX;
    if (Math.abs(distance) < 48) return;

    if (distance > 0) showPrevious();
    else showNext();
  }

  // ردیف استوری همیشه در صفحهٔ اصلی باقی می‌ماند.
  // اگر استوری فعالی وجود نداشته باشد، یک ورودی فشرده برای مدیریت استوری نمایش داده می‌شود.

  return (
    <section
      className="homeStories"
      dir="rtl"
      aria-label="استوری‌های آگهی چاکود"
    >
      <div className="storyHeader">
        <h2>استوری‌ها</h2>
      </div>

      {loading ? (
        <div className="storyScroller" aria-label="در حال دریافت استوری‌ها">
          {[1, 2, 3, 4, 5].map((item) => (
            <div className="storySkeleton" key={item} aria-hidden="true">
              <div />
              <span />
            </div>
          ))}
        </div>
      ) : stories.length > 0 ? (
        <div className="storyScroller">
          {stories.map((item, index) => {
            const imageUrl = getStoryImage(item);

            return (
              <button
                type="button"
                className="storyItem"
                key={item.story_id}
                onClick={() => openStory(index)}
                title={item.title}
                aria-label={`بازکردن استوری ${item.title}`}
              >
                <span className="storyRing">
                  <span className="storyAvatar">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <b>چ</b>
                    )}
                  </span>
                </span>

                <strong>{shortTitle(item.brand || item.title, 14)}</strong>
                <span className="storyPrice">
                  {formatPrice(item.price_toman)}
                </span>

                {item.listing_owner_type === "dealer" ? (
                  <em>{item.seller_display_name || "نمایشگاه"}</em>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="storyScroller storyScrollerFallback">
          <a
            className="storyItem storyFallbackItem"
            href="/dashboard/listings"
            aria-label="مدیریت و ثبت استوری من"
          >
            <span className="storyRing">
              <span className="storyAvatar storyFallbackAvatar">
                <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
              </span>
            </span>
            <strong>استوری شما</strong>
          </a>
        </div>
      )}

      {activeStory && activeIndex !== null ? (
        <div
          className="storyViewer"
          role="dialog"
          aria-modal="true"
          aria-label={`استوری ${activeStory.title}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="storyBackdrop"
            onClick={closeStory}
            aria-label="بستن استوری"
          />

          <article className="storyViewerCard">
            <div className="storyProgress" aria-hidden="true">
              {stories.map((story, index) => (
                <span key={story.story_id}>
                  <i
                    key={`${activeStory.story_id}-${index}`}
                    className={
                      index < activeIndex
                        ? "done"
                        : index === activeIndex
                          ? "active"
                          : ""
                    }
                  />
                </span>
              ))}
            </div>

            <div className="storyViewerTop">
              <div className="storySellerIdentity">
                <span>
                  {getStoryImage(activeStory) ? (
                    <img src={getStoryImage(activeStory)} alt="" />
                  ) : (
                    "چ"
                  )}
                </span>

                <div>
                  <strong>
                    {activeStory.seller_display_name ||
                      activeStory.brand ||
                      "چاکود"}
                  </strong>
                  <small>{getStoryLocation(activeStory)}</small>
                </div>
              </div>

              <button type="button" onClick={closeStory} aria-label="بستن">
                ×
              </button>
            </div>

            <div className="storyMedia">
              {activeStory.media_type === "video" &&
              getStoryMedia(activeStory) ? (
                <video
                  key={activeStory.story_id}
                  src={getStoryMedia(activeStory)}
                  poster={getStoryImage(activeStory)}
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : getStoryMedia(activeStory) ? (
                <img
                  key={activeStory.story_id}
                  src={getStoryMedia(activeStory)}
                  alt={activeStory.title}
                />
              ) : (
                <div className="storyMediaFallback">چاکود</div>
              )}

              <div className="storyMediaShade" aria-hidden="true" />

              <div className="storyViewerDetails">
                <span>{formatPrice(activeStory.price_toman)}</span>
                <h3>{activeStory.title}</h3>
                <p>
                  {[activeStory.brand, activeStory.model, activeStory.year]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <a
                  href={
                    activeStory.public_url ||
                    `/cars/${encodeURIComponent(activeStory.listing_id)}`
                  }
                >
                  مشاهده آگهی کامل
                </a>
              </div>
            </div>

            {stories.length > 1 ? (
              <>
                <button
                  type="button"
                  className="storyNav storyNavPrevious"
                  onClick={showPrevious}
                  aria-label="استوری قبلی"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="storyNav storyNavNext"
                  onClick={showNext}
                  aria-label="استوری بعدی"
                >
                  ›
                </button>
              </>
            ) : null}
          </article>
        </div>
      ) : null}

      <style>{`
        .homeStories {
          width: 100%;
          font-family: Tahoma, Arial, sans-serif;
        }

        .storyHeader {
          margin-bottom: 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .storyHeader > div > span {
          color: #6d28d9;
          font-size: 9px;
          font-weight: 900;
        }

        .storyHeader h2 {
          margin: 3px 0 0;
          color: #211633;
          font-size: 17px;
        }

        .storyHeader > a {
          min-height: 34px;
          padding: 0 11px;
          border-radius: 999px;
          display: inline-grid;
          place-items: center;
          color: #6d28d9;
          background: #ffffff;
          border: 1px solid #e8def7;
          font-size: 8px;
          font-weight: 900;
        }

        .storyScroller {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 3px 1px 10px;
          scrollbar-width: none;
          scroll-snap-type: x mandatory;
        }

        .storyScroller::-webkit-scrollbar {
          display: none;
        }

        .storyItem,
        .storySkeleton {
          min-width: 88px;
          max-width: 88px;
          scroll-snap-align: start;
        }

        .storyItem {
          padding: 0;
          border: 0;
          display: grid;
          justify-items: center;
          gap: 5px;
          color: inherit;
          background: transparent;
          cursor: pointer;
        }

        .storyRing {
          width: 72px;
          height: 72px;
          padding: 3px;
          border-radius: 999px;
          display: block;
          background: conic-gradient(
            from 0deg,
            #4c1d95,
            #8b5cf6,
            #d8b4fe,
            #7c3aed,
            #4c1d95
          );
          box-shadow: 0 9px 21px rgba(109, 40, 217, 0.16);
          transition: transform 0.18s ease;
        }

        .storyItem:hover .storyRing {
          transform: translateY(-2px) scale(1.02);
        }

        .storyAvatar {
          width: 100%;
          height: 100%;
          border-radius: 999px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #f3edff;
          border: 3px solid #ffffff;
        }

        .storyAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .storyAvatar b {
          color: #6d28d9;
          font-size: 21px;
        }

        .storyItem > strong {
          width: 100%;
          overflow: hidden;
          color: #211633;
          white-space: nowrap;
          text-align: center;
          text-overflow: ellipsis;
          font-size: 9px;
        }

        .storyPrice {
          color: #786d84;
          font-size: 7px;
        }

        .storyItem em {
          max-width: 84px;
          padding: 3px 6px;
          border-radius: 999px;
          overflow: hidden;
          color: #6d28d9;
          background: #f3edff;
          border: 1px solid #e6dbf8;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 7px;
          font-style: normal;
        }

        .storySkeleton {
          display: grid;
          justify-items: center;
          gap: 7px;
        }

        .storySkeleton div {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          background: linear-gradient(90deg, #f1ebfa, #fbf9ff, #f1ebfa);
          background-size: 200% 100%;
          animation: storySkeletonMove 1.3s ease infinite;
        }

        .storySkeleton span {
          width: 58px;
          height: 8px;
          border-radius: 999px;
          background: #f1ebfa;
        }

        .storyEmpty {
          min-height: 78px;
          padding: 12px 14px;
          border-radius: 17px;
          display: flex;
          align-items: center;
          gap: 11px;
          color: #5c5068;
          background: #ffffff;
          border: 1px dashed #d6c8e8;
        }

        .storyEmpty > span {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f3edff;
          font-size: 18px;
        }

        .storyEmpty strong,
        .storyEmpty small {
          display: block;
        }

        .storyEmpty strong {
          color: #2d2236;
          font-size: 10px;
        }

        .storyEmpty small {
          margin-top: 3px;
          color: #8a7f94;
          font-size: 8px;
        }

        .storyViewer {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: grid;
          place-items: center;
          padding: 18px;
          direction: rtl;
        }

        .storyBackdrop {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: rgba(10, 7, 14, 0.88);
          backdrop-filter: blur(12px);
          cursor: default;
        }

        .storyViewerCard {
          position: relative;
          width: min(430px, 100%);
          height: min(760px, calc(100vh - 36px));
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 27px;
          background: #151019;
          box-shadow: 0 35px 90px rgba(0, 0, 0, 0.46);
          isolation: isolate;
        }

        .storyProgress {
          position: absolute;
          top: 12px;
          right: 12px;
          left: 12px;
          z-index: 7;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(8px, 1fr));
          gap: 4px;
          direction: ltr;
        }

        .storyProgress span {
          height: 3px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.28);
        }

        .storyProgress i {
          display: block;
          width: 0;
          height: 100%;
          border-radius: inherit;
          background: #ffffff;
        }

        .storyProgress i.done {
          width: 100%;
        }

        .storyProgress i.active {
          animation: storyProgressFill ${STORY_DURATION_MS}ms linear forwards;
        }

        .storyViewerTop {
          position: absolute;
          top: 26px;
          right: 15px;
          left: 15px;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #ffffff;
        }

        .storySellerIdentity {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .storySellerIdentity > span {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 2px solid rgba(255, 255, 255, 0.76);
          border-radius: 999px;
          background: #6d28d9;
          font-size: 13px;
          font-weight: 900;
        }

        .storySellerIdentity img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .storySellerIdentity strong,
        .storySellerIdentity small {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .storySellerIdentity strong {
          max-width: 245px;
          font-size: 10px;
        }

        .storySellerIdentity small {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 8px;
        }

        .storyViewerTop > button {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          color: #ffffff;
          background: rgba(15, 10, 20, 0.38);
          font-size: 22px;
          cursor: pointer;
        }

        .storyMedia {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #1d1525;
        }

        .storyMedia > img,
        .storyMedia > video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .storyMediaFallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: rgba(255, 255, 255, 0.7);
          background: linear-gradient(145deg, #251632, #6d28d9);
          font-size: 38px;
          font-weight: 900;
        }

        .storyMediaShade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(9, 5, 13, 0.62), transparent 28%),
            linear-gradient(0deg, rgba(9, 5, 13, 0.9), transparent 48%);
          pointer-events: none;
        }

        .storyViewerDetails {
          position: absolute;
          right: 18px;
          bottom: 20px;
          left: 18px;
          z-index: 5;
          color: #ffffff;
        }

        .storyViewerDetails > span {
          display: inline-flex;
          padding: 7px 9px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.11);
          font-size: 9px;
          font-weight: 900;
        }

        .storyViewerDetails h3 {
          margin: 11px 0 0;
          font-size: 22px;
          line-height: 1.65;
        }

        .storyViewerDetails p {
          margin: 4px 0 13px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 9px;
        }

        .storyViewerDetails a {
          min-height: 45px;
          display: grid;
          place-items: center;
          color: #2d163d;
          border-radius: 14px;
          background: #ffffff;
          font-size: 10px;
          font-weight: 900;
        }

        .storyNav {
          position: absolute;
          top: 50%;
          z-index: 8;
          width: 38px;
          height: 55px;
          transform: translateY(-50%);
          border: 1px solid rgba(255, 255, 255, 0.13);
          color: #ffffff;
          background: rgba(10, 7, 14, 0.32);
          font-size: 28px;
          cursor: pointer;
        }

        .storyNavPrevious {
          right: 0;
          border-radius: 14px 0 0 14px;
        }

        .storyNavNext {
          left: 0;
          border-radius: 0 14px 14px 0;
        }

        @keyframes storySkeletonMove {
          to {
            background-position: -200% 0;
          }
        }

        @keyframes storyProgressFill {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .storyProgress i.active,
          .storySkeleton div {
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .storyHeader h2 {
            font-size: 14px;
          }

          .storyHeader > a {
            min-height: 30px;
            padding: 0 9px;
            font-size: 7px;
          }

          .storyScroller {
            width: calc(100% + 10px);
            margin-left: -10px;
            padding-left: 10px;
          }

          .storyItem,
          .storySkeleton {
            min-width: 78px;
            max-width: 78px;
          }

          .storyRing,
          .storySkeleton div {
            width: 65px;
            height: 65px;
          }

          .storyItem > strong {
            font-size: 8px;
          }

          .storyViewer {
            padding: 0;
          }

          .storyViewerCard {
            width: 100%;
            height: 100dvh;
            max-height: none;
            border: 0;
            border-radius: 0;
          }

          .storyViewerDetails {
            bottom: max(20px, env(safe-area-inset-bottom));
          }
        }

        /* v16.3: compact public stories directly below the sticky search */
        .homeStories {
          display: grid;
          grid-template-columns: 68px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          min-height: 74px;
        }

        .storyHeader {
          margin: 0;
          display: block;
        }

        .storyHeader h2 {
          margin: 0;
          color: #2d2038;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .storyScroller {
          gap: 8px;
          padding: 2px 0 4px;
        }

        .storyItem,
        .storySkeleton {
          min-width: 64px;
          max-width: 64px;
        }

        .storyRing,
        .storySkeleton div {
          width: 54px;
          height: 54px;
        }

        .storyRing {
          padding: 2px;
          box-shadow: 0 6px 15px rgba(109, 40, 217, 0.13);
        }

        .storyAvatar {
          border-width: 2px;
        }

        .storyItem {
          gap: 3px;
        }

        .storyItem > strong {
          font-size: 8px;
        }

        .storyPrice,
        .storyItem em {
          display: none;
        }

        .storyScrollerFallback {
          overflow: hidden;
        }

        .storyFallbackItem {
          text-decoration: none;
        }

        .storyFallbackAvatar {
          background: linear-gradient(145deg, #ffffff, #efe7ff);
        }

        .storyFallbackAvatar img {
          width: 62%;
          height: 62%;
          object-fit: contain;
        }

        .storySkeleton {
          gap: 5px;
        }

        .storySkeleton span {
          width: 42px;
          height: 6px;
        }

        @media (max-width: 640px) {
          .homeStories {
            grid-template-columns: 54px minmax(0, 1fr);
            gap: 6px;
            min-height: 64px;
          }

          .storyHeader h2 {
            font-size: 9px;
          }

          .storyScroller {
            gap: 6px;
            padding-bottom: 2px;
          }

          .storyItem,
          .storySkeleton {
            min-width: 56px;
            max-width: 56px;
          }

          .storyRing,
          .storySkeleton div {
            width: 48px;
            height: 48px;
          }

          .storyItem > strong {
            font-size: 7px;
          }
        }


        /* v16.4.2 — دایره‌های استوری برجسته‌تر و مدرن‌تر */
        .homeStories {
          grid-template-columns: 74px minmax(0, 1fr);
          min-height: 92px;
          gap: 12px;
        }

        .storyHeader h2 {
          font-size: 11px;
          font-weight: 950;
        }

        .storyScroller {
          gap: 11px;
          padding: 5px 2px 7px;
        }

        .storyItem,
        .storySkeleton {
          min-width: 80px;
          max-width: 80px;
        }

        .storyRing,
        .storySkeleton div {
          width: 70px;
          height: 70px;
        }

        .storyRing {
          position: relative;
          isolation: isolate;
          padding: 3px;
          background: conic-gradient(from 210deg, #4c1d95, #7c3aed 25%, #c084fc 48%, #8b5cf6 72%, #4c1d95);
          box-shadow: 0 10px 26px rgba(91, 33, 182, 0.2), 0 0 0 1px rgba(124, 58, 237, 0.1);
        }

        .storyRing::after {
          content: "";
          position: absolute;
          inset: -5px;
          z-index: -1;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 68%);
          opacity: 0.9;
          pointer-events: none;
        }

        .storyRing::before {
          content: "";
          position: absolute;
          right: 2px;
          bottom: 5px;
          z-index: 3;
          width: 10px;
          height: 10px;
          border: 2px solid #ffffff;
          border-radius: 999px;
          background: #7c3aed;
          box-shadow: 0 3px 8px rgba(76, 29, 149, 0.35);
        }

        .storyAvatar {
          border-width: 3px;
          box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.08);
        }

        .storyItem {
          gap: 5px;
        }

        .storyItem > strong {
          font-size: 8.5px;
          font-weight: 900;
        }

        .storyItem:hover .storyRing {
          transform: translateY(-3px) scale(1.035);
          box-shadow: 0 14px 30px rgba(91, 33, 182, 0.26), 0 0 0 1px rgba(124, 58, 237, 0.12);
        }

        @media (max-width: 640px) {
          .homeStories {
            grid-template-columns: 52px minmax(0, 1fr);
            min-height: 82px;
            gap: 8px;
          }

          .storyHeader h2 {
            font-size: 9px;
          }

          .storyScroller {
            gap: 9px;
            padding-top: 4px;
            padding-bottom: 5px;
          }

          .storyItem,
          .storySkeleton {
            min-width: 72px;
            max-width: 72px;
          }

          .storyRing,
          .storySkeleton div {
            width: 64px;
            height: 64px;
          }

          .storyItem > strong {
            font-size: 7.5px;
          }
        }

      `}</style>
    </section>
  );
}
