"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HomeLocationSelection,
  loadHomeLocation,
} from "./home-location";

/**
 * جایگاه عمومی بنر صفحه اصلی.
 *
 * در فاز اتصال بک‌اند، دادهٔ رزرو تأییدشده از API دریافت می‌شود و همین
 * کامپوننت بدون تغییر ساختار صفحه، تصویر دسکتاپ/موبایل، لینک، تاریخ و شهر
 * رزرو را نمایش می‌دهد. فعلاً کمپین داخلی چاکود به‌عنوان بنر جایگزین نمایش
 * داده می‌شود تا جایگاه در طراحی صفحه تثبیت شود.
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

      <div className="homeBannerContent">
        <div className="homeBannerBadge">
          <span aria-hidden="true">●</span>
          جایگاه تبلیغ شهری
        </div>

        <strong>بنرهای نمایشگاهی متناسب با شهر شما</strong>

        <p>
          بنرهای تأییدشده نمایشگاه‌ها در شهر و روز رزرو‌شده، در این جایگاه
          نمایش داده می‌شوند.
        </p>

        <div className="homeBannerMeta">
          <span>محدوده فعلی</span>
          <b>{location.label}</b>
        </div>
      </div>

      <div className="homeBannerVisual" aria-hidden="true">
        <span className="homeBannerAiLabel">AI READY</span>
        <div className="homeBannerCarLine" />
        <div className="homeBannerMetric">
          <strong>نمایش هدفمند</strong>
          <small>شهر × تاریخ × جایگاه</small>
        </div>
      </div>

      <style>{`
        .homeBannerSlot {
          position: relative;
          width: min(1240px, calc(100% - 32px));
          min-height: 205px;
          margin: 18px auto 2px;
          padding: 27px 30px;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(270px, 0.46fr);
          align-items: center;
          gap: 28px;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 28px;
          background:
            radial-gradient(circle at 8% 0%, rgba(168, 85, 247, 0.34), transparent 20rem),
            linear-gradient(132deg, #17111f 0%, #34204a 52%, #5b21b6 100%);
          box-shadow: 0 22px 52px rgba(52, 32, 74, 0.18);
          isolation: isolate;
        }

        .homeBannerGlow {
          position: absolute;
          width: 240px;
          height: 240px;
          left: -95px;
          bottom: -150px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          filter: blur(2px);
          z-index: -1;
        }

        .homeBannerContent {
          max-width: 700px;
        }

        .homeBannerBadge {
          width: fit-content;
          padding: 7px 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #e9ddff;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 9px;
          font-weight: 900;
        }

        .homeBannerBadge span {
          color: #c084fc;
          font-size: 8px;
        }

        .homeBannerContent > strong {
          display: block;
          margin-top: 14px;
          font-size: clamp(21px, 2.3vw, 31px);
          line-height: 1.6;
        }

        .homeBannerContent > p {
          max-width: 650px;
          margin: 7px 0 0;
          color: rgba(255, 255, 255, 0.69);
          font-size: 11px;
          line-height: 2;
        }

        .homeBannerMeta {
          margin-top: 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 11px;
          color: rgba(255, 255, 255, 0.65);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 9px;
        }

        .homeBannerMeta b {
          color: #ffffff;
          font-size: 10px;
        }

        .homeBannerVisual {
          position: relative;
          min-height: 145px;
          padding: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 22px;
          background:
            linear-gradient(160deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.035));
          backdrop-filter: blur(12px);
        }

        .homeBannerAiLabel {
          width: fit-content;
          padding: 6px 8px;
          color: #f0e7ff;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.11);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .homeBannerCarLine {
          position: absolute;
          width: 170px;
          height: 55px;
          left: 18px;
          top: 42px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-left-radius: 80px 45px;
          border-top-right-radius: 60px 38px;
          border-bottom: 0;
          transform: skewX(-8deg);
        }

        .homeBannerCarLine::before,
        .homeBannerCarLine::after {
          content: "";
          position: absolute;
          width: 24px;
          height: 24px;
          bottom: -17px;
          border: 5px solid rgba(255, 255, 255, 0.42);
          border-radius: 999px;
          background: #442064;
        }

        .homeBannerCarLine::before {
          right: 17px;
        }

        .homeBannerCarLine::after {
          left: 17px;
        }

        .homeBannerMetric {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 3px;
          text-align: left;
          direction: rtl;
        }

        .homeBannerMetric strong {
          font-size: 11px;
        }

        .homeBannerMetric small {
          color: rgba(255, 255, 255, 0.58);
          font-size: 8px;
        }

        @media (max-width: 760px) {
          .homeBannerSlot {
            width: calc(100% - 20px);
            min-height: 0;
            margin-top: 12px;
            padding: 20px 16px;
            grid-template-columns: 1fr;
            gap: 15px;
            border-radius: 22px;
          }

          .homeBannerContent > strong {
            font-size: 20px;
          }

          .homeBannerContent > p {
            font-size: 9px;
          }

          .homeBannerVisual {
            min-height: 105px;
          }

          .homeBannerCarLine {
            width: 145px;
            height: 46px;
            top: 35px;
          }
        }
      `}</style>
    </section>
  );
}
