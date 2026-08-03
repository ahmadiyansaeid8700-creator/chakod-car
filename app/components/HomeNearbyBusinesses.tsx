"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  getHomeLocationScopes,
  loadHomeLocation,
  type HomeLocationSelection,
} from "./home-location";

const API_BASE = "https://api.chakod.com";
const ENDPOINTS = [
  `${API_BASE}/api/businesses.php`,
  `${API_BASE}/api/public-businesses.php`,
  `${API_BASE}/api/business-directory.php`,
];

type UnknownRecord = Record<string, unknown>;

type BusinessPreview = {
  id: string;
  slug: string;
  name: string;
  type: string;
  province: string;
  city: string;
  neighborhood: string;
  imageUrl: string;
  verified: boolean;
  featured: boolean;
  categories: string[];
};

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function toAbsoluteUrl(value: unknown) {
  const url = text(value);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[\u200c\u200f\s_-]+/g, "");
}

function readArray(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is UnknownRecord => Boolean(item && typeof item === "object"),
    );
  }

  if (!payload || typeof payload !== "object") return [];
  const root = payload as UnknownRecord;
  const directCandidates = [root.data, root.items, root.businesses, root.results];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is UnknownRecord => Boolean(item && typeof item === "object"),
      );
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate as UnknownRecord;
      for (const value of [nested.data, nested.items, nested.businesses, nested.results]) {
        if (Array.isArray(value)) {
          return value.filter(
            (item): item is UnknownRecord =>
              Boolean(item && typeof item === "object"),
          );
        }
      }
    }
  }

  return [];
}

function readCategories(row: UnknownRecord) {
  const value =
    row.categories ??
    row.category_names ??
    row.services ??
    row.business_categories ??
    row.subcategories;

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          const record = item as UnknownRecord;
          return text(record.title ?? record.name ?? record.label);
        }
        return text(item);
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  return text(value)
    .split(/[،,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function mapBusiness(row: UnknownRecord, index: number): BusinessPreview | null {
  const id = text(row.id ?? row.business_id ?? row.center_id ?? index + 1);
  const name = text(
    row.name ?? row.business_name ?? row.title ?? row.center_name ?? row.store_name,
  );

  if (!name) return null;

  return {
    id,
    slug: text(row.slug ?? row.business_slug ?? row.public_slug),
    name,
    type: text(row.business_type ?? row.type ?? row.account_type ?? row.kind),
    province: text(row.province ?? row.address_province ?? row.state),
    city: text(row.city ?? row.address_city),
    neighborhood: text(row.neighborhood ?? row.district ?? row.area),
    imageUrl: toAbsoluteUrl(
      row.cover_image ??
        row.cover_image_url ??
        row.logo_url ??
        row.logo ??
        row.image_url ??
        row.image,
    ),
    verified: bool(row.verified ?? row.is_verified ?? row.approved),
    featured: bool(row.featured ?? row.is_featured ?? row.show_on_home),
    categories: readCategories(row),
  };
}

function typeLabel(value: string) {
  const normalized = normalize(value);
  if (normalized.includes("dealer") || normalized.includes("showroom")) {
    return "نمایشگاه خودرو";
  }
  if (normalized.includes("workshop") || normalized.includes("repair")) {
    return "تعمیرگاه خودرو";
  }
  if (normalized.includes("part") || normalized.includes("store")) {
    return "فروشگاه قطعات";
  }
  return "مرکز خدمات خودرو";
}

function buildQueries(location: HomeLocationSelection) {
  const scopes = getHomeLocationScopes(location);
  if (location.mode === "all" || scopes.length === 0) {
    return [new URLSearchParams({ featured: "1", status: "approved", limit: "8" })];
  }

  return scopes.map((scope) => {
    const params = new URLSearchParams({
      featured: "1",
      status: "approved",
      limit: "8",
      province: scope.province,
    });

    if (!scope.allCities) {
      scope.cities.forEach((city) => params.append("cities[]", city));
    }

    return params;
  });
}

async function requestBusinesses(
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<UnknownRecord[]> {
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal,
      });

      if (!response.ok) continue;
      const payload: unknown = await response.json();
      const items = readArray(payload);
      if (items.length > 0) return items;
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
    }
  }

  return [];
}

export default function HomeNearbyBusinesses() {
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [businesses, setBusinesses] = useState<BusinessPreview[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocation(loadHomeLocation());

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setReady(false);

    async function load() {
      try {
        const responses = await Promise.all(
          buildQueries(location).map((params) =>
            requestBusinesses(params, controller.signal),
          ),
        );

        const merged = new Map<string, BusinessPreview>();
        responses.flat().forEach((row, index) => {
          const item = mapBusiness(row, index);
          if (item) merged.set(item.id || item.slug || item.name, item);
        });

        setBusinesses(
          Array.from(merged.values())
            .sort(
              (a, b) =>
                Number(b.featured) - Number(a.featured) ||
                Number(b.verified) - Number(a.verified) ||
                a.name.localeCompare(b.name, "fa"),
            )
            .slice(0, 6),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") setBusinesses([]);
      } finally {
        if (!controller.signal.aborted) setReady(true);
      }
    }

    void load();
    return () => controller.abort();
  }, [location]);

  const title = useMemo(
    () =>
      location.mode === "all"
        ? "کسب‌وکارهای منتخب چاکود"
        : `کسب‌وکارهای منتخب ${location.label}`,
    [location],
  );

  if (!ready || businesses.length === 0) return null;

  return (
    <section className="homeNearbyBusinesses" dir="rtl">
      <div className="homeNearbyHeader">
        <div>
          <span>نزدیک شما</span>
          <h2>{title}</h2>
          <p>مراکز تأییدشده و فعال را بر اساس محدوده انتخابی ببین.</p>
        </div>
        <Link href="/businesses">مشاهده همه</Link>
      </div>

      <div className="homeNearbyGrid">
        {businesses.map((business) => {
          const href = `/businesses/${encodeURIComponent(
            business.slug || business.id,
          )}`;
          const locationText = [business.city, business.neighborhood]
            .filter(Boolean)
            .join("، ");

          return (
            <Link className="homeNearbyCard" href={href} key={business.id}>
              <span className="homeNearbyImage">
                {business.imageUrl ? (
                  <img src={business.imageUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <b>{business.name.slice(0, 1)}</b>
                )}
              </span>

              <span className="homeNearbyCopy">
                <span className="homeNearbyMeta">
                  <em>{typeLabel(business.type)}</em>
                  {business.verified ? <i>تأییدشده</i> : null}
                </span>
                <strong>{business.name}</strong>
                <small>{locationText || business.province || "ایران"}</small>
                {business.categories.length > 0 ? (
                  <span className="homeNearbyTags">
                    {business.categories.map((item) => (
                      <b key={item}>{item}</b>
                    ))}
                  </span>
                ) : null}
              </span>

              <span className="homeNearbyArrow" aria-hidden="true">←</span>
            </Link>
          );
        })}
      </div>

      <style>{`
        .homeNearbyBusinesses {
          width: min(1240px, calc(100% - 32px));
          margin: 4px auto 22px;
          padding: 25px 26px;
          border: 1px solid #e9e0f3;
          border-radius: 27px;
          background: linear-gradient(145deg, #ffffff 0%, #fbf9ff 100%);
          box-shadow: 0 16px 42px rgba(48, 30, 70, 0.065);
          font-family: Tahoma, Arial, sans-serif;
        }

        .homeNearbyHeader {
          margin-bottom: 16px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
        }

        .homeNearbyHeader span {
          color: #6d28d9;
          font-size: 9px;
          font-weight: 950;
        }

        .homeNearbyHeader h2 {
          margin: 4px 0 0;
          color: #21152f;
          font-size: clamp(21px, 2vw, 29px);
          line-height: 1.5;
        }

        .homeNearbyHeader p {
          margin: 5px 0 0;
          color: #81758b;
          font-size: 10px;
          line-height: 1.85;
        }

        .homeNearbyHeader > a {
          min-height: 38px;
          padding: 0 13px;
          border: 1px solid #decff0;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          color: #4c1d95;
          background: #ffffff;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
        }

        .homeNearbyGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 11px;
        }

        .homeNearbyCard {
          min-width: 0;
          min-height: 106px;
          padding: 12px;
          border: 1px solid #e7ddf0;
          border-radius: 18px;
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr) 18px;
          align-items: center;
          gap: 11px;
          color: #251735;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 10px 26px rgba(48, 30, 70, 0.045);
          transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
        }

        .homeNearbyCard:hover {
          transform: translateY(-3px);
          border-color: #d2bee8;
          box-shadow: 0 16px 34px rgba(48, 30, 70, 0.085);
        }

        .homeNearbyImage {
          width: 72px;
          height: 72px;
          overflow: hidden;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: linear-gradient(145deg, #f3edff, #ffffff);
          font-size: 24px;
          font-weight: 950;
        }

        .homeNearbyImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .homeNearbyCopy {
          min-width: 0;
        }

        .homeNearbyMeta,
        .homeNearbyTags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
        }

        .homeNearbyMeta em,
        .homeNearbyMeta i,
        .homeNearbyTags b {
          min-height: 22px;
          padding: 0 7px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          font-size: 7px;
          font-style: normal;
          font-weight: 900;
        }

        .homeNearbyMeta em {
          color: #5f4777;
          background: #f3edfa;
        }

        .homeNearbyMeta i {
          color: #08735c;
          background: #e7f8f3;
        }

        .homeNearbyCopy > strong,
        .homeNearbyCopy > small {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .homeNearbyCopy > strong {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 950;
        }

        .homeNearbyCopy > small {
          margin-top: 4px;
          color: #857a8e;
          font-size: 8px;
        }

        .homeNearbyTags {
          margin-top: 7px;
        }

        .homeNearbyTags b {
          color: #725c82;
          background: #f7f3fa;
          font-weight: 800;
        }

        .homeNearbyArrow {
          color: #8b5fc5;
          font-size: 18px;
        }

        @media (max-width: 940px) {
          .homeNearbyGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .homeNearbyBusinesses {
            width: calc(100% - 20px);
            margin-bottom: 16px;
            padding: 18px 14px;
            border-radius: 21px;
          }

          .homeNearbyHeader {
            align-items: flex-start;
            margin-bottom: 12px;
          }

          .homeNearbyHeader h2 {
            font-size: 18px;
          }

          .homeNearbyHeader p {
            display: none;
          }

          .homeNearbyHeader > a {
            min-height: 32px;
            padding: 0 9px;
            font-size: 8px;
          }

          .homeNearbyGrid {
            grid-template-columns: none;
            grid-auto-flow: column;
            grid-auto-columns: min(82vw, 310px);
            overflow-x: auto;
            gap: 9px;
            padding-bottom: 4px;
            scrollbar-width: none;
            scroll-snap-type: x mandatory;
          }

          .homeNearbyGrid::-webkit-scrollbar {
            display: none;
          }

          .homeNearbyCard {
            min-height: 96px;
            grid-template-columns: 62px minmax(0, 1fr) 16px;
            scroll-snap-align: start;
          }

          .homeNearbyImage {
            width: 62px;
            height: 62px;
            border-radius: 14px;
          }
        }
      `}</style>
    </section>
  );
}
