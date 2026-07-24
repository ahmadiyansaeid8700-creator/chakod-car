"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HomeLocationSelection,
  loadHomeLocation,
} from "./home-location";

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
      aria-label={`پیشنهاد صفحه اصلی چاکود برای ${location.label}`}
      data-location-mode={location.mode}
      data-location-province={location.province || undefined}
    >
      <div className="homeBannerContent">
        <span className="homeBannerBadge">چاکود هوشمند</span>
        <h1>خودروی بعدی‌ات را ساده‌تر پیدا کن</h1>
        <p>
          آگهی‌های ساختاریافته، نمایشگاه‌های واقعی و انتخاب‌های ویژه در یک ویترین
          حرفه‌ای.
        </p>

        <div className="homeBannerActions">
          <Link className="homeBannerPrimary" href="/ads">
            مشاهده بازار
            <span aria-hidden="true">←</span>
          </Link>
          <Link className="homeBannerSecondary" href="/submit">
            ثبت آگهی
          </Link>
        </div>
      </div>

      <div className="homeBannerVisual" aria-hidden="true">
        <div className="homeBannerOrb homeBannerOrbOne" />
        <div className="homeBannerOrb homeBannerOrbTwo" />
        <div className="homeBannerPhoneCard">
          <span className="homeBannerPhoneDot" />
          <div className="homeBannerPhoneLine homeBannerPhoneLineStrong" />
          <div className="homeBannerPhoneLine" />
          <div className="homeBannerPhoneCar">
            <svg viewBox="0 0 240 120">
              <path d="M36 77h168l-17-32c-5-9-14-15-25-16l-72-5c-14-1-27 6-34 18L36 77Z" />
              <path d="M54 77h132c12 0 22 10 22 22v3H32v-3c0-12 10-22 22-22Z" />
              <circle cx="72" cy="101" r="14" />
              <circle cx="169" cy="101" r="14" />
              <path d="M83 29 72 64h99l-19-31" />
            </svg>
          </div>
          <div className="homeBannerPhonePills">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="homeBannerDots" aria-hidden="true">
        <span className="active" />
        <span />
        <span />
      </div>

      <style>{`
        .homeBannerSlot {
          position: relative;
          width: min(1240px, calc(100% - 32px));
          min-height: 260px;
          margin: 18px auto 4px;
          padding: 30px 34px;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
          align-items: center;
          gap: 24px;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 32px;
          background:
            radial-gradient(circle at 8% 0%, rgba(196, 181, 253, 0.28), transparent 22rem),
            radial-gradient(circle at 94% 88%, rgba(59, 130, 246, 0.2), transparent 20rem),
            linear-gradient(132deg, #21122d 0%, #4c1d95 56%, #6d28d9 100%);
          box-shadow: 0 24px 70px rgba(55, 28, 84, 0.22);
          isolation: isolate;
        }

        .homeBannerContent {
          position: relative;
          z-index: 3;
          max-width: 610px;
        }

        .homeBannerBadge {
          min-height: 30px;
          padding: 0 11px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          color: #f4eefe;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          font-size: 10px;
          font-weight: 900;
        }

        .homeBannerContent h1 {
          max-width: 540px;
          margin: 14px 0 0;
          font-size: clamp(28px, 4vw, 50px);
          font-weight: 950;
          line-height: 1.45;
          letter-spacing: -0.8px;
        }

        .homeBannerContent p {
          max-width: 580px;
          margin: 12px 0 0;
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
          font-weight: 650;
          line-height: 2;
        }

        .homeBannerActions {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .homeBannerPrimary,
        .homeBannerSecondary {
          min-height: 44px;
          padding: 0 16px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .homeBannerPrimary {
          color: #4c1d95;
          background: #ffffff;
          box-shadow: 0 12px 28px rgba(16, 8, 28, 0.18);
        }

        .homeBannerSecondary {
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(10px);
        }

        .homeBannerPrimary:hover,
        .homeBannerSecondary:hover {
          transform: translateY(-2px);
        }

        .homeBannerVisual {
          position: relative;
          min-height: 210px;
          display: grid;
          place-items: center;
        }

        .homeBannerOrb {
          position: absolute;
          border-radius: 999px;
          filter: blur(1px);
        }

        .homeBannerOrbOne {
          width: 230px;
          height: 230px;
          right: 5%;
          top: -30px;
          background: rgba(255, 255, 255, 0.09);
        }

        .homeBannerOrbTwo {
          width: 130px;
          height: 130px;
          left: 3%;
          bottom: -18px;
          background: rgba(56, 189, 248, 0.16);
        }

        .homeBannerPhoneCard {
          position: relative;
          width: 250px;
          height: 195px;
          padding: 19px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 30px;
          background:
            linear-gradient(160deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.055));
          box-shadow:
            0 24px 58px rgba(18, 8, 31, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(18px);
          transform: rotate(-3deg);
        }

        .homeBannerPhoneDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: block;
          background: #ffffff;
          opacity: 0.8;
        }

        .homeBannerPhoneLine {
          width: 45%;
          height: 6px;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.3);
        }

        .homeBannerPhoneLineStrong {
          width: 70%;
          height: 8px;
          margin-top: 13px;
          background: rgba(255, 255, 255, 0.68);
        }

        .homeBannerPhoneCar {
          position: absolute;
          right: 18px;
          left: 18px;
          bottom: 34px;
          height: 95px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.12);
        }

        .homeBannerPhoneCar svg {
          width: 82%;
          fill: none;
          stroke: rgba(255, 255, 255, 0.8);
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .homeBannerPhonePills {
          position: absolute;
          right: 0;
          bottom: 12px;
          left: 0;
          display: flex;
          justify-content: center;
          gap: 5px;
        }

        .homeBannerPhonePills span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.38);
        }

        .homeBannerPhonePills span:first-child {
          width: 20px;
          background: #ffffff;
        }

        .homeBannerDots {
          position: absolute;
          right: 0;
          bottom: 13px;
          left: 0;
          z-index: 4;
          display: flex;
          justify-content: center;
          gap: 5px;
        }

        .homeBannerDots span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.32);
        }

        .homeBannerDots span.active {
          width: 22px;
          background: #ffffff;
        }

        @media (max-width: 760px) {
          .homeBannerSlot {
            width: calc(100% - 20px);
            min-height: 198px;
            margin-top: 10px;
            padding: 20px 18px 26px;
            grid-template-columns: minmax(0, 1fr) 118px;
            gap: 8px;
            border-radius: 25px;
            background:
              radial-gradient(circle at 4% 0%, rgba(216, 180, 254, 0.34), transparent 13rem),
              linear-gradient(135deg, #24142f 0%, #532095 58%, #7c3aed 100%);
            box-shadow: 0 17px 44px rgba(55, 28, 84, 0.18);
          }

          .homeBannerBadge {
            min-height: 25px;
            padding: 0 8px;
            font-size: 8px;
          }

          .homeBannerContent h1 {
            max-width: 240px;
            margin-top: 9px;
            font-size: 21px;
            line-height: 1.55;
            letter-spacing: -0.3px;
          }

          .homeBannerContent p {
            max-width: 235px;
            margin-top: 7px;
            font-size: 9px;
            line-height: 1.9;
          }

          .homeBannerActions {
            margin-top: 12px;
            gap: 6px;
          }

          .homeBannerPrimary,
          .homeBannerSecondary {
            min-height: 34px;
            padding: 0 10px;
            border-radius: 11px;
            font-size: 8px;
          }

          .homeBannerVisual {
            min-height: 148px;
          }

          .homeBannerPhoneCard {
            width: 112px;
            height: 143px;
            padding: 12px;
            border-radius: 22px;
            transform: rotate(-4deg) translateX(-2px);
          }

          .homeBannerPhoneDot {
            width: 6px;
            height: 6px;
          }

          .homeBannerPhoneLineStrong {
            height: 6px;
            margin-top: 8px;
          }

          .homeBannerPhoneLine {
            height: 4px;
            margin-top: 5px;
          }

          .homeBannerPhoneCar {
            right: 9px;
            left: 9px;
            bottom: 28px;
            height: 70px;
            border-radius: 15px;
          }

          .homeBannerPhoneCar svg {
            width: 92%;
            stroke-width: 5;
          }

          .homeBannerOrbOne {
            width: 130px;
            height: 130px;
            top: 5px;
          }

          .homeBannerOrbTwo {
            width: 76px;
            height: 76px;
          }
        }

        @media (max-width: 380px) {
          .homeBannerSlot {
            grid-template-columns: minmax(0, 1fr) 96px;
            padding-right: 15px;
            padding-left: 15px;
          }

          .homeBannerContent h1 {
            font-size: 19px;
          }

          .homeBannerPhoneCard {
            width: 94px;
            height: 130px;
          }
        }
      `}</style>
    </section>
  );
}
