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

type BusinessType = "car_service" | "parts_store" | "repair_shop";

type PublicBusiness = {
  id: number;
  slug: string;
  business_type: BusinessType;
  business_type_title: string;
  name: string;
  province: string;
  city: string;
  neighborhood: string;
  logo_url: string;
  cover_url: string;
  description: string;
  category_labels: string[];
  services: string[];
  mobile_service: boolean;
  price_range_text: string;
  is_verified: boolean;
};

type ApiResponse = {
  success?: boolean;
  items?: PublicBusiness[];
};

type SelectedPlacement = {
  placement_key: string;
  target_name?: string;
  business_type?: string;
};

type SelectedResponse = {
  success?: boolean;
  data?: SelectedPlacement[];
};

type SectionConfig = {
  type: BusinessType;
  kicker: string;
  title: string;
  description: string;
  allHref: string;
  fallbackLabels: string[];
  fallbackItems?: Array<{
    label: string;
    description: string;
    href: string;
    icon: "wash" | "detail" | "shield";
  }>;
};

const SECTIONS: SectionConfig[] = [
  {
    type: "car_service",
    kicker: "خدمات خودرویی",
    title: "خدمات خودرویی برتر",
    description: "کارواش، دیتیلینگ، سرامیک، شیشه دودی و خدمات تخصصی خودرو.",
    allHref: "/car-services",
    fallbackLabels: ["کارواش و دیتیلینگ", "سرامیک و محافظ رنگ", "خدمات تخصصی خودرو"],
    fallbackItems: [
      {
        label: "کارواش حرفه‌ای",
        description: "شست‌وشوی بدنه و نظافت داخلی خودرو",
        href: "/car-services?category=car_wash",
        icon: "wash",
      },
      {
        label: "دیتیلینگ خودرو",
        description: "احیای رنگ، پولیش و صفرشویی تخصصی",
        href: "/car-services?category=detailing",
        icon: "detail",
      },
      {
        label: "سرامیک و محافظ رنگ",
        description: "پوشش سرامیک و محافظت حرفه‌ای بدنه",
        href: "/car-services?category=ceramic_coating",
        icon: "shield",
      },
    ],
  },
  {
    type: "parts_store",
    kicker: "قطعات و لوازم",
    title: "فروشگاه‌های لوازم یدکی برتر",
    description: "قطعات یدکی، لاستیک، باتری و لوازم جانبی از فروشندگان منتخب.",
    allHref: "/businesses?type=parts_store",
    fallbackLabels: ["قطعات یدکی", "لاستیک و باتری", "لوازم جانبی خودرو"],
  },
  {
    type: "repair_shop",
    kicker: "تعمیر و نگهداری",
    title: "تعمیرکاران برتر",
    description: "مکانیکی، برق خودرو، سرویس دوره‌ای و تعمیرگاه‌های منتخب چاکود.",
    allHref: "/businesses?type=repair_shop",
    fallbackLabels: ["مکانیکی خودرو", "برق خودرو", "سرویس و نگهداری"],
  },
];

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[\u200c\u200f\s_-]+/g, "");
}

function businessLocation(business: PublicBusiness) {
  return [business.neighborhood, business.city, business.province]
    .filter(Boolean)
    .join("، ");
}

function businessTags(business: PublicBusiness) {
  return [...(business.category_labels || []), ...(business.services || [])]
    .filter(Boolean)
    .slice(0, 3);
}

function businessMatchesLocation(
  business: PublicBusiness,
  location: HomeLocationSelection,
) {
  if (location.mode === "all") return true;

  const province = normalizeText(business.province);
  const city = normalizeText(business.city);
  const neighborhood = normalizeText(business.neighborhood);

  return getHomeLocationScopes(location).some((scope) => {
    if (normalizeText(scope.province) !== province) return false;
    if (scope.allCities) return true;

    if (scope.cities.some((item) => normalizeText(item) === city)) {
      return true;
    }

    return (scope.areas || []).some((area) => {
      if (normalizeText(area.city) !== city) return false;
      if (area.allNeighborhoods) return true;
      return area.neighborhoods.some(
        (item) => normalizeText(item) === neighborhood,
      );
    });
  });
}

function buildBusinessQueries(location: HomeLocationSelection) {
  const scopes = getHomeLocationScopes(location);

  if (location.mode === "all" || scopes.length === 0) {
    return [new URLSearchParams({ limit: "100" })];
  }

  return scopes.map(
    (scope) =>
      new URLSearchParams({
        limit: "100",
        province: scope.province,
      }),
  );
}

function selectedBusinessOrder(selected: SelectedPlacement[], type: BusinessType) {
  const order = new Map<string, number>();
  selected
    .filter((item) => item.business_type === type && item.target_name)
    .forEach((item, index) => {
      const key = normalizeText(item.target_name);
      if (key && !order.has(key)) order.set(key, index);
    });
  return order;
}

function ServiceIcon({ type }: { type: "wash" | "detail" | "shield" }) {
  if (type === "shield") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 8 50 15v14c0 13-7 22-18 28C21 51 14 42 14 29V15Z" />
        <path d="m24 32 6 6 11-13" />
      </svg>
    );
  }

  if (type === "detail") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 39h36l-4-13a7 7 0 0 0-7-5H25a7 7 0 0 0-7 5Z" />
        <path d="M18 39v8m28-8v8M23 45h18M49 13v8m-4-4h8" />
        <circle cx="23" cy="39" r="2" /><circle cx="41" cy="39" r="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 40h36l-4-12a7 7 0 0 0-7-5H25a7 7 0 0 0-7 5Z" />
      <path d="M18 40v7m28-7v7M23 46h18" />
      <path d="M20 12c0 4-4 6-4 10m16-10c0 4-4 6-4 10m16-10c0 4-4 6-4 10" />
    </svg>
  );
}

function FeaturedBusinessSection({
  config,
  items,
  selected,
  status,
  locationLabel,
}: {
  config: SectionConfig;
  items: PublicBusiness[];
  selected: SelectedPlacement[];
  status: "loading" | "ready" | "error";
  locationLabel: string;
}) {
  const selectedOrder = selectedBusinessOrder(selected, config.type);
  const sectionItems = items
    .filter((item) => item.business_type === config.type)
    .sort((a, b) => {
      const aRank = selectedOrder.get(normalizeText(a.name));
      const bRank = selectedOrder.get(normalizeText(b.name));
      if (aRank !== undefined || bRank !== undefined) {
        if (aRank === undefined) return 1;
        if (bRank === undefined) return -1;
        if (aRank !== bRank) return aRank - bRank;
      }
      return (
        Number(b.is_verified) - Number(a.is_verified) ||
        a.name.localeCompare(b.name, "fa")
      );
    })
    .slice(0, 8);
  const hasItems = status === "ready" && sectionItems.length > 0;
  const fallbackItems = config.fallbackItems ?? config.fallbackLabels.map((label) => ({
    label,
    description: `مشاهده فهرست کامل ${locationLabel}`,
    href: config.allHref,
    icon: "detail" as const,
  }));

  return (
    <section
      className="featuredBusinessSection"
      aria-labelledby={`featured-${config.type}`}
    >
      <div className="featuredBusinessHeader">
        <div>
          <span>{config.kicker}</span>
          <h2 id={`featured-${config.type}`}>{config.title}</h2>
          <p>
            {config.description} <b>{locationLabel}</b>
          </p>
        </div>
        <Link href={config.allHref}>
          مشاهده همه
          <span aria-hidden="true">←</span>
        </Link>
      </div>

      <div className="featuredBusinessRail">
        {hasItems
          ? sectionItems.map((business) => (
              <Link
                className="featuredBusinessCard"
                href={`/businesses/${business.slug}`}
                key={business.id}
              >
                <span className="featuredBusinessMedia">
                  {business.cover_url ? (
                    <img
                      src={business.cover_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span
                      className="featuredBusinessCoverFallback"
                      aria-hidden="true"
                    >
                      چ
                    </span>
                  )}
                  <span className="featuredBusinessIdentity">
                    {business.logo_url ? (
                      <img
                        src={business.logo_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <b>{business.name.slice(0, 1)}</b>
                    )}
                  </span>
                  {business.is_verified ? <em>تأیید چاکود</em> : null}
                </span>

                <span className="featuredBusinessCopy">
                  <strong>{business.name}</strong>
                  <small>
                    {businessLocation(business) || "اطلاعات کامل در پروفایل"}
                  </small>
                  <span className="featuredBusinessTags">
                    {businessTags(business).map((tag) => (
                      <i key={tag}>{tag}</i>
                    ))}
                    {business.mobile_service ? <i>خدمات در محل</i> : null}
                  </span>
                  <b>
                    مشاهده اطلاعات کامل <span aria-hidden="true">←</span>
                  </b>
                </span>
              </Link>
            ))
          : fallbackItems.map((item) => (
              <Link
                className="featuredBusinessCard featuredBusinessFallback"
                href={item.href}
                key={item.href}
              >
                <span className="featuredBusinessMedia">
                  <span className="featuredBusinessServiceIcon">
                    <ServiceIcon type={item.icon} />
                  </span>
                  <em>خدمات تخصصی</em>
                </span>
                <span className="featuredBusinessCopy">
                  <strong>{item.label}</strong>
                  <small>
                    {status === "loading"
                      ? `در حال دریافت گزینه‌های ${locationLabel}`
                      : item.description}
                  </small>
                  <b>
                    مشاهده مراکز <span aria-hidden="true">←</span>
                  </b>
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}

export default function HomeFeaturedBusinesses() {
  const [location, setLocation] = useState<HomeLocationSelection>(
    DEFAULT_HOME_LOCATION,
  );
  const [locationReady, setLocationReady] = useState(false);
  const [items, setItems] = useState<PublicBusiness[]>([]);
  const [selected, setSelected] = useState<SelectedPlacement[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    setLocation(loadHomeLocation());
    setLocationReady(true);

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/selected/active", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SelectedResponse;
      })
      .then((payload) => {
        if (payload?.success && Array.isArray(payload.data)) setSelected(payload.data);
      })
      .catch(() => setSelected([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!locationReady) return;

    const controller = new AbortController();
    setStatus("loading");
    setItems([]);

    Promise.all(
      buildBusinessQueries(location).map(async (params) => {
        const response = await fetch(`/api/businesses?${params.toString()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.success) {
          throw new Error("Business request failed");
        }
        return Array.isArray(payload.items) ? payload.items : [];
      }),
    )
      .then((responses) => {
        const merged = new Map<number, PublicBusiness>();
        responses.flat().forEach((item) => merged.set(item.id, item));
        setItems(Array.from(merged.values()));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") {
          setItems([]);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [location, locationReady]);

  const filteredItems = useMemo(
    () => items.filter((item) => businessMatchesLocation(item, location)),
    [items, location],
  );

  return (
    <div className="featuredBusinesses" dir="rtl">
      {SECTIONS.map((config) => (
        <FeaturedBusinessSection
          config={config}
          items={filteredItems}
          selected={selected}
          status={status}
          locationLabel={location.label}
          key={config.type}
        />
      ))}

      <style>{`
        .featuredBusinesses {
          width: min(1240px, calc(100% - 32px));
          margin: 8px auto 26px;
          display: grid;
          gap: 30px;
          font-family: Tahoma, Arial, sans-serif;
        }

        .featuredBusinessSection {
          min-width: 0;
          padding: 26px;
          border: 1px solid #e9e0f3;
          border-radius: 28px;
          background: linear-gradient(145deg, #ffffff, #fbf9ff);
          box-shadow: 0 17px 44px rgba(48, 30, 70, 0.065);
        }

        .featuredBusinessHeader {
          margin-bottom: 17px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .featuredBusinessHeader > div { min-width: 0; }
        .featuredBusinessHeader span { color: #6d28d9; font-size: 9px; font-weight: 950; }
        .featuredBusinessHeader h2 { margin: 5px 0 0; color: #21152f; font-size: clamp(21px, 2vw, 29px); line-height: 1.5; }
        .featuredBusinessHeader p { margin: 6px 0 0; color: #81758b; font-size: 10px; line-height: 1.85; }
        .featuredBusinessHeader p b { color: #5b21b6; font-weight: 900; }
        .featuredBusinessHeader > a {
          min-height: 39px;
          padding: 0 13px;
          border: 1px solid #decff0;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          flex: 0 0 auto;
          color: #4c1d95;
          background: #fff;
          font-size: 9px;
          font-weight: 900;
        }

        .featuredBusinessRail {
          min-width: 0;
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(280px, calc((100% - 24px) / 3));
          gap: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 2px 1px 10px;
          scroll-snap-type: inline mandatory;
          scrollbar-width: thin;
          scrollbar-color: #d7cce8 transparent;
        }

        .featuredBusinessCard {
          min-width: 0;
          min-height: 300px;
          overflow: hidden;
          border: 1px solid #e7ddf0;
          border-radius: 20px;
          display: grid;
          grid-template-rows: 142px minmax(0, 1fr);
          color: #251735;
          background: #fff;
          box-shadow: 0 11px 28px rgba(48, 30, 70, 0.05);
          scroll-snap-align: start;
          transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
        }

        .featuredBusinessCard:hover {
          transform: translateY(-3px);
          border-color: #d0bae8;
          box-shadow: 0 18px 38px rgba(48, 30, 70, 0.095);
        }

        .featuredBusinessMedia { position: relative; overflow: hidden; background: linear-gradient(145deg, #f2eaff, #fff); }
        .featuredBusinessMedia > img,
        .featuredBusinessCoverFallback { width: 100%; height: 100%; display: grid; place-items: center; object-fit: cover; color: #6d28d9; font-size: 42px; font-weight: 950; }
        .featuredBusinessIdentity {
          position: absolute;
          right: 14px;
          bottom: 12px;
          width: 48px;
          height: 48px;
          overflow: hidden;
          border: 3px solid #fff;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(145deg, #4c1d95, #8b5cf6);
          box-shadow: 0 8px 20px rgba(42, 26, 68, 0.18);
          font-size: 16px;
          font-weight: 950;
        }
        .featuredBusinessIdentity img { width: 100%; height: 100%; object-fit: cover; }
        .featuredBusinessMedia em {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 5px 8px;
          border-radius: 999px;
          color: #08735c;
          background: rgba(231, 248, 243, 0.95);
          font-size: 7px;
          font-style: normal;
          font-weight: 950;
        }

        .featuredBusinessCopy { min-width: 0; padding: 15px; display: flex; flex-direction: column; }
        .featuredBusinessCopy > strong { overflow: hidden; color: #251735; font-size: 13px; font-weight: 950; text-overflow: ellipsis; white-space: nowrap; }
        .featuredBusinessCopy > small { margin-top: 5px; overflow: hidden; color: #81758b; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
        .featuredBusinessTags { min-height: 27px; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px; }
        .featuredBusinessTags i { min-height: 23px; padding: 0 7px; border-radius: 999px; display: inline-flex; align-items: center; color: #604878; background: #f3edfa; font-size: 7px; font-style: normal; font-weight: 850; }
        .featuredBusinessCopy > b { margin-top: auto; padding-top: 13px; color: #5b21b6; font-size: 8px; font-weight: 950; }

        .featuredBusinessFallback {
          min-height: 238px;
          grid-template-rows: 108px minmax(0, 1fr);
          border-color: #dfd0ef;
          background: linear-gradient(180deg, #fff 0%, #fdfbff 100%);
        }
        .featuredBusinessFallback .featuredBusinessMedia {
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 74% 18%, rgba(196, 181, 253, .52), transparent 38%),
            linear-gradient(135deg, #f8f4ff, #eee7fb);
        }
        .featuredBusinessServiceIcon {
          width: 58px;
          height: 58px;
          border: 1px solid rgba(109, 40, 217, .16);
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: rgba(255, 255, 255, .82);
          box-shadow: 0 12px 28px rgba(76, 29, 149, .12);
        }
        .featuredBusinessServiceIcon svg {
          width: 38px;
          height: 38px;
          fill: none;
          stroke: currentColor;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .featuredBusinessFallback .featuredBusinessCopy { padding: 14px 16px 15px; }
        .featuredBusinessFallback .featuredBusinessCopy > small {
          margin-top: 7px;
          line-height: 1.8;
          text-overflow: unset;
          white-space: normal;
        }
        .featuredBusinessFallback .featuredBusinessCopy > b {
          margin-top: 13px;
          padding: 9px 11px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          background: #f2ebfb;
        }

        @media (max-width: 900px) {
          .featuredBusinessRail { grid-auto-columns: min(330px, 78vw); }
        }

        @media (max-width: 620px) {
          .featuredBusinesses { width: calc(100% - 20px); gap: 18px; }
          .featuredBusinessSection { padding: 18px 14px; border-radius: 22px; }
          .featuredBusinessHeader { align-items: flex-start; flex-direction: column; gap: 10px; }
          .featuredBusinessRail { grid-auto-columns: min(285px, 82vw); }
          .featuredBusinessCard { min-height: 276px; }
          .featuredBusinessFallback { min-height: 226px; grid-template-rows: 98px minmax(0, 1fr); }
          .featuredBusinessServiceIcon { width: 52px; height: 52px; border-radius: 16px; }
          .featuredBusinessServiceIcon svg { width: 34px; height: 34px; }
        }
      `}</style>
    </div>
  );
}
