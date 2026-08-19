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
const MAX_STORIES_PER_OWNER = 10;
const MAX_OWNER_BUBBLES = 12;

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
  media_type?: "image" | "video";
  media_url?: string | null;
  thumbnail_url?: string | null;

  // APIهای فعلی و بعدی ممکن است شناسه مالک را با یکی از این نام‌ها برگردانند.
  // وجود شناسه باعث می‌شود حتی حساب‌های شخصی با نام عمومی، درست گروه‌بندی شوند.
  story_owner_key?: string | null;
  owner_key?: string | null;
  dealer_id?: number | null;
  owner_id?: number | null;
  owner_user_id?: number | null;
  user_id?: number | null;
  account_id?: number | null;
  publisher_id?: number | null;
};

type HomeStoriesResponse = {
  success: boolean;
  message?: string;
  count?: number;
  data?: HomeStoryItem[];
};

type StoryGroup = {
  key: string;
  label: string;
  items: HomeStoryItem[];
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
  if (!value) return "چاکود";
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

function normalizedSellerName(item: HomeStoryItem) {
  return String(item.seller_display_name || "").trim();
}

function isGenericPersonalLabel(value: string) {
  return !value || /^(شخصی|فروشنده شخصی|کاربر چاکود|فروشنده)$/u.test(value);
}

function storyOwnerKey(item: HomeStoryItem) {
  const explicitKey = String(item.story_owner_key || item.owner_key || "").trim();
  if (explicitKey) return `owner:${explicitKey}`;

  const numericCandidates = [
    item.dealer_id,
    item.owner_id,
    item.owner_user_id,
    item.user_id,
    item.account_id,
    item.publisher_id,
  ];
  const numericOwner = numericCandidates.find(
    (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
  );
  if (numericOwner) {
    return `${item.listing_owner_type || "owner"}:${Number(numericOwner)}`;
  }

  const seller = normalizedSellerName(item);
  if (item.listing_owner_type === "dealer" && seller) {
    return `dealer-name:${seller}`;
  }

  if (item.listing_owner_type === "personal" && !isGenericPersonalLabel(seller)) {
    return `personal-name:${seller}`;
  }

  // بدون شناسه قابل اتکا، دو فروشنده شخصی متفاوت را اشتباه یکی نمی‌کنیم.
  return `story:${item.story_id}`;
}

function storyOwnerLabel(item: HomeStoryItem) {
  const seller = normalizedSellerName(item);
  if (item.listing_owner_type === "dealer") return seller || "نمایشگاه";
  if (seller && !isGenericPersonalLabel(seller)) return seller;
  return "فروشنده شخصی";
}

function groupStories(items: HomeStoryItem[]) {
  const groups = new Map<string, StoryGroup>();

  items.forEach((item) => {
    const key = storyOwnerKey(item);
    const current = groups.get(key);

    if (current) {
      if (current.items.length < MAX_STORIES_PER_OWNER) current.items.push(item);
      return;
    }

    groups.set(key, {
      key,
      label: storyOwnerLabel(item),
      items: [item],
    });
  });

  return Array.from(groups.values()).slice(0, MAX_OWNER_BUBBLES);
}

export default function HomeStories() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<HomeStoryItem[]>([]);
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const storyGroups = useMemo(() => groupStories(stories), [stories]);
  const activeGroup = useMemo(
    () =>
      activeGroupIndex === null ? null : storyGroups[activeGroupIndex] || null,
    [activeGroupIndex, storyGroups],
  );
  const activeStory = useMemo(
    () =>
      activeGroup && activeItemIndex !== null
        ? activeGroup.items[activeItemIndex] || null
        : null,
    [activeGroup, activeItemIndex],
  );

  useEffect(() => {
    setLocation(loadHomeLocation());

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
      setActiveGroupIndex(null);
      setActiveItemIndex(null);
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadStories() {
      setLoading(true);

      try {
        const scopes = getHomeLocationScopes(location);
        const queries =
          location.mode === "all" || scopes.length === 0
            ? [new URLSearchParams({ scope: "all", limit: "80" })]
            : scopes.map((scope) => {
                const params = new URLSearchParams({
                  province: scope.province,
                  limit: "80",
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
          setStories(Array.from(merged.values()));
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
    setActiveGroupIndex(null);
    setActiveItemIndex(null);
  }, []);

  function openGroup(groupIndex: number) {
    const group = storyGroups[groupIndex];
    const firstStory = group?.items[0];
    if (!group || !firstStory) return;

    setActiveGroupIndex(groupIndex);
    setActiveItemIndex(0);
    trackClick(firstStory);
  }

  const showPrevious = useCallback(() => {
    if (!activeGroup || activeItemIndex === null) return;
    const nextIndex = Math.max(0, activeItemIndex - 1);
    if (nextIndex === activeItemIndex) return;
    setActiveItemIndex(nextIndex);
    trackClick(activeGroup.items[nextIndex]);
  }, [activeGroup, activeItemIndex, trackClick]);

  const showNext = useCallback(() => {
    if (!activeGroup || activeItemIndex === null) return;
    const nextIndex = activeItemIndex + 1;

    if (nextIndex >= activeGroup.items.length) {
      closeStory();
      return;
    }

    setActiveItemIndex(nextIndex);
    trackClick(activeGroup.items[nextIndex]);
  }, [activeGroup, activeItemIndex, closeStory, trackClick]);

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setTimeout(showNext, STORY_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeStory, activeItemIndex, showNext]);

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

  return (
    <section
      className="homeStories"
      dir="rtl"
      aria-label="استوری‌های چاکود"
    >
      <div className="storyScroller">
        <a
          className="storyItem storyOwnItem"
          href="/account/stories"
          aria-label="انتخاب آگهی برای استوری شما"
        >
          <span className="storyRing storyOwnRing">
            <span className="storyAvatar storyOwnAvatar">
              <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
            </span>
          </span>
          <strong>استوری شما</strong>
        </a>

        {loading
          ? [1, 2, 3, 4, 5].map((item) => (
              <div className="storySkeleton" key={item} aria-hidden="true">
                <div />
                <span />
              </div>
            ))
          : storyGroups.map((group, groupIndex) => {
              const firstStory = group.items[0];
              const imageUrl = firstStory ? getStoryImage(firstStory) : "";

              return (
                <button
                  type="button"
                  className="storyItem"
                  key={group.key}
                  onClick={() => openGroup(groupIndex)}
                  title={group.label}
                  aria-label={`بازکردن ${group.items.length.toLocaleString("fa-IR")} استوری از ${group.label}`}
                >
                  <span className="storyRing">
                    <span className="storyAvatar">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <b>چ</b>
                      )}
                    </span>
                    {group.items.length > 1 ? (
                      <span className="storyCount">
                        {group.items.length.toLocaleString("fa-IR")}
                      </span>
                    ) : null}
                  </span>
                  <strong>{shortTitle(group.label, 14)}</strong>
                </button>
              );
            })}
      </div>

      {activeStory && activeGroup && activeItemIndex !== null ? (
        <div
          className="storyViewer"
          role="dialog"
          aria-modal="true"
          aria-label={`استوری‌های ${activeGroup.label}`}
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
              {activeGroup.items.map((story, index) => (
                <span key={story.story_id}>
                  <i
                    key={`${activeStory.story_id}-${index}`}
                    className={
                      index < activeItemIndex
                        ? "done"
                        : index === activeItemIndex
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
                  <strong>{activeGroup.label}</strong>
                  <small>
                    {getStoryLocation(activeStory)} · {Number(activeItemIndex + 1).toLocaleString("fa-IR")} از {Number(activeGroup.items.length).toLocaleString("fa-IR")}
                  </small>
                </div>
              </div>

              <button type="button" onClick={closeStory} aria-label="بستن">
                ×
              </button>
            </div>

            <div className="storyMedia">
              {activeStory.media_type === "video" && getStoryMedia(activeStory) ? (
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

            {activeGroup.items.length > 1 ? (
              <>
                <button
                  type="button"
                  className="storyNav storyNavPrevious"
                  onClick={showPrevious}
                  disabled={activeItemIndex === 0}
                  aria-label="استوری قبلی همین حساب"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="storyNav storyNavNext"
                  onClick={showNext}
                  aria-label="استوری بعدی همین حساب"
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
          min-height: 92px;
          font-family: Tahoma, Arial, sans-serif;
        }

        .storyScroller {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          overflow-x: auto;
          padding: 7px 2px 8px;
          scrollbar-width: none;
          scroll-snap-type: x mandatory;
        }

        .storyScroller::-webkit-scrollbar { display: none; }

        .storyItem,
        .storySkeleton {
          min-width: 80px;
          max-width: 80px;
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
          text-decoration: none;
          cursor: pointer;
        }

        .storyRing {
          width: 70px;
          height: 70px;
          padding: 3px;
          position: relative;
          isolation: isolate;
          border-radius: 999px;
          display: block;
          background: conic-gradient(from 210deg, #4c1d95, #7c3aed 25%, #c084fc 48%, #8b5cf6 72%, #4c1d95);
          box-shadow: 0 10px 26px rgba(91, 33, 182, 0.2), 0 0 0 1px rgba(124, 58, 237, 0.1);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .storyRing::after {
          content: "";
          position: absolute;
          inset: -5px;
          z-index: -1;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.18), transparent 68%);
          pointer-events: none;
        }

        .storyItem:hover .storyRing {
          transform: translateY(-3px) scale(1.035);
          box-shadow: 0 14px 30px rgba(91, 33, 182, 0.26), 0 0 0 1px rgba(124, 58, 237, 0.12);
        }

        .storyAvatar {
          width: 100%;
          height: 100%;
          border: 3px solid #fff;
          border-radius: 999px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #f3edff;
          box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.08);
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

        .storyOwnRing {
          background: linear-gradient(145deg, #6d28d9, #9b55ed);
        }

        .storyOwnRing::before {
          content: "+";
          position: absolute;
          right: -1px;
          bottom: 2px;
          z-index: 4;
          width: 22px;
          height: 22px;
          border: 3px solid #fff;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #fff;
          background: #6d28d9;
          font-size: 16px;
          font-weight: 950;
          line-height: 1;
          box-shadow: 0 5px 12px rgba(76, 29, 149, 0.3);
        }

        .storyOwnAvatar {
          background: linear-gradient(145deg, #fff, #efe7ff);
        }

        .storyOwnAvatar img {
          width: 62%;
          height: 62%;
          object-fit: contain;
        }

        .storyCount {
          position: absolute;
          left: -2px;
          bottom: 2px;
          z-index: 4;
          min-width: 22px;
          height: 22px;
          padding: 0 5px;
          border: 3px solid #fff;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #fff;
          background: #2f1747;
          font-size: 8px;
          font-weight: 950;
          line-height: 1;
        }

        .storyItem > strong {
          width: 100%;
          overflow: hidden;
          color: #211633;
          white-space: nowrap;
          text-align: center;
          text-overflow: ellipsis;
          font-size: 8.5px;
          font-weight: 900;
        }

        .storySkeleton {
          display: grid;
          justify-items: center;
          gap: 6px;
        }

        .storySkeleton div {
          width: 70px;
          height: 70px;
          border-radius: 999px;
          background: linear-gradient(90deg, #f1ebfa, #fbf9ff, #f1ebfa);
          background-size: 200% 100%;
          animation: storySkeletonMove 1.3s ease infinite;
        }

        .storySkeleton span {
          width: 48px;
          height: 7px;
          border-radius: 999px;
          background: #f1ebfa;
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
          background: #fff;
        }

        .storyProgress i.done { width: 100%; }
        .storyProgress i.active { animation: storyProgressFill ${STORY_DURATION_MS}ms linear forwards; }

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
          color: #fff;
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
          color: rgba(255, 255, 255, 0.66);
          font-size: 8px;
        }

        .storyViewerTop > button {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          color: #fff;
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
          color: #fff;
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
          background: #fff;
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
        }

        .storyNav {
          position: absolute;
          top: 50%;
          z-index: 8;
          width: 38px;
          height: 55px;
          transform: translateY(-50%);
          border: 1px solid rgba(255, 255, 255, 0.13);
          color: #fff;
          background: rgba(10, 7, 14, 0.32);
          font-size: 28px;
          cursor: pointer;
        }

        .storyNav:disabled { opacity: 0.2; cursor: default; }
        .storyNavPrevious { right: 0; border-radius: 14px 0 0 14px; }
        .storyNavNext { left: 0; border-radius: 0 14px 14px 0; }

        @keyframes storySkeletonMove {
          to { background-position: -200% 0; }
        }

        @keyframes storyProgressFill {
          from { width: 0; }
          to { width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .storyProgress i.active,
          .storySkeleton div { animation: none; }
        }

        @media (max-width: 640px) {
          .homeStories { min-height: 82px; }
          .storyScroller { gap: 9px; padding-top: 5px; padding-bottom: 6px; }
          .storyItem,
          .storySkeleton { min-width: 72px; max-width: 72px; }
          .storyRing,
          .storySkeleton div { width: 64px; height: 64px; }
          .storyItem > strong { font-size: 7.5px; }
          .storyViewer { padding: 0; }
          .storyViewerCard {
            width: 100%;
            height: 100dvh;
            max-height: none;
            border: 0;
            border-radius: 0;
          }
          .storyViewerDetails { bottom: max(20px, env(safe-area-inset-bottom)); }
        }
      `}</style>
    </section>
  );
}
