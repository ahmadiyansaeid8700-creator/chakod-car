"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./HomeFeaturedShowrooms.module.css";
import ShowroomCard, {
  type ShowroomCardData,
  type ShowroomListingPreview,
} from "./ShowroomCard";

const API_URL = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";

type ApiListing = {
  id: number | string;
  title: string;
  city?: string | null;
  province?: string | null;
  dealer_name?: string | null;
  dealer_id?: number | string | null;
  dealer_logo_url?: string | null;
  dealer_logo?: string | null;
  logo_url?: string | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  dealer_is_verified?: boolean | number | null;
  cover_image?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  success?: boolean;
  data?: ApiListing[];
};

type DealerPreview = ShowroomCardData & {
  latestAt: number;
};

function normalizeText(value: string) {
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

function getListingTime(listing: ApiListing) {
  return new Date(listing.created_at || 0).getTime() || 0;
}

function listingPreview(listing: ApiListing): ShowroomListingPreview {
  return {
    id: listing.id,
    title: listing.title || "آگهی خودرو",
    image: listing.cover_image || null,
  };
}

function buildDealers(listings: ApiListing[]): DealerPreview[] {
  const map = new Map<string, DealerPreview>();
  const ordered = [...listings].sort(
    (a, b) => getListingTime(b) - getListingTime(a),
  );

  for (const listing of ordered) {
    const name = listing.dealer_name?.trim();
    if (!name) continue;

    const key = listing.dealer_id
      ? `id:${listing.dealer_id}`
      : `name:${normalizeText(name)}`;
    const verified = Boolean(
      listing.dealer_verified ||
        listing.is_dealer_verified ||
        listing.dealer_is_verified,
    );
    const logoUrl =
      listing.dealer_logo_url ||
      listing.dealer_logo ||
      listing.logo_url ||
      null;
    const latestAt = getListingTime(listing);
    const current = map.get(key);

    if (current) {
      current.listingCount += 1;
      current.verified = current.verified || verified;
      current.latestAt = Math.max(current.latestAt, latestAt);
      if (!current.logoUrl && logoUrl) current.logoUrl = logoUrl;
      if (!current.coverImage && listing.cover_image) {
        current.coverImage = listing.cover_image;
      }
      if (
        (current.latestListings?.length || 0) < 3 &&
        !current.latestListings?.some(
          (preview) => String(preview.id) === String(listing.id),
        )
      ) {
        current.latestListings = [
          ...(current.latestListings || []),
          listingPreview(listing),
        ];
      }
      if ((!current.city || current.city === "شهر نامشخص") && listing.city) {
        current.city = listing.city;
      }
      if (!current.province && listing.province) {
        current.province = listing.province;
      }
      continue;
    }

    map.set(key, {
      key,
      name,
      city: listing.city || "شهر نامشخص",
      province: listing.province || "",
      listingCount: 1,
      logoUrl,
      coverImage: listing.cover_image || null,
      verified,
      latestAt,
      latestListings: [listingPreview(listing)],
    });
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      Number(Boolean(b.verified)) - Number(Boolean(a.verified)) ||
      b.listingCount - a.listingCount ||
      b.latestAt - a.latestAt ||
      a.name.localeCompare(b.name, "fa"),
  );
}

function matchesLocation(dealer: DealerPreview, location: string) {
  if (location === "همه شهرها") return true;

  const haystack = normalizeText(`${dealer.province || ""} ${dealer.city}`);

  if (location === "گیلان") {
    return haystack.includes(normalizeText("گیلان")) || haystack.includes("انزلی");
  }
  if (location === "مازندران") {
    return haystack.includes(normalizeText("مازندران"));
  }
  if (location.includes("انزلی")) return haystack.includes("انزلی");
  if (location.includes("ارس")) return haystack.includes("ارس");

  return haystack.includes(normalizeText(location));
}

function matchesQuery(dealer: DealerPreview, query: string) {
  if (!query.trim()) return true;

  const listingTitles = (dealer.latestListings || [])
    .map((listing) => listing.title)
    .join(" ");
  return normalizeText(
    `${dealer.name} ${dealer.city} ${dealer.province || ""} ${listingTitles}`,
  ).includes(normalizeText(query));
}

export default function HomeFeaturedShowrooms({
  location,
  query,
}: {
  location: string;
  query: string;
}) {
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = (await response.json()) as ApiResponse;
        if (!payload.success || !Array.isArray(payload.data)) {
          throw new Error("Invalid listings response");
        }

        setListings(payload.data);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const dealers = useMemo(
    () =>
      buildDealers(listings)
        .filter(
          (dealer) =>
            matchesLocation(dealer, location) && matchesQuery(dealer, query),
        )
        .slice(0, 8),
    [listings, location, query],
  );

  return (
    <section className={styles.dealerSection} id="dealers">
      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.eyebrow}>SHOWROOMS OF CHAKOD</span>
          <h2>نمایشگاه‌های منتخب</h2>
        </div>
        <div className={styles.sectionActions}>
          <a href="/showrooms">
            نمایش همه
            <span aria-hidden="true">←</span>
          </a>
        </div>
      </div>

      {status === "loading" ? (
        <div
          className={styles.skeletonRail}
          aria-label="در حال دریافت نمایشگاه‌ها"
          aria-live="polite"
        >
          {[0, 1, 2].map((item) => (
            <div className={styles.skeletonCard} key={item} aria-hidden="true">
              <span className={styles.skeletonCover} />
              <span className={styles.skeletonLogo} />
              <span className={styles.skeletonTitle} />
              <span className={styles.skeletonMeta} />
              <span className={styles.skeletonProducts} />
              <span className={styles.skeletonButton} />
            </div>
          ))}
        </div>
      ) : status === "error" ? (
        <div className={styles.compactEmpty} role="status">
          <strong>ویترین نمایشگاه‌ها موقتاً در دسترس نیست</strong>
          <span>از صفحهٔ همه نمایشگاه‌ها دوباره تلاش کن.</span>
        </div>
      ) : dealers.length ? (
        <div className={styles.dealerRail}>
          {dealers.map((dealer) => (
            <ShowroomCard key={dealer.key} showroom={dealer} />
          ))}
        </div>
      ) : (
        <div className={styles.compactEmpty}>
          <strong>نمایشگاهی در این محدوده پیدا نشد</strong>
          <span>لوکیشن یا عبارت جست‌وجو را تغییر بده.</span>
        </div>
      )}
    </section>
  );
}
