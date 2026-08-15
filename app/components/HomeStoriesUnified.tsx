"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";

import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  getHomeLocationScopes,
  loadHomeLocation,
  type HomeLocationSelection,
} from "./home-location";
import styles from "./HomeStoriesUnified.module.css";

const API_BASE = "https://api.chakod.com";
const STORY_DURATION_MS = 6500;
const MAX_STORIES_PER_OWNER = 10;
const MAX_OWNER_BUBBLES = 12;
const LOCAL_STORY_ID_BASE = 1_000_000_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const DOMESTIC_YEAR_TOKENS = [
  "ایران خودرو",
  "ایران‌خودرو",
  "سایپا",
  "پارس خودرو",
  "زامیاد",
  "دنا",
  "سمند",
  "تارا",
  "رانا",
  "شاهین",
  "کوییک",
  "تیبا",
  "ساینا",
  "پراید",
];

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
  public_url: string;
  media_type?: "image" | "video";
  media_url?: string | null;
  thumbnail_url?: string | null;
  story_owner_key?: string | null;
  owner_key?: string | null;
  dealer_id?: number | null;
  owner_id?: number | null;
  owner_user_id?: number | null;
  user_id?: number | null;
  account_id?: number | null;
  publisher_id?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
};

type StoriesResponse = { success?: boolean; data?: StoryItem[] };
type StoryGroup = { key: string; label: string; items: StoryItem[] };
type DealerIdentityListing = {
  dealer_id?: number | string | null;
  dealer_logo_url?: string | null;
};
type DealerIdentityResponse = {
  success?: boolean;
  data?: DealerIdentityListing[];
  listings?: DealerIdentityListing[];
};

function formatPrice(value: number | string | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";
  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیارد تومان`;
  }
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} میلیون تومان`;
  }
  return `${number.toLocaleString("fa-IR")} تومان`;
}

function shortTitle(value: string, maxLength = 14) {
  if (!value) return "چاکود";
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

function mediaUrl(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

function storyImage(item: StoryItem) {
  return mediaUrl(item.thumbnail_url || item.cover_image?.image_url || item.media_url);
}

function storyMedia(item: StoryItem) {
  return mediaUrl(item.media_url || item.cover_image?.image_url);
}

function storyLocation(item: StoryItem) {
  return [item.city, item.neighborhood].filter(Boolean).join("، ") || "ایران";
}

function sellerName(item: StoryItem) {
  return String(item.seller_display_name || "").trim();
}

function isGenericPersonal(value: string) {
  return !value || /^(شخصی|فروشنده شخصی|کاربر چاکود|فروشنده)$/u.test(value);
}

function ownerKey(item: StoryItem) {
  const explicit = String(item.story_owner_key || item.owner_key || "").trim();
  if (explicit) return `owner:${explicit}`;

  const numeric = [
    item.dealer_id,
    item.owner_id,
    item.owner_user_id,
    item.user_id,
    item.account_id,
    item.publisher_id,
  ].find((value) => Number.isSafeInteger(Number(value)) && Number(value) > 0);

  if (numeric) return `${item.listing_owner_type || "owner"}:${Number(numeric)}`;

  const seller = sellerName(item);
  if (item.listing_owner_type === "dealer" && seller) return `dealer-name:${seller}`;
  if (item.listing_owner_type === "personal" && !isGenericPersonal(seller)) return `personal-name:${seller}`;
  return `story:${item.story_id}`;
}

function ownerLabel(item: StoryItem) {
  const seller = sellerName(item);
  if (item.listing_owner_type === "dealer") return seller || "نمایشگاه";
  if (seller && !isGenericPersonal(seller)) return seller;
  return "فروشنده شخصی";
}

function groupStories(items: StoryItem[]) {
  const groups = new Map<string, StoryGroup>();
  items.forEach((item) => {
    const key = ownerKey(item);
    const current = groups.get(key);
    if (current) {
      if (current.items.length < MAX_STORIES_PER_OWNER) current.items.push(item);
      return;
    }
    groups.set(key, { key, label: ownerLabel(item), items: [item] });
  });
  return Array.from(groups.values()).slice(0, MAX_OWNER_BUBBLES);
}

async function readStories(response: Response) {
  if (!response.ok) return [] as StoryItem[];
  const payload = (await response.json().catch(() => null)) as StoriesResponse | null;
  return payload?.success && Array.isArray(payload.data) ? payload.data : [];
}

function listingHref(item: StoryItem) {
  const listingId = Number(item.listing_id || 0);
  const current = String(item.public_url || "").trim();
  if (!listingId) return current || "/cars";
  if (!current || /^\/listing\/\d+(?:[/?#]|$)/i.test(current)) return `/cars/${listingId}`;
  if (/^\/cars\/\d+(?:[/?#]|$)/i.test(current)) return `/cars/${listingId}`;
  return current;
}

function isDomesticYearStory(item: StoryItem) {
  const source = `${item.brand || ""} ${item.model || ""} ${item.title || ""}`.toLocaleLowerCase("fa");
  return DOMESTIC_YEAR_TOKENS.some((token) => source.includes(token.toLocaleLowerCase("fa")));
}

function displayStoryYear(item: StoryItem) {
  const raw = Number(String(item.year || "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return "";
  if (isDomesticYearStory(item)) return raw.toLocaleString("fa-IR", { useGrouping: false });
  const year = raw >= 1300 && raw <= 1499 ? raw + 621 : raw;
  return String(year);
}

function remainingStoryTime(expiresAt: string | null | undefined, nowMs: number) {
  if (!expiresAt) return "";
  const endMs = Date.parse(expiresAt);
  if (!Number.isFinite(endMs)) return "";
  const remaining = endMs - nowMs;
  if (remaining <= 0) return "پایان‌یافته";

  if (remaining < HOUR_MS) {
    const minutes = Math.max(1, Math.ceil(remaining / MINUTE_MS));
    return `${minutes.toLocaleString("fa-IR")} دقیقه مانده`;
  }

  if (remaining <= DAY_MS) {
    const hours = Math.ceil(remaining / HOUR_MS);
    return `${hours.toLocaleString("fa-IR")} ساعت مانده`;
  }

  const days = Math.floor(remaining / DAY_MS);
  const hours = Math.ceil((remaining % DAY_MS) / HOUR_MS);
  return hours > 0
    ? `${days.toLocaleString("fa-IR")} روز و ${hours.toLocaleString("fa-IR")} ساعت مانده`
    : `${days.toLocaleString("fa-IR")} روز مانده`;
}

export default function HomeStoriesUnified() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [location, setLocation] = useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [groupIndex, setGroupIndex] = useState<number | null>(null);
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dealerLogo, setDealerLogo] = useState("");
  const touchStartX = useRef<number | null>(null);

  const groups = useMemo(() => groupStories(stories), [stories]);
  const activeGroup = groupIndex === null ? null : groups[groupIndex] || null;
  const activeStory = activeGroup && itemIndex !== null ? activeGroup.items[itemIndex] || null : null;
  const expiryLabel = useMemo(
    () => remainingStoryTime(activeStory?.expires_at, nowMs),
    [activeStory?.expires_at, nowMs],
  );
  const storyYear = useMemo(() => (activeStory ? displayStoryYear(activeStory) : ""), [activeStory]);
  const vehicleMeta = useMemo(
    () => activeStory
      ? [activeStory.model, storyYear ? `مدل ${storyYear}` : ""].filter(Boolean).join(" · ")
      : "",
    [activeStory, storyYear],
  );
  const canPrevious = Boolean(
    activeGroup
      && itemIndex !== null
      && (itemIndex > 0 || (groupIndex !== null && groupIndex > 0)),
  );
  const canNext = Boolean(
    activeGroup
      && itemIndex !== null
      && (
        itemIndex < activeGroup.items.length - 1
        || (groupIndex !== null && groupIndex < groups.length - 1)
      ),
  );

  useEffect(() => {
    setLocation(loadHomeLocation());
    const change = (event: Event) => {
      const custom = event as CustomEvent<HomeLocationSelection>;
      setLocation(custom.detail || loadHomeLocation());
      setGroupIndex(null);
      setItemIndex(null);
    };
    window.addEventListener(HOME_LOCATION_EVENT, change);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, change);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const scopes = getHomeLocationScopes(location);
        const queries = location.mode === "all" || scopes.length === 0
          ? [new URLSearchParams({ scope: "all", limit: "80" })]
          : scopes.map((scope) => {
              const params = new URLSearchParams({ province: scope.province, limit: "80" });
              if (!scope.allCities) scope.cities.forEach((city) => params.append("cities[]", city));
              return params;
            });

        const batches = await Promise.all(
          queries.map(async (params) => {
            const [remote, local] = await Promise.all([
              fetch(`${API_BASE}/api/home-stories.php?${params.toString()}`, {
                method: "GET",
                cache: "no-store",
              }).then(readStories).catch(() => [] as StoryItem[]),
              fetch(`/api/stories/public?${params.toString()}`, {
                method: "GET",
                cache: "no-store",
              }).then(readStories).catch(() => [] as StoryItem[]),
            ]);
            return [...local, ...remote];
          }),
        );

        if (!ignore) {
          const merged = new Map<number, StoryItem>();
          batches.flat().forEach((item) => merged.set(item.story_id, item));
          setStories(Array.from(merged.values()));
        }
      } catch {
        if (!ignore) setStories([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => { ignore = true; };
  }, [location]);

  useEffect(() => {
    let ignore = false;
    setDealerLogo("");
    const dealerId = Number(activeStory?.dealer_id || 0);
    if (!activeStory || activeStory.listing_owner_type !== "dealer" || !Number.isSafeInteger(dealerId) || dealerId <= 0) {
      return () => { ignore = true; };
    }

    void fetch(`${API_BASE}/api/listings.php?limit=100&sort=vip`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as DealerIdentityResponse | null;
        const items = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.listings)
            ? payload.listings
            : [];
        const match = items.find((item) => Number(item.dealer_id || 0) === dealerId);
        if (!ignore) setDealerLogo(mediaUrl(match?.dealer_logo_url || ""));
      })
      .catch(() => {
        if (!ignore) setDealerLogo("");
      });

    return () => { ignore = true; };
  }, [activeStory?.dealer_id, activeStory?.listing_owner_type, activeStory?.story_id]);

  const track = useCallback((item: StoryItem) => {
    if (item.story_id >= LOCAL_STORY_ID_BASE) return;
    try {
      const payload = JSON.stringify({ story_id: item.story_id, event: "click" });
      if ("sendBeacon" in navigator) {
        navigator.sendBeacon(
          `${API_BASE}/api/story-track.php`,
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }
      fetch(`${API_BASE}/api/story-track.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // آمار نباید نمایش استوری را مختل کند.
    }
  }, []);

  const close = useCallback(() => {
    setGroupIndex(null);
    setItemIndex(null);
  }, []);

  function open(index: number) {
    const group = groups[index];
    if (!group?.items[0]) return;
    setNowMs(Date.now());
    setGroupIndex(index);
    setItemIndex(0);
    track(group.items[0]);
  }

  const previous = useCallback(() => {
    if (!activeGroup || itemIndex === null || groupIndex === null) return;

    if (itemIndex > 0) {
      const previousIndex = itemIndex - 1;
      setNowMs(Date.now());
      setItemIndex(previousIndex);
      track(activeGroup.items[previousIndex]);
      return;
    }

    const previousGroupIndex = groupIndex - 1;
    if (previousGroupIndex < 0) return;
    const previousGroup = groups[previousGroupIndex];
    const previousItemIndex = Math.max(previousGroup.items.length - 1, 0);
    const previousStory = previousGroup.items[previousItemIndex];
    if (!previousStory) return;

    setNowMs(Date.now());
    setGroupIndex(previousGroupIndex);
    setItemIndex(previousItemIndex);
    track(previousStory);
  }, [activeGroup, groupIndex, groups, itemIndex, track]);

  const next = useCallback(() => {
    if (!activeGroup || itemIndex === null || groupIndex === null) return;

    const nextItemIndex = itemIndex + 1;
    if (nextItemIndex < activeGroup.items.length) {
      setNowMs(Date.now());
      setItemIndex(nextItemIndex);
      track(activeGroup.items[nextItemIndex]);
      return;
    }

    const nextGroupIndex = groupIndex + 1;
    const nextGroup = groups[nextGroupIndex];
    const nextStory = nextGroup?.items[0];
    if (!nextStory) {
      close();
      return;
    }

    setNowMs(Date.now());
    setGroupIndex(nextGroupIndex);
    setItemIndex(0);
    track(nextStory);
  }, [activeGroup, close, groupIndex, groups, itemIndex, track]);

  useEffect(() => {
    if (!activeStory) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") next();
      if (event.key === "ArrowRight") previous();
    };

    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
    };
  }, [activeStory, close, next, previous]);

  useEffect(() => {
    if (!activeStory) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [activeStory?.story_id]);

  useEffect(() => {
    if (!activeStory || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(next, STORY_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeStory, itemIndex, next]);

  function touchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function touchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(end - start) < 48) return;
    if (end - start > 0) previous();
    else next();
  }

  return (
    <section className={styles.root} dir="rtl" aria-label="استوری‌های چاکود">
      <div className={styles.scroller}>
        <a className={styles.item} href="/account/stories" aria-label="انتخاب آگهی برای استوری شما">
          <span className={`${styles.ring} ${styles.ownRing}`}>
            <span className={`${styles.avatar} ${styles.ownAvatar}`}>
              <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
            </span>
          </span>
          <strong>استوری شما</strong>
        </a>

        {loading
          ? [1, 2, 3, 4, 5].map((value) => (
              <div className={styles.skeleton} key={value} aria-hidden="true">
                <div />
                <span />
              </div>
            ))
          : groups.map((group, index) => {
              const first = group.items[0];
              const image = first ? storyImage(first) : "";
              return (
                <button
                  type="button"
                  className={styles.item}
                  key={group.key}
                  onClick={() => open(index)}
                  aria-label={`بازکردن ${group.items.length.toLocaleString("fa-IR")} استوری از ${group.label}`}
                >
                  <span className={styles.ring}>
                    <span className={styles.avatar}>
                      {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <b>چ</b>}
                    </span>
                    {group.items.length > 1 ? (
                      <span className={styles.count}>{group.items.length.toLocaleString("fa-IR")}</span>
                    ) : null}
                  </span>
                  <strong>{shortTitle(group.label)}</strong>
                </button>
              );
            })}
      </div>

      {activeStory && activeGroup && itemIndex !== null ? (
        <div
          className={styles.viewer}
          role="dialog"
          aria-modal="true"
          aria-label={`استوری‌های ${activeGroup.label}`}
          onTouchStart={touchStart}
          onTouchEnd={touchEnd}
        >
          <button type="button" className={styles.backdrop} onClick={close} aria-label="بستن استوری" />

          <article className={styles.viewerCard}>
            <div className={styles.progress} aria-hidden="true">
              {activeGroup.items.map((story, index) => (
                <span key={story.story_id}>
                  <i
                    key={`${activeStory.story_id}-${index}`}
                    className={index < itemIndex ? styles.done : index === itemIndex ? styles.active : ""}
                  />
                </span>
              ))}
            </div>

            <div className={styles.top}>
              <div className={styles.identity}>
                <span className={styles.businessLogo}>
                  {dealerLogo ? (
                    <img src={dealerLogo} alt="" />
                  ) : (
                    <b>{activeGroup.label.trim().charAt(0) || "چ"}</b>
                  )}
                </span>
                <div>
                  <strong>{activeGroup.label}</strong>
                  <small>{storyLocation(activeStory)}</small>
                </div>
              </div>

              <div className={styles.topActions}>
                {expiryLabel ? (
                  <time className={styles.expiryBadge} dateTime={activeStory.expires_at || undefined}>
                    <span aria-hidden="true">◷</span>
                    {expiryLabel}
                  </time>
                ) : null}
                <button type="button" className={styles.close} onClick={close} aria-label="بستن">×</button>
              </div>
            </div>

            <div className={styles.media}>
              {activeStory.media_type === "video" && storyMedia(activeStory) ? (
                <video
                  key={activeStory.story_id}
                  src={storyMedia(activeStory)}
                  poster={storyImage(activeStory)}
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : storyMedia(activeStory) ? (
                <img key={activeStory.story_id} src={storyMedia(activeStory)} alt={activeStory.title} />
              ) : (
                <div className={styles.fallback}>چاکود</div>
              )}

              <div className={styles.shade} aria-hidden="true" />
              <div className={styles.details}>
                <h3>{activeStory.title}</h3>
                <strong className={styles.storyPrice}>{formatPrice(activeStory.price_toman)}</strong>
                {vehicleMeta ? <p>{vehicleMeta}</p> : null}
                <a href={listingHref(activeStory)}>مشاهده آگهی</a>
              </div>
            </div>

            {canPrevious || canNext ? (
              <>
                <button
                  type="button"
                  className={`${styles.nav} ${styles.prev}`}
                  onClick={previous}
                  disabled={!canPrevious}
                  aria-label="استوری قبلی"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${styles.nav} ${styles.next}`}
                  onClick={next}
                  disabled={!canNext}
                  aria-label="استوری بعدی"
                >
                  ›
                </button>
              </>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
