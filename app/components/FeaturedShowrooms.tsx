"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ShowroomCard, { type ShowroomCardData } from "./ShowroomCard";

const API_URL = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";

type Listing = {
  id: number;
  city: string;
  province: string;
  dealer_name: string | null;
  dealer_id?: number | string | null;
  dealer_logo_url?: string | null;
  dealer_logo?: string | null;
  logo_url?: string | null;
  dealer_verified?: boolean | number | null;
  is_dealer_verified?: boolean | number | null;
  dealer_is_verified?: boolean | number | null;
  cover_image: string | null;
  created_at: string;
};

type ListingsResponse = {
  success?: boolean;
  data?: Listing[];
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

function buildDealers(listings: Listing[]): DealerPreview[] {
  const map = new Map<string, DealerPreview>();

  for (const listing of listings) {
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
      listing.dealer_logo_url || listing.dealer_logo || listing.logo_url || null;
    const latestAt = new Date(listing.created_at).getTime() || 0;
    const current = map.get(key);

    if (current) {
      current.listingCount += 1;
      current.verified = current.verified || verified;
      current.latestAt = Math.max(current.latestAt, latestAt);
      if (!current.logoUrl && logoUrl) current.logoUrl = logoUrl;
      if (!current.coverImage && listing.cover_image) current.coverImage = listing.cover_image;
      if ((!current.city || current.city === "شهر نامشخص") && listing.city) {
        current.city = listing.city;
      }
      if (!current.province && listing.province) current.province = listing.province;
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

export default function FeaturedShowrooms() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

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
        const json: ListingsResponse = await response.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error("Invalid API response");
        setListings(json.data);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("featured-showrooms-fetch", error);
        setListings([]);
        setStatus("error");
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const dealers = useMemo(() => buildDealers(listings), [listings]);
  const featured = dealers.slice(0, 6);

  if (status === "error" || (status === "ready" && featured.length === 0)) {
    return null;
  }

  return (
    <section className="homeFeaturedShowrooms" dir="rtl" aria-label="نمایشگاه‌های منتخب چاکود">
      <div className="homeFeaturedShowroomsHeader">
        <div>
          <span>نمایشگاه‌های چاکود</span>
          <h2>نمایشگاه‌های منتخب</h2>
          <p>همان اطلاعات و همان کارت‌های صفحه نمایشگاه‌ها؛ با موجودی واقعی و اطلاعات به‌روز.</p>
        </div>

        <Link href="/dealerships" aria-label="مشاهده همه نمایشگاه‌ها">
          مشاهده همه
          <span aria-hidden="true">←</span>
        </Link>
      </div>

      {status === "loading" ? (
        <div className="homeFeaturedShowroomsLoading" aria-live="polite">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="homeFeaturedShowroomsGrid">
          {featured.map((dealer) => (
            <ShowroomCard key={dealer.key} showroom={dealer} />
          ))}
        </div>
      )}

      <style jsx global>{`
        .masterDealerSection {
          display: none !important;
        }

        .homeFeaturedShowrooms {
          width: min(1240px, calc(100% - 32px));
          margin: 18px auto 4px;
          padding: 26px;
          border: 1px solid #e6dcf5;
          border-radius: 30px;
          background:
            radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.11), transparent 21rem),
            linear-gradient(145deg, #ffffff, #faf7ff);
          box-shadow: 0 20px 56px rgba(42, 26, 68, 0.07);
          font-family: Tahoma, Arial, sans-serif;
        }

        .homeFeaturedShowroomsHeader {
          margin-bottom: 18px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 18px;
        }

        .homeFeaturedShowroomsHeader > div > span {
          color: #6d28d9;
          font-size: 10px;
          font-weight: 900;
        }

        .homeFeaturedShowroomsHeader h2 {
          margin: 5px 0 0;
          color: #17111f;
          font-size: 28px;
          line-height: 1.45;
        }

        .homeFeaturedShowroomsHeader p {
          margin: 7px 0 0;
          color: #786f82;
          font-size: 11px;
          line-height: 1.9;
        }

        .homeFeaturedShowroomsHeader > a {
          min-height: 39px;
          padding: 0 14px;
          border: 1px solid #ddd0ef;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #5b21b6;
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(35, 21, 55, 0.07);
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .homeFeaturedShowroomsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .homeFeaturedShowroomsLoading {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .homeFeaturedShowroomsLoading span {
          min-height: 270px;
          border-radius: 24px;
          background: linear-gradient(110deg, #f6f1fc 8%, #ffffff 18%, #f6f1fc 33%);
          background-size: 200% 100%;
          animation: homeShowroomShimmer 1.15s linear infinite;
        }

        @keyframes homeShowroomShimmer {
          to { background-position-x: -200%; }
        }

        @media (max-width: 900px) {
          .homeFeaturedShowroomsGrid,
          .homeFeaturedShowroomsLoading {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .homeFeaturedShowrooms {
            width: calc(100% - 20px);
            margin-top: 10px;
            padding: 18px 14px;
            border-radius: 24px;
          }

          .homeFeaturedShowroomsHeader {
            align-items: center;
          }

          .homeFeaturedShowroomsHeader h2 {
            font-size: 20px;
          }

          .homeFeaturedShowroomsHeader p {
            display: none;
          }

          .homeFeaturedShowroomsHeader > a {
            min-height: 34px;
            padding: 0 10px;
            border: 0;
            background: transparent;
            box-shadow: none;
            font-size: 8px;
          }

          .homeFeaturedShowroomsGrid,
          .homeFeaturedShowroomsLoading {
            grid-template-columns: none;
            grid-auto-flow: column;
            grid-auto-columns: min(82vw, 304px);
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 6px;
            scroll-snap-type: inline mandatory;
            scrollbar-width: none;
          }

          .homeFeaturedShowroomsGrid::-webkit-scrollbar,
          .homeFeaturedShowroomsLoading::-webkit-scrollbar {
            display: none;
          }

          .homeFeaturedShowroomsGrid > *,
          .homeFeaturedShowroomsLoading > * {
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
}
