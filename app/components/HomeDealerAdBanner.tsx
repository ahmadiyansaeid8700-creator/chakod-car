"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  loadHomeLocation,
  type HomeLocationSelection,
} from "./home-location";

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M12 2.8 13.7 8l5.3 1.8-5.3 1.8L12 17l-1.7-5.4L5 9.8 10.3 8 12 2.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m18.5 15 .8 2.3 2.2.8-2.2.8-.8 2.3-.8-2.3-2.2-.8 2.2-.8.8-2.3Z" fill="currentColor" />
    </svg>
  );
}

export default function HomeDealerAdBanner() {
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);

  useEffect(() => {
    setLocation(loadHomeLocation());
    const handleChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(customEvent.detail || loadHomeLocation());
    };
    window.addEventListener(HOME_LOCATION_EVENT, handleChange);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, handleChange);
  }, []);

  return (
    <section className="dealerAdBanner" aria-label="جایگاه تبلیغات نمایشگاه‌داران">
      <div className="dealerAdIcon"><SparkIcon /></div>
      <div className="dealerAdCopy">
        <span>جایگاه ویژه نمایشگاه‌داران · {location.label}</span>
        <strong>نمایشگاه‌های برتر {location.mode === "all" ? "سراسر ایران" : location.label}</strong>
        <p>پیشنهادهای ویژه و موجودی نمایشگاه‌های همین محدوده را یکجا ببینید.</p>
      </div>
      <div className="dealerAdActions">
        <Link href="/showrooms">مشاهده نمایشگاه‌ها</Link>
      </div>
    </section>
  );
}
