"use client";

import Link from "next/link";
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
  dealer_slug?: string | null;
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

type Props = {
  location: string;
  query: string;
};

const FALLBACK_CARDS = [
  {
    title: "نمایشگاه‌های منتخب چاکود",
    description: "مجموعه‌های حرفه‌ای با ویترین اختصاصی و آگهی‌های فعال",
    label: "مشاهده نمایشگاه‌ها",
  },
  {
    title: "فروشندگان حرفه‌ای خودرو",
    description: "دسترسی مستقیم به خودروها و اطلاعات هر مجموعه",
    label: "ورود به ویترین‌ها",
  },
  {
    title: "همکاری با نمایشگاه‌ها",
    description: "ساخت ویترین حرفه‌ای و معرفی بهتر خودروهای موجود",
    label: "ثبت نمایشگاه",
  },
] as const;

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

function listingTime(listing: ApiListing) {
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
  const dealers = new Map<string, DealerPreview>();
  const ordered = [...listings].sort(
    (a, b) => listingTime(b) - listingTime(a),
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
    const current = dealers.get(key);

    if (current) {
      current.listingCount += 1;
      current.verified = current.verified || verified;
      current.latestAt = Math.max(current.latestAt, listingTime(listing));
      if (!current.slug && listing.dealer_slug) current.slug = listing.dealer_slug;
      if (!current.logoUrl && logoUrl) current.logoUrl = logoUrl;
      if (!current.coverImage && listing.cover_image) {
        current.coverImage = listing.cover_image;
      }
      if (
        (current.latestListings?.length || 0) < 3 &&
        !current.latestListings?.some(
          (item) => String(item.id) === String(listing.id),
        )
      ) {
        current.latestListings = [
          ...(current.latestListings || []),
          listingPreview(listing),
        ];
      }
      continue;
    }

    dealers.set(key, {
      key,
      slug: listing.dealer_slug || null,
      name,
      city: listing.city || "شهر نامشخص",
      province: listing.province || "",
      listingCount: 1,
      logoUrl,
      coverImage: listing.cover_image || null,
      verified,
      latestAt: listingTime(listing),
      latestListings: [listingPreview(listing)],
    });
  }

  return Array.from(dealers.values()).sort(
    (a, b) =>
      Number(Boolean(b.verified)) - Number(Boolean(a.verified)) ||
      b.listingCount - a.listingCount ||
      b.latestAt - a.latestAt ||
      a.name.localeCompare(b.name, "fa"),
  );
}

function matchesLocation(dealer: DealerPreview, location: string) {
  if (!location || location === "همه شهرها") return true;
  return normalizeText(`${dealer.province || ""} ${dealer.city}`).includes(
    normalizeText(location),
  );
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

export default function HomeFeaturedShowrooms({ location, query }: Props) {
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

  const showFallback = status !== "ready" || dealers.length === 0;

  return (
    <section className={styles.dealerSection} id="showrooms">
      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.eyebrow}>نمایشگاه‌های چاکود</span>
          <h2>نمایشگاه‌های منتخب</h2>
        </div>

        <div className={styles.sectionActions}>
          <Link href="/showrooms">
            مشاهده همه
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </div>

      {showFallback ? (
        <div
          className="featuredShowroomFallbackRail"
          aria-live={status === "loading" ? "polite" : undefined}
        >
          {FALLBACK_CARDS.map((card, index) => (
            <Link
              className="featuredShowroomFallbackCard"
              href="/showrooms"
              key={card.title}
            >
              <span className="featuredShowroomFallbackVisual">
                <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
                <i>{String(index + 1).padStart(2, "0")}</i>
              </span>
              <span className="featuredShowroomFallbackCopy">
                <strong>{card.title}</strong>
                <small>{card.description}</small>
                <b>
                  {card.label}
                  <span aria-hidden="true">←</span>
                </b>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.dealerRail}>
          {dealers.map((dealer) => (
            <ShowroomCard key={dealer.key} showroom={dealer} />
          ))}
        </div>
      )}

      <style>{`
        .featuredShowroomFallbackRail {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          padding-bottom: 24px;
        }

        .featuredShowroomFallbackCard {
          min-height: 230px;
          padding: 22px;
          border: 1px solid #e4d8f1;
          border-radius: 24px;
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          align-items: center;
          gap: 18px;
          color: #21152f;
          background:
            radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.12), transparent 14rem),
            linear-gradient(145deg, #ffffff, #faf7ff);
          box-shadow: 0 16px 42px rgba(42, 26, 68, 0.075);
          transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
        }

        .featuredShowroomFallbackCard:hover {
          transform: translateY(-3px);
          border-color: #cdb7e8;
          box-shadow: 0 22px 50px rgba(42, 26, 68, 0.12);
        }

        .featuredShowroomFallbackVisual {
          position: relative;
          width: 92px;
          height: 118px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          background: linear-gradient(155deg, #f2eaff, #ffffff);
          box-shadow: inset 0 0 0 1px rgba(109, 40, 217, 0.1);
        }

        .featuredShowroomFallbackVisual img {
          width: 52px;
          height: 64px;
          object-fit: contain;
        }

        .featuredShowroomFallbackVisual i {
          position: absolute;
          left: 8px;
          bottom: 7px;
          color: #8b5cf6;
          font-size: 9px;
          font-style: normal;
          font-weight: 900;
        }

        .featuredShowroomFallbackCopy,
        .featuredShowroomFallbackCopy strong,
        .featuredShowroomFallbackCopy small {
          display: block;
        }

        .featuredShowroomFallbackCopy strong {
          font-size: 15px;
          line-height: 1.7;
        }

        .featuredShowroomFallbackCopy small {
          margin-top: 8px;
          color: #786d82;
          font-size: 10px;
          line-height: 1.9;
        }

        .featuredShowroomFallbackCopy b {
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #6d28d9;
          font-size: 9px;
          font-weight: 900;
        }

        @media (max-width: 960px) {
          .featuredShowroomFallbackRail {
            grid-template-columns: 1fr;
            gap: 11px;
          }

          .featuredShowroomFallbackCard {
            min-height: 150px;
          }
        }

        @media (max-width: 560px) {
          .featuredShowroomFallbackCard {
            min-height: 128px;
            padding: 14px;
            grid-template-columns: 70px minmax(0, 1fr);
            gap: 12px;
            border-radius: 19px;
          }

          .featuredShowroomFallbackVisual {
            width: 70px;
            height: 92px;
            border-radius: 17px;
          }

          .featuredShowroomFallbackVisual img {
            width: 40px;
            height: 50px;
          }

          .featuredShowroomFallbackCopy strong {
            font-size: 13px;
          }

          .featuredShowroomFallbackCopy small {
            font-size: 8px;
          }

          .featuredShowroomFallbackCopy b {
            margin-top: 10px;
            font-size: 8px;
          }
        }
      `}</style>
    </section>
  );
}
