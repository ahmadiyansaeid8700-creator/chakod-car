"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HomeLocationSelection,
  loadHomeLocation,
} from "./home-location";

/**
 * جایگاه بنر صفحه اصلی بدون متن نمایشی.
 * اطلاعات شهر فقط برای انتخاب کمپین و دسترس‌پذیری نگه‌داری می‌شود.
 */
export default function HomeBannerSlot() {
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);

  useEffect(() => {
    setLocation(loadHomeLocation());

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);

    return () => {
      window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    };
  }, []);

  return (
    <section
      className="homeBannerSlot"
      aria-label={`جایگاه بنر صفحه اصلی برای ${location.label}`}
      data-location-mode={location.mode}
      data-location-province={location.province || undefined}
    >
      <div className="homeBannerGlow" aria-hidden="true" />
      <div className="homeBannerVisual" aria-hidden="true">
        <div className="homeBannerCarLine" />
        <div className="homeBannerRoadLine" />
      </div>

      <style>{`
        .homeBannerSlot {
          position: relative;
          width: min(1240px, calc(100% - 32px));
          min-height: 122px;
          margin: 12px auto 2px;
          padding: 14px;
          overflow: hidden;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 24px;
          background:
            radial-gradient(circle at 8% 0%, rgba(168, 85, 247, 0.34), transparent 20rem),
            linear-gradient(132deg, #17111f 0%, #34204a 52%, #5b21b6 100%);
          box-shadow: 0 18px 42px rgba(52, 32, 74, 0.16);
          isolation: isolate;
        }

        .homeBannerGlow {
          position: absolute;
          width: 250px;
          height: 250px;
          left: -90px;
          bottom: -165px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          filter: blur(2px);
          z-index: -1;
        }

        .homeBannerVisual {
          position: relative;
          width: 100%;
          min-height: 92px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 18px;
          background:
            linear-gradient(160deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.025));
          backdrop-filter: blur(12px);
        }

        .homeBannerCarLine {
          position: absolute;
          width: 210px;
          height: 58px;
          left: 50%;
          top: 15px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-left-radius: 105px 58px;
          border-top-right-radius: 82px 48px;
          border-bottom: 0;
          transform: translateX(-50%) skewX(-8deg);
        }

        .homeBannerCarLine::before,
        .homeBannerCarLine::after {
          content: "";
          position: absolute;
          width: 27px;
          height: 27px;
          bottom: -19px;
          border: 5px solid rgba(255, 255, 255, 0.42);
          border-radius: 999px;
          background: #442064;
        }

        .homeBannerCarLine::before {
          right: 25px;
        }

        .homeBannerCarLine::after {
          left: 25px;
        }

        .homeBannerRoadLine {
          position: absolute;
          right: 8%;
          bottom: 16px;
          width: 84%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.24),
            transparent
          );
        }

        @media (max-width: 760px) {
          .homeBannerSlot {
            width: calc(100% - 20px);
            min-height: 78px;
            margin-top: 8px;
            padding: 9px;
            border-radius: 17px;
          }

          .homeBannerVisual {
            min-height: 58px;
            border-radius: 12px;
          }

          .homeBannerCarLine {
            width: 118px;
            height: 34px;
            top: 8px;
            border-width: 2px;
          }

          .homeBannerCarLine::before,
          .homeBannerCarLine::after {
            width: 16px;
            height: 16px;
            bottom: -12px;
            border-width: 3px;
          }

          .homeBannerCarLine::before {
            right: 14px;
          }

          .homeBannerCarLine::after {
            left: 14px;
          }

          .homeBannerRoadLine {
            bottom: 9px;
          }
        }
      `}</style>
    </section>
  );
}
