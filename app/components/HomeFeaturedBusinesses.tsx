"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BusinessType = "car_service" | "repair_shop" | "parts_store";

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

type SectionConfig = {
  type: BusinessType;
  kicker: string;
  title: string;
  description: string;
  allHref: string;
  fallbackLabels: string[];
};

const SECTIONS: SectionConfig[] = [
  {
    type: "car_service",
    kicker: "خدمات خودرویی",
    title: "خدمات خودرویی منتخب",
    description: "کارواش، دیتیلینگ، سرامیک، شیشه دودی و خدمات تخصصی خودرو.",
    allHref: "/businesses?type=car_service",
    fallbackLabels: ["کارواش و دیتیلینگ", "سرامیک و محافظ رنگ", "خدمات تخصصی خودرو"],
  },
  {
    type: "repair_shop",
    kicker: "تعمیر و نگهداری",
    title: "تعمیرکاران برتر",
    description: "مکانیکی، برق خودرو، سرویس دوره‌ای و تعمیرگاه‌های منتخب چاکود.",
    allHref: "/businesses?type=repair_shop",
    fallbackLabels: ["مکانیکی خودرو", "برق خودرو", "سرویس و نگهداری"],
  },
  {
    type: "parts_store",
    kicker: "قطعات و لوازم",
    title: "فروشگاه‌های لوازم یدکی برتر",
    description: "قطعات یدکی، لاستیک، باتری و لوازم جانبی از فروشندگان منتخب.",
    allHref: "/businesses?type=parts_store",
    fallbackLabels: ["قطعات یدکی", "لاستیک و باتری", "لوازم جانبی خودرو"],
  },
];

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

function FeaturedBusinessSection({ config }: { config: SectionConfig }) {
  const [items, setItems] = useState<PublicBusiness[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ type: config.type, limit: "6" });

    fetch(`/api/businesses?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.success) throw new Error("Business request failed");
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setItems(
          [...nextItems]
            .sort((a, b) => Number(b.is_verified) - Number(a.is_verified))
            .slice(0, 6),
        );
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setStatus("error");
      });

    return () => controller.abort();
  }, [config.type]);

  const hasItems = status === "ready" && items.length > 0;

  return (
    <section className="featuredBusinessSection" aria-labelledby={`featured-${config.type}`}>
      <div className="featuredBusinessHeader">
        <div>
          <span>{config.kicker}</span>
          <h2 id={`featured-${config.type}`}>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <Link href={config.allHref}>
          مشاهده همه
          <span aria-hidden="true">←</span>
        </Link>
      </div>

      <div className="featuredBusinessRail">
        {hasItems
          ? items.map((business) => (
              <Link
                className="featuredBusinessCard"
                href={`/businesses/${business.slug}`}
                key={business.id}
              >
                <span className="featuredBusinessMedia">
                  {business.cover_url ? (
                    <img src={business.cover_url} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="featuredBusinessCoverFallback" aria-hidden="true">چ</span>
                  )}
                  <span className="featuredBusinessIdentity">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <b>{business.name.slice(0, 1)}</b>
                    )}
                  </span>
                  {business.is_verified ? <em>تایید چاکود</em> : null}
                </span>

                <span className="featuredBusinessCopy">
                  <strong>{business.name}</strong>
                  <small>{businessLocation(business) || "اطلاعات کامل در پروفایل"}</small>
                  <span className="featuredBusinessTags">
                    {businessTags(business).map((tag) => (
                      <i key={tag}>{tag}</i>
                    ))}
                    {business.mobile_service ? <i>خدمات در محل</i> : null}
                  </span>
                  <b>مشاهده اطلاعات کامل <span aria-hidden="true">←</span></b>
                </span>
              </Link>
            ))
          : config.fallbackLabels.map((label, index) => (
              <Link className="featuredBusinessCard featuredBusinessFallback" href={config.allHref} key={label}>
                <span className="featuredBusinessMedia">
                  <span className="featuredBusinessCoverFallback" aria-hidden="true">چ</span>
                  <span className="featuredBusinessIdentity"><b>{index + 1}</b></span>
                </span>
                <span className="featuredBusinessCopy">
                  <strong>{label}</strong>
                  <small>{status === "loading" ? "در حال دریافت گزینه‌های منتخب" : "مشاهده فهرست کامل کسب‌وکارها"}</small>
                  <b>ورود به بخش <span aria-hidden="true">←</span></b>
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}

export default function HomeFeaturedBusinesses() {
  const sections = useMemo(() => SECTIONS, []);

  return (
    <div className="featuredBusinesses" dir="rtl">
      {sections.map((config) => (
        <FeaturedBusinessSection config={config} key={config.type} />
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
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .featuredBusinessCard {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #e7ddf0;
          border-radius: 20px;
          display: grid;
          grid-template-rows: 132px minmax(0, 1fr);
          color: #251735;
          background: #fff;
          box-shadow: 0 11px 28px rgba(48, 30, 70, 0.05);
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
        .featuredBusinessFallback { min-height: 250px; }

        @media (max-width: 900px) {
          .featuredBusinessRail { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 620px) {
          .featuredBusinesses { width: calc(100% - 20px); gap: 18px; }
          .featuredBusinessSection { padding: 18px 14px; border-radius: 22px; }
          .featuredBusinessHeader { align-items: flex-start; flex-direction: column; gap: 10px; }
          .featuredBusinessRail { grid-auto-flow: column; grid-auto-columns: min(285px, 82vw); grid-template-columns: none; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; }
          .featuredBusinessCard { scroll-snap-align: start; }
        }
      `}</style>
    </div>
  );
}
