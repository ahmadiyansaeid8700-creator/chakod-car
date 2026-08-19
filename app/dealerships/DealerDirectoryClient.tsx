"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../components/MobileBottomNav";
import styles from "./page.module.css";

type PublicBusiness = {
  id: number;
  slug: string;
  name: string;
  province: string;
  city: string;
  neighborhood: string;
  logo_url: string;
  cover_url: string;
  is_verified: boolean;
};

type BusinessesResponse = {
  success?: boolean;
  message?: string;
  items?: PublicBusiness[];
};

type FeaturedPlacement = {
  dealer_id?: number;
  dealer_name?: string;
  province?: string;
  desktop_banner_url?: string;
  mobile_banner_url?: string;
  listing_ids?: number[];
};

type FeaturedResponse = {
  success?: boolean;
  data?: FeaturedPlacement[];
};

type Vehicle = {
  id: number;
  title?: string;
  cover_image?: string;
};

type VehicleResponse = {
  success?: boolean;
  data?: Vehicle[];
};

type SelectedShowroom = {
  dealerId: number;
  name: string;
  province: string;
  city: string;
  logoUrl: string;
  fallbackCover: string;
  desktopBanner: string;
  mobileBanner: string;
  listingIds: number[];
  profileHref: string;
};

const API_MEDIA_ORIGIN = "https://api.chakod.com";
const SITE_MEDIA_ORIGIN = "https://chakod.com";

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function mediaUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalizedRaw = raw.startsWith("//") ? `https:${raw}` : raw;
  if (/^https?:\/\//i.test(normalizedRaw)) {
    try {
      const url = new URL(normalizedRaw);
      const hostname = url.hostname.toLowerCase();
      if (url.protocol === "http:" && (hostname === "chakod.com" || hostname === "api.chakod.com")) {
        url.protocol = "https:";
      }
      if (hostname === "api.chakod.com" && url.pathname.startsWith("/uploads/")) {
        url.hostname = "chakod.com";
        url.protocol = "https:";
      }
      return url.toString();
    } catch {
      return normalizedRaw;
    }
  }

  const path = normalizedRaw.startsWith("/") ? normalizedRaw : `/${normalizedRaw}`;
  try {
    return new URL(path, path.startsWith("/uploads/") ? SITE_MEDIA_ORIGIN : API_MEDIA_ORIGIN).toString();
  } catch {
    return normalizedRaw;
  }
}

function safeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Math.round(Number(item || 0)))
        .filter((item) => Number.isSafeInteger(item) && item > 0),
    ),
  ).slice(0, 3);
}

function ShowroomBanner({ showroom }: { showroom: SelectedShowroom }) {
  const desktop = mediaUrl(showroom.desktopBanner || showroom.mobileBanner || showroom.fallbackCover);
  const mobile = mediaUrl(showroom.mobileBanner || showroom.desktopBanner || showroom.fallbackCover);
  const fallback = mediaUrl(showroom.fallbackCover);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [desktop, mobile]);

  if (failed) {
    return fallback
      ? <img src={fallback} alt="" loading="eager" />
      : <span className={styles.bannerFallback} />;
  }
  if (!desktop && !mobile) return <span className={styles.bannerFallback} />;

  return (
    <picture>
      {mobile ? <source media="(max-width: 700px)" srcSet={mobile} /> : null}
      <img
        src={desktop || mobile}
        alt=""
        loading="eager"
        onError={() => setFailed(true)}
      />
    </picture>
  );
}

function VehicleStrip({ ids }: { ids: number[] }) {
  const idsKey = safeIds(ids).join(",");
  const requested = useMemo(() => (idsKey ? idsKey.split(",").map(Number) : []), [idsKey]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(Boolean(idsKey));

  useEffect(() => {
    if (!idsKey) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/compare-listings?ids=${encodeURIComponent(idsKey)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as VehicleResponse | null;
        if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
          setVehicles([]);
          return;
        }
        const order = new Map(requested.map((id, index) => [id, index]));
        setVehicles(
          payload.data
            .filter((item) => requested.includes(Number(item.id)))
            .sort((a, b) => (order.get(Number(a.id)) ?? 99) - (order.get(Number(b.id)) ?? 99))
            .slice(0, 3),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setVehicles([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [idsKey, requested]);

  if (!idsKey) return null;

  if (loading) {
    return (
      <div className={styles.vehicleStrip} aria-label="در حال دریافت خودروهای نمایشگاه">
        {requested.map((id) => <span className={styles.vehicleSkeleton} key={id} />)}
      </div>
    );
  }

  if (!vehicles.length) return null;

  return (
    <div className={styles.vehicleStrip} aria-label="نمونه خودروهای نمایشگاه">
      {vehicles.map((vehicle) => (
        <a
          className={styles.vehicleThumb}
          href={`/cars/${vehicle.id}`}
          key={vehicle.id}
          aria-label={String(vehicle.title || `خودرو ${vehicle.id}`)}
        >
          {vehicle.cover_image ? (
            <img
              src={mediaUrl(vehicle.cover_image)}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </a>
      ))}
    </div>
  );
}

export default function DealerDirectoryClient() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [selected, setSelected] = useState<SelectedShowroom[]>([]);
  const [ordinary, setOrdinary] = useState<PublicBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "24", type: "dealer" });
    if (deferredQuery) params.set("q", deferredQuery);

    setLoading(true);
    setError("");

    Promise.all([
      fetch(`/api/businesses?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      fetch("/api/featured-showrooms", {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
    ])
      .then(async ([businessResponse, featuredResponse]) => {
        const businessesPayload = (await businessResponse.json().catch(() => null)) as BusinessesResponse | null;
        const featuredPayload = (await featuredResponse.json().catch(() => null)) as FeaturedResponse | null;

        if (!businessResponse.ok || !businessesPayload?.success) {
          throw new Error(businessesPayload?.message || "دریافت نمایشگاه‌ها انجام نشد.");
        }

        const base = Array.isArray(businessesPayload.items) ? businessesPayload.items : [];
        const placements = featuredResponse.ok && featuredPayload?.success && Array.isArray(featuredPayload.data)
          ? featuredPayload.data
          : [];

        const byId = new Map<number, PublicBusiness>();
        const byName = new Map<string, PublicBusiness>();
        base.forEach((business) => {
          const businessId = Math.round(Number(business.id || 0));
          if (Number.isSafeInteger(businessId) && businessId > 0 && !byId.has(businessId)) {
            byId.set(businessId, business);
          }
          const key = normalizeText(business.name);
          if (key && !byName.has(key)) byName.set(key, business);
        });

        const usedBusinessIds = new Set<number>();
        const seenDealers = new Set<number>();
        const queryKey = normalizeText(deferredQuery);
        const featuredItems: SelectedShowroom[] = [];

        placements.forEach((placement) => {
          const dealerId = Math.round(Number(placement.dealer_id || 0));
          if (!Number.isSafeInteger(dealerId) || dealerId <= 0 || seenDealers.has(dealerId)) return;
          seenDealers.add(dealerId);

          const name = String(placement.dealer_name || "").trim() || `نمایشگاه ${dealerId}`;
          const matched = byId.get(dealerId) || byName.get(normalizeText(name));
          const province = String(placement.province || matched?.province || "").trim();
          const city = String(matched?.city || "").trim();
          const searchable = normalizeText(`${name} ${province} ${city}`);
          if (queryKey && !searchable.includes(queryKey)) return;

          if (matched) usedBusinessIds.add(Number(matched.id));
          featuredItems.push({
            dealerId,
            name,
            province,
            city,
            logoUrl: String(matched?.logo_url || ""),
            fallbackCover: String(matched?.cover_url || ""),
            desktopBanner: String(placement.desktop_banner_url || ""),
            mobileBanner: String(placement.mobile_banner_url || ""),
            listingIds: safeIds(placement.listing_ids),
            profileHref: matched?.slug
              ? `/businesses/${encodeURIComponent(matched.slug)}`
              : `/showrooms/${dealerId}`,
          });
        });

        setSelected(featuredItems);
        setOrdinary(base.filter((business) => !usedBusinessIds.has(Number(business.id))));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSelected([]);
        setOrdinary([]);
        setError(reason instanceof Error ? reason.message : "دریافت نمایشگاه‌ها انجام نشد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [deferredQuery]);

  const total = selected.length + ordinary.length;

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.desktopHeader}>
        <a href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></a>
        <nav>
          <button type="button" onClick={() => window.history.back()}>بازگشت</button>
          <a href="/">صفحه اصلی</a>
          <a href="/account">حساب من</a>
        </nav>
      </header>

      <header className={styles.mobileHeader}>
        <button type="button" onClick={() => window.history.back()} aria-label="برگشت">‹</button>
        <strong>نمایشگاه‌ها</strong>
        <a href="/" aria-label="صفحه اصلی"><img src="/brand/chakod-symbol.png" alt="" /></a>
      </header>

      <div className={styles.searchBar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجو"
          aria-label="جستجوی نمایشگاه"
        />
      </div>

      <section className={styles.content}>
        <div className={styles.resultMeta}>{loading ? "در حال دریافت…" : `${total.toLocaleString("fa-IR")} نمایشگاه`}</div>

        {error ? <div className={styles.stateError}>{error}</div> : null}

        {!loading && !error && selected.length ? (
          <div className={styles.selectedGrid}>
            {selected.map((showroom) => (
              <article className={styles.selectedCard} key={showroom.dealerId}>
                <a className={styles.banner} href={showroom.profileHref}>
                  <ShowroomBanner showroom={showroom} />
                  <span>منتخب چاکود</span>
                </a>

                <div className={styles.showroomIdentity}>
                  <div className={styles.showroomLogo}>
                    {showroom.logoUrl ? <img src={mediaUrl(showroom.logoUrl)} alt="" /> : <b>{showroom.name.slice(0, 1)}</b>}
                  </div>
                  <div>
                    <h2>{showroom.name}</h2>
                    <p>{[showroom.city, showroom.province].filter(Boolean).join("، ") || "نمایشگاه خودرو"}</p>
                  </div>
                </div>

                <VehicleStrip ids={showroom.listingIds} />

                <a className={styles.primaryAction} href={showroom.profileHref}>مشاهده نمایشگاه</a>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && !error && ordinary.length ? (
          <div className={styles.ordinaryGrid}>
            {ordinary.map((business) => {
              const href = `/businesses/${encodeURIComponent(business.slug)}`;
              return (
                <article className={styles.ordinaryCard} key={business.id}>
                  <a className={styles.ordinaryMedia} href={href}>
                    {business.cover_url ? <img src={mediaUrl(business.cover_url)} alt="" loading="lazy" /> : <span />}
                    <div className={styles.ordinaryLogo}>
                      {business.logo_url ? <img src={mediaUrl(business.logo_url)} alt="" /> : <b>{business.name.slice(0, 1)}</b>}
                    </div>
                  </a>
                  <div className={styles.ordinaryBody}>
                    <h3>{business.name}</h3>
                    <p>{[business.city, business.province].filter(Boolean).join("، ") || "نمایشگاه خودرو"}</p>
                    <a href={href}>مشاهده نمایشگاه</a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && !error && total === 0 ? <div className={styles.empty}>نمایشگاهی پیدا نشد.</div> : null}
      </section>

      <MobileBottomNav />
    </main>
  );
}
