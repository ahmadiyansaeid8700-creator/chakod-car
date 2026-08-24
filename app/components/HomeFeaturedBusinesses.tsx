"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type HomeBusinessVisibilityMode = "all" | "selected";

// در فاز فعلی همه کسب‌وکارهای فعال نمایش داده می‌شوند و جایگاه ویژه فقط رتبه را بهتر می‌کند.
// وقتی موجودی سایت به حد کافی رسید، مالک محصول فقط این مقدار را به "selected" تغییر می‌دهد.
const HOME_BUSINESS_POLICY: { visibility: HomeBusinessVisibilityMode } = {
  visibility: "all",
};

const HOME_BUSINESS_ROW_SIZE = 3;

const SECTIONS: SectionConfig[] = [
  {
    type: "car_service",
    kicker: "خدمات خودرویی",
    title: "خدمات خودرویی برتر",
    description: "کارواش، دیتیلینگ، سرامیک، شیشه دودی و خدمات تخصصی خودرو.",
    allHref: "/car-services",
    fallbackLabels: [],
  },
  {
    type: "parts_store",
    kicker: "لوازم یدکی",
    title: "فروشگاه‌های لوازم یدکی برتر",
    description: "قطعات یدکی، لاستیک، باتری و لوازم جانبی از فروشندگان منتخب.",
    allHref: "/parts-stores",
    fallbackLabels: [],
  },
  {
    type: "repair_shop",
    kicker: "تعمیرکاران",
    title: "تعمیرکاران برتر",
    description: "مکانیکی، برق خودرو، سرویس دوره‌ای و تعمیرگاه‌های منتخب چاکود.",
    allHref: "/workshops",
    fallbackLabels: [],
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
  return Array.from(
    new Set([...(business.category_labels || []), ...(business.services || [])].filter(Boolean)),
  )
    .slice(0, 3);
}

function businessCardSpecs(business: PublicBusiness) {
  const primaryService = businessTags(business)[0] || "تخصصی";
  const serviceLabel = business.business_type === "parts_store" ? "نوع قطعات" : "تخصص اصلی";
  const mobileLabel = business.business_type === "parts_store" ? "ارسال" : "خدمات در محل";

  return [
    { label: serviceLabel, value: primaryService },
    { label: mobileLabel, value: business.mobile_service ? "دارد" : "حضوری" },
    { label: "محدوده قیمت", value: business.price_range_text || "استعلام" },
  ];
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
  const nationwideQuery = new URLSearchParams({ limit: "100" });

  if (location.mode === "all" || scopes.length === 0) {
    return [nationwideQuery];
  }

  return [nationwideQuery, ...scopes.map(
    (scope) =>
      new URLSearchParams({
        limit: "100",
        province: scope.province,
      }),
  )];
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

function resolveBusinessesForLocation(
  items: PublicBusiness[],
  type: BusinessType,
  location: HomeLocationSelection,
  selected: SelectedPlacement[],
) {
  const selectedOrder = selectedBusinessOrder(selected, type);
  const typeItems = items.filter(
    (item) =>
      item.business_type === type &&
      (HOME_BUSINESS_POLICY.visibility === "all" ||
        selectedOrder.has(normalizeText(item.name))),
  );

  if (location.mode === "all") {
    return { localItems: typeItems, nationwideItems: [] };
  }

  const exactItems = typeItems.filter((item) => businessMatchesLocation(item, location));
  const exactIds = new Set(exactItems.map((item) => item.id));

  return {
    localItems: exactItems,
    nationwideItems:
      exactItems.length < HOME_BUSINESS_ROW_SIZE
        ? typeItems.filter((item) => !exactIds.has(item.id))
        : [],
  };
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

function BusinessCardContent({
  business,
  config,
}: {
  business: PublicBusiness;
  config: SectionConfig;
}) {
  const specs = businessCardSpecs(business);

  return (
    <>
      <span className="featuredBusinessMedia">
        <span className="featuredBusinessCoverFallback" aria-hidden="true">
          {business.name.slice(0, 1)}
        </span>
        {business.cover_url ? (
          <img
            src={business.cover_url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span
          className={`featuredBusinessType featuredBusinessType--${business.business_type}`}
        >
          {config.kicker}
        </span>
        {business.is_verified ? <em>تأیید چاکود</em> : null}
      </span>

      <span className="featuredBusinessCopy">
        <span className="featuredBusinessHeading">
          <span className="featuredBusinessIdentity">
            <b>{business.name.slice(0, 1)}</b>
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </span>
          <span>
            <strong>{business.name}</strong>
            <small>{config.kicker}{business.is_verified ? " · تأییدشده چاکود" : ""}</small>
          </span>
        </span>
        <small className="featuredBusinessAddress">
          <span aria-hidden="true">⌖</span>
          {businessLocation(business) || "موقعیت ثبت نشده"}
        </small>
        <span className="featuredBusinessSpecs" aria-label="مشخصات اصلی کسب‌وکار">
          {specs.map((spec) => (
            <span key={spec.label}>
              <small>{spec.label}</small>
              <strong>{spec.value}</strong>
            </span>
          ))}
        </span>
        <b>
          مشاهده پروفایل <span aria-hidden="true">←</span>
        </b>
      </span>
    </>
  );
}

function FeaturedBusinessSection({
  config,
  items,
  selected,
  status,
  nationwideItems,
}: {
  config: SectionConfig;
  items: PublicBusiness[];
  selected: SelectedPlacement[];
  status: "loading" | "ready" | "error";
  nationwideItems: PublicBusiness[];
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
  const localItemIds = new Set(sectionItems.map((item) => item.id));
  const rankedNationwideItems = nationwideItems
    .filter((item) => item.business_type === config.type && !localItemIds.has(item.id))
    .sort((a, b) => Number(b.is_verified) - Number(a.is_verified))
    .slice(0, Math.max(0, 8 - sectionItems.length));
  const hasLocalItems = status === "ready" && sectionItems.length > 0;
  const hasNationwideItems = status === "ready" && rankedNationwideItems.length > 0;
  const hasItems = hasLocalItems || hasNationwideItems;
  const fallbackItems = config.fallbackItems ?? config.fallbackLabels.map((label) => ({
    label,
    description: "مشاهده فهرست کامل",
    href: config.allHref,
    icon: "detail" as const,
  }));

  return (
    <section
      className={`featuredBusinessSection featuredBusinessSection--${config.type}`}
      aria-labelledby={`featured-${config.type}`}
    >
      <h2 className="featuredBusinessSrOnly" id={`featured-${config.type}`}>
        {config.title}
      </h2>
      <div className="featuredBusinessToolbar">
        <span
          className={`featuredBusinessCategory featuredBusinessCategory--${config.type}`}
        >
          {config.kicker}
        </span>
        <Link href={config.allHref}>
          مشاهده همه
          <span aria-hidden="true">←</span>
        </Link>
      </div>

      {status !== "loading" && !hasItems && fallbackItems.length === 0 ? (
        <div className="featuredBusinessEmpty">
          <strong>هنوز مورد فعالی برای نمایش ثبت نشده است</strong>
          <span>به‌محض ثبت مورد معتبر، این بخش به‌صورت خودکار تکمیل می‌شود.</span>
        </div>
      ) : (
      <div className="featuredBusinessRail">
        {hasItems
          ? <>
            {sectionItems.map((business) => (
              <Link
                className={`featuredBusinessCard featuredBusinessCard--${business.business_type}`}
                href={`/businesses/${business.slug}`}
                key={business.id}
              >
                <BusinessCardContent business={business} config={config} />
              </Link>
            ))}
            {hasNationwideItems ? (
              <aside
                className="homeLocationBoundary featuredBusinessNationwideDivider"
                aria-label="مرز کسب‌وکارهای محدوده و سراسر ایران"
              >
                <i aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M19 12H5m5-5-5 5 5 5" />
                  </svg>
                </i>
                <strong>پایان محدوده</strong>
                <span>ادامه سراسری</span>
              </aside>
            ) : null}
            {rankedNationwideItems.map((business) => (
              <Link
                className={`featuredBusinessCard featuredBusinessCard--${business.business_type}`}
                href={`/businesses/${business.slug}`}
                key={`nationwide-${business.id}`}
              >
                <BusinessCardContent business={business} config={config} />
              </Link>
            ))}
          </>
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
                      ? "در حال دریافت گزینه‌ها"
                      : item.description}
                  </small>
                  <b>
                    مشاهده مراکز <span aria-hidden="true">←</span>
                  </b>
                </span>
              </Link>
            ))}
      </div>
      )}
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

  return (
    <div className="featuredBusinesses" dir="rtl">
      {SECTIONS.map((config) => {
        const resolved = resolveBusinessesForLocation(items, config.type, location, selected);
        return (
          <FeaturedBusinessSection
            config={config}
            items={resolved.localItems}
            nationwideItems={resolved.nationwideItems}
            selected={selected}
            status={status}
            key={config.type}
          />
        );
      })}

      <style>{`
        .featuredBusinesses {
          width: min(1240px, calc(100% - 32px));
          margin: 8px auto 26px;
          display: grid;
          gap: 30px;
          font-family: Tahoma, Arial, sans-serif;
        }

        .featuredBusinessSection {
          position: relative;
          min-width: 0;
          padding: 18px;
          overflow: hidden;
          border: 1px solid #ebe7f0;
          border-radius: 26px;
          background: rgba(255, 255, 255, .94);
          box-shadow: 0 20px 55px rgba(38, 24, 52, .07);
        }
        .featuredBusinessSection::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 4px;
          background: var(--business-accent);
        }
        .featuredBusinessSection--repair_shop { --business-accent: linear-gradient(90deg, #0284c7, #38bdf8); }
        .featuredBusinessSection--parts_store { --business-accent: linear-gradient(90deg, #ea580c, #fb923c); }
        .featuredBusinessSection--car_service { --business-accent: linear-gradient(90deg, #059669, #34d399); }

        .featuredBusinessSrOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .featuredBusinessToolbar {
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .featuredBusinessCategory {
          position: relative;
          min-height: 34px;
          padding: 0 15px;
          border: 1px solid rgba(255, 255, 255, .75);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          transform: translateY(-1px);
          font-size: 11px;
          font-weight: 950;
          text-shadow: 0 1px 0 rgba(255, 255, 255, .7);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, .9),
            inset 0 -3px 6px rgba(23, 12, 38, .08),
            0 7px 0 rgba(38, 24, 52, .07),
            0 12px 22px rgba(38, 24, 52, .12);
        }
        .featuredBusinessCategory--repair_shop { color: #075985; background: linear-gradient(145deg, #f0f9ff, #bae6fd); }
        .featuredBusinessCategory--parts_store { color: #9a3412; background: linear-gradient(145deg, #fff7ed, #fed7aa); }
        .featuredBusinessCategory--car_service { color: #047857; background: linear-gradient(145deg, #ecfdf5, #a7f3d0); }
        .featuredBusinessCategory::before {
          content: "";
          width: 9px;
          height: 9px;
          margin-left: 7px;
          border-radius: 99px;
          background: currentColor;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, .62), 0 3px 7px currentColor;
        }
        .featuredBusinessToolbar > a {
          min-height: 34px;
          padding: 0 11px;
          border: 1px solid #decff0;
          border-radius: 11px;
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
          direction: rtl;
          min-width: 0;
          display: flex;
          gap: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 2px 1px 10px;
          scroll-snap-type: inline mandatory;
          scrollbar-width: thin;
          scrollbar-color: #d7cce8 transparent;
        }

        .featuredBusinessCard {
          position: relative;
          flex: 0 0 clamp(292px, 28vw, 342px);
          min-width: 292px;
          min-height: 330px;
          overflow: visible;
          border: 1px solid #ebe7f0;
          border-radius: 22px;
          display: grid;
          grid-template-rows: 126px minmax(0, 1fr);
          color: #251735;
          background: #fff;
          box-shadow: 0 12px 32px rgba(31, 20, 43, .07);
          scroll-snap-align: start;
          transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
        }

        .featuredBusinessCard:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--card-color) 35%, #e7e0ed);
          box-shadow: 0 20px 42px rgba(31, 20, 43, .12);
        }
        .featuredBusinessCard--repair_shop { --card-color: #0284c7; }
        .featuredBusinessCard--parts_store { --card-color: #ea580c; }
        .featuredBusinessCard--car_service { --card-color: #059669; }
        .featuredBusinessCard::after {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          z-index: 3;
          height: 3px;
          background: var(--card-color, #6d28d9);
        }

        .featuredBusinessMedia { position: relative; overflow: hidden; border-radius: 21px 21px 0 0; background: linear-gradient(145deg, color-mix(in srgb, var(--card-color, #6d28d9) 18%, #24152d), color-mix(in srgb, var(--card-color, #6d28d9) 68%, #211229)); }
        .featuredBusinessMedia > img,
        .featuredBusinessCoverFallback { position: absolute; inset: 0; width: 100%; height: 100%; display: grid; place-items: center; object-fit: cover; color: #6d28d9; font-size: 42px; font-weight: 950; }
        .featuredBusinessMedia > img { z-index: 1; }
        .featuredBusinessType {
          position: absolute;
          z-index: 2;
          right: 10px;
          top: 10px;
          max-width: 58%;
          padding: 5px 8px;
          overflow: hidden;
          border-radius: 999px;
          color: #4c1d95;
          background: rgba(255, 255, 255, .92);
          font-size: 7px;
          font-weight: 950;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .featuredBusinessType--repair_shop {
          color: #075985;
          background: rgba(224, 242, 254, .94);
        }
        .featuredBusinessType--parts_store {
          color: #9a3412;
          background: rgba(255, 237, 213, .95);
        }
        .featuredBusinessType--car_service {
          color: #047857;
          background: rgba(209, 250, 229, .95);
        }
        .featuredBusinessIdentity {
          position: relative;
          z-index: 4;
          width: 52px;
          height: 52px;
          flex: 0 0 auto;
          overflow: hidden;
          border: 4px solid #fff;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(145deg, var(--card-color, #6d28d9), color-mix(in srgb, var(--card-color, #6d28d9) 68%, #271032));
          box-shadow: 0 13px 30px rgba(42, 26, 68, .18), 0 0 0 1px color-mix(in srgb, var(--card-color, #6d28d9) 12%, transparent);
          transform: translateY(-26px);
          font-size: 16px;
          font-weight: 950;
        }
        .featuredBusinessIdentity img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .featuredBusinessMedia em {
          position: absolute;
          z-index: 2;
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

        .featuredBusinessCopy { min-width: 0; padding: 0 14px 14px; display: flex; flex-direction: column; }
        .featuredBusinessHeading { min-width: 0; min-height: 48px; display: grid; grid-template-columns: 52px minmax(0, 1fr); align-items: start; gap: 10px; }
        .featuredBusinessHeading > span:last-child { min-width: 0; padding-top: 6px; }
        .featuredBusinessHeading strong { overflow: hidden; display: block; color: #251735; font-size: 14px; font-weight: 950; text-overflow: ellipsis; white-space: nowrap; }
        .featuredBusinessHeading small { margin-top: 3px; overflow: hidden; display: block; color: #81758b; font-size: 8px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
        .featuredBusinessCopy > small { margin-top: 8px; overflow: hidden; color: #6b5d74; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
        .featuredBusinessAddress {
          min-height: 35px;
          padding: 0 9px;
          border: 1px solid color-mix(in srgb, var(--card-color, #6d28d9) 16%, #ece7f0);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 7px;
          background: color-mix(in srgb, var(--card-color, #6d28d9) 5%, #fff);
        }
        .featuredBusinessAddress > span {
          width: 20px;
          height: 20px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--card-color, #6d28d9);
          background: #fff;
          box-shadow: 0 3px 8px rgba(40, 25, 54, .08);
          font-size: 12px;
          font-weight: 950;
        }
        .featuredBusinessTags { min-height: 27px; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px; }
        .featuredBusinessTags i { min-height: 23px; padding: 0 8px; border: 1px solid #eee8f3; border-radius: 999px; display: inline-flex; align-items: center; color: #665570; background: #faf8fc; font-size: 7px; font-style: normal; font-weight: 850; }
        .featuredBusinessSpecs { min-width: 0; margin-top: 8px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .featuredBusinessSpecs > span { min-width: 0; min-height: 56px; padding: 7px 5px; border: 1px solid #e9e4ed; border-radius: 12px; display: grid; place-items: center; align-content: center; gap: 4px; text-align: center; background: radial-gradient(circle at 80% 18%, color-mix(in srgb, var(--card-color, #6d28d9) 9%, transparent), transparent 48%), #faf9fb; }
        .featuredBusinessSpecs small, .featuredBusinessSpecs strong { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .featuredBusinessSpecs small { color: #918798; font-size: 7px; font-weight: 800; }
        .featuredBusinessSpecs strong { color: #44364d; font-size: 8px; font-weight: 950; }
        .featuredBusinessCopy > b { min-height: 39px; margin-top: 8px; padding: 0 12px; border: 1px solid var(--card-color, #6d28d9); border-radius: 11px; display: flex; align-items: center; justify-content: space-between; color: var(--card-color, #5b21b6); background: #fff; font-size: 9px; font-weight: 950; }

        .featuredBusinessNationwideDivider {
          flex: 0 0 42px;
          min-width: 42px !important;
          min-height: 330px;
        }
        .featuredBusinessNationwideDivider strong,
        .featuredBusinessNationwideDivider span { margin: 0; }

        .featuredBusinessEmpty {
          min-height: 74px;
          padding: 15px 17px;
          border: 1px dashed #d9c8e9;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          color: #71657b;
          background: #fdfbff;
        }
        .featuredBusinessEmpty strong { color: #352440; font-size: 11px; }
        .featuredBusinessEmpty span { font-size: 8px; line-height: 1.8; }

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
          .featuredBusinessCard { flex-basis: min(83vw, 318px); }
        }

        @media (max-width: 620px) {
          .featuredBusinesses { width: calc(100% - 20px); gap: 18px; }
          .featuredBusinessSection { padding: 14px; border-radius: 22px; }
          .featuredBusinessCard { flex-basis: min(86vw, 300px); min-width: min(86vw, 300px); min-height: 320px; grid-template-rows: 112px minmax(0, 1fr); }
          .featuredBusinessCategory { min-height: 32px; padding: 0 12px; font-size: 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 5px rgba(23,12,38,.07), 0 5px 0 rgba(38,24,52,.06), 0 9px 16px rgba(38,24,52,.1); }
          .featuredBusinessNationwideDivider { flex-basis: 42px; min-height: 320px; }
          .featuredBusinessFallback { min-height: 226px; grid-template-rows: 98px minmax(0, 1fr); }
          .featuredBusinessServiceIcon { width: 52px; height: 52px; border-radius: 16px; }
          .featuredBusinessServiceIcon svg { width: 34px; height: 34px; }
        }
      `}</style>
    </div>
  );
}
