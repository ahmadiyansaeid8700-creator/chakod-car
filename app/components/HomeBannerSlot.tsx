"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  type HomeLocationSelection,
  loadHomeLocation,
} from "./home-location";

const API_BASE = "https://api.chakod.com";

type HomeBanner = {
  id: number;
  title: string;
  alt_text: string;
  image_url?: string;
  desktop_image_url: string;
  mobile_image_url: string;
  destination_url: string;
  banner_type: "internal" | "sponsored" | string;
};

type HomeBannersResponse = {
  success: boolean;
  banners?: HomeBanner[];
};

function BannerMedia({ banner }: { banner: HomeBanner }) {
  const desktopImage = banner.desktop_image_url || banner.image_url || "";
  const mobileImage = banner.mobile_image_url || desktopImage;

  return (
    <div className="homeManagedBannerMedia">
      <picture>
        <source media="(max-width: 760px)" srcSet={mobileImage} />
        <img
          src={desktopImage}
          alt={banner.alt_text || banner.title || "بنر صفحه اصلی چاکود"}
          loading="eager"
          decoding="async"
        />
      </picture>
      {banner.banner_type === "sponsored" && (
        <span className="homeManagedBannerBadge">تبلیغ</span>
      )}
    </div>
  );
}

export default function HomeBannerSlot() {
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setLocation(loadHomeLocation());

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
  }, []);

  const selectedCity = location.cities[0] || "";

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (location.province) params.set("province", location.province);
    if (selectedCity) params.set("city", selectedCity);
    return params.toString();
  }, [location.province, selectedCity]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    void fetch(`${API_BASE}/api/home-banners.php${query ? `?${query}` : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as HomeBannersResponse;
      })
      .then((data) => {
        if (!active) return;
        const next = data?.success && Array.isArray(data.banners) ? data.banners : [];
        setBanners(
          next.filter((item) => item.desktop_image_url || item.image_url),
        );
        setActiveIndex(0);
      })
      .catch(() => {
        if (active) setBanners([]);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const banner = banners[activeIndex] ?? banners[0];
  const content = <BannerMedia banner={banner} />;

  return (
    <section
      className="homeManagedBanner"
      aria-label="بنر صفحه اصلی چاکود"
      data-location-province={location.province || undefined}
      data-location-city={selectedCity || undefined}
    >
      {banner.destination_url ? (
        <a href={banner.destination_url} target="_blank" rel="noreferrer sponsored">
          {content}
        </a>
      ) : (
        content
      )}

      {banners.length > 1 && (
        <div className="homeManagedBannerDots" aria-label="انتخاب بنر">
          {banners.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={index === activeIndex ? "isActive" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`نمایش بنر ${index + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        .homeManagedBanner {
          position: relative;
          width: min(1240px, calc(100% - 32px));
          margin: 10px auto 0;
        }

        .homeManagedBanner > a {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .homeManagedBannerMedia {
          position: relative;
          height: clamp(110px, 10.5vw, 150px);
          overflow: hidden;
          border: 1px solid rgba(94, 45, 145, 0.14);
          border-radius: 20px;
          background: #f2edf8;
          box-shadow: 0 14px 34px rgba(52, 32, 74, 0.12);
        }

        .homeManagedBannerMedia picture,
        .homeManagedBannerMedia img {
          display: block;
          width: 100%;
          height: 100%;
        }

        .homeManagedBannerMedia img {
          object-fit: cover;
          object-position: center;
        }

        .homeManagedBannerBadge {
          position: absolute;
          top: 9px;
          right: 10px;
          padding: 4px 8px;
          border: 1px solid rgba(255,255,255,.32);
          border-radius: 999px;
          background: rgba(18, 10, 29, .58);
          color: #fff;
          font-size: 10px;
          line-height: 1;
          backdrop-filter: blur(8px);
        }

        .homeManagedBannerDots {
          position: absolute;
          left: 50%;
          bottom: 7px;
          display: flex;
          gap: 5px;
          transform: translateX(-50%);
        }

        .homeManagedBannerDots button {
          width: 6px;
          height: 6px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,.54);
          box-shadow: 0 0 0 1px rgba(20,9,31,.18);
          cursor: pointer;
          transition: width .18s ease, background .18s ease;
        }

        .homeManagedBannerDots button.isActive {
          width: 18px;
          background: #fff;
        }

        @media (max-width: 760px) {
          .homeManagedBanner {
            width: calc(100% - 20px);
            margin-top: 7px;
          }

          .homeManagedBannerMedia {
            height: 98px;
            border-radius: 15px;
            box-shadow: 0 10px 24px rgba(52, 32, 74, 0.11);
          }

          .homeManagedBannerBadge {
            top: 7px;
            right: 8px;
          }
        }
      `}</style>
    </section>
  );
}
