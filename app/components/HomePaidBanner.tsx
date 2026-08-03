"use client";

import { useEffect, useState } from "react";

import {
  HOME_LOCATION_EVENT,
  HomeLocationSelection,
  loadHomeLocation,
} from "./home-location";
import styles from "./HomePaidBanner.module.css";

const API_BASE = "https://api.chakod.com";

type Banner = {
  id: number;
  province: string;
  title: string;
  subtitle?: string | null;
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  destination_type: "dealer" | "listing" | "url";
  destination_url?: string | null;
  dealer_name?: string | null;
};

type BannerResponse = {
  success?: boolean;
  data?: Banner | null;
};

function imageUrl(value?: string | null) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

function destination(value?: string | null) {
  if (!value) return "/showrooms";
  return value;
}

export default function HomePaidBanner({ fallbackLocation = "" }: { fallbackLocation?: string }) {
  const [selection, setSelection] = useState<HomeLocationSelection>(() => loadHomeLocation());
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const onChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setSelection(customEvent.detail || loadHomeLocation());
    };
    window.addEventListener(HOME_LOCATION_EVENT, onChange);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, onChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const province = selection.province || "";
    const location = selection.label || fallbackLocation;
    const query = new URLSearchParams();
    if (province) query.set("province", province);
    if (location) query.set("location", location);

    void fetch(`${API_BASE}/api/public-home-banner.php?${query.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<BannerResponse>)
      .then((payload) => setBanner(payload.success ? payload.data || null : null))
      .catch(() => {
        if (!controller.signal.aborted) setBanner(null);
      });

    return () => controller.abort();
  }, [fallbackLocation, selection.label, selection.province]);

  if (!banner) return null;

  const href = destination(banner.destination_url);

  function trackClick() {
    try {
      const payload = JSON.stringify({ banner_id: banner?.id });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon(
          `${API_BASE}/api/public-home-banner.php`,
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }
      void fetch(`${API_BASE}/api/public-home-banner.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    } catch {
      // آمار نباید جلوی بازشدن مقصد را بگیرد.
    }
  }

  return (
    <section className={styles.wrap} aria-label={`بنر تبلیغاتی ${banner.province}`}>
      <a className={styles.banner} href={href} onClick={trackClick}>
        <picture>
          {banner.mobile_image_url ? (
            <source media="(max-width: 720px)" srcSet={imageUrl(banner.mobile_image_url)} />
          ) : null}
          <img src={imageUrl(banner.desktop_image_url)} alt={banner.title} loading="lazy" />
        </picture>
        <span className={styles.overlay} aria-hidden="true" />
        <span className={styles.copy}>
          <small>پیشنهاد نمایشگاه در {banner.province}</small>
          <strong>{banner.title}</strong>
          {banner.subtitle ? <em>{banner.subtitle}</em> : null}
          <b>مشاهده</b>
        </span>
        <span className={styles.sponsor}>{banner.dealer_name || "نمایشگاه چاکود"}</span>
      </a>
    </section>
  );
}
