"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HomeLocationSelection,
  buildHomeLocationQuery,
  loadHomeLocation,
} from "./home-location";

const API_BASE = "https://api.chakod.com";

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
  if (!value) {
    return "آگهی چاکود";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}

function getImageUrl(value: string | undefined) {
  if (!value) {
    return "";
  }

  if (value.startsWith("http")) {
    return value;
  }

  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

export default function HomeStories() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<HomeStoryItem[]>([]);
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);

  useEffect(() => {
    setLocation(loadHomeLocation());

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
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
        const params = buildHomeLocationQuery(location);
        params.set("limit", "12");

        const response = await fetch(
          `${API_BASE}/api/home-stories.php?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const json: HomeStoriesResponse = await response.json();

        if (ignore) {
          return;
        }

        setStories(
          json.success && Array.isArray(json.data) ? json.data : [],
        );
      } catch {
        if (!ignore) {
          setStories([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStories();

    return () => {
      ignore = true;
    };
  }, [location]);

  function trackClick(item: HomeStoryItem) {
    try {
      const payload = JSON.stringify({
        story_id: item.story_id,
        event: "click",
      });

      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([payload], {
          type: "application/json",
        });

        navigator.sendBeacon(`${API_BASE}/api/story-track.php`, blob);
        return;
      }

      fetch(`${API_BASE}/api/story-track.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // ثبت آمار نباید جلوی بازشدن آگهی را بگیرد.
    }
  }

  function openStory(item: HomeStoryItem) {
    trackClick(item);
    window.location.href =
      item.public_url || `/listing/${encodeURIComponent(item.listing_id)}`;
  }

  return (
    <section
      className="homeStories"
      dir="rtl"
      aria-label="استوری‌های آگهی چاکود"
    >
      <div className="storyHeader">
        <div>
          <span>استوری آگهی</span>
          <h2>ویژه‌های {location.label}</h2>
        </div>

        <a href="/dashboard/listings">استوری آگهی من</a>
      </div>

      {loading ? (
        <div className="storyScroller">
          {[1, 2, 3, 4, 5].map((item) => (
            <div className="storySkeleton" key={item}>
              <div />
              <span />
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="storyEmpty">
          <span>✦</span>
          <div>
            <strong>در این محدوده استوری فعالی نیست</strong>
            <small>با تغییر محدوده، استوری‌های دیگر را ببین.</small>
          </div>
        </div>
      ) : (
        <div className="storyScroller">
          {stories.map((item) => {
            const imageUrl = getImageUrl(item.cover_image?.image_url);

            return (
              <button
                type="button"
                className="storyItem"
                key={item.story_id}
                onClick={() => openStory(item)}
                title={item.title}
                aria-label={`مشاهده ${item.title}`}
              >
                <span className="storyRing">
                  <span className="storyAvatar">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.title}
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
      )}

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
          background: linear-gradient(
            90deg,
            #f1ebfa,
            #fbf9ff,
            #f1ebfa
          );
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

        @keyframes storySkeletonMove {
          to {
            background-position: -200% 0;
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
        }
      `}</style>
    </section>
  );
}