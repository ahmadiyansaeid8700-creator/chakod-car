// CHAKOD_HOME_MARKET_SEARCH_V1
"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HOME_LOCATION_STORAGE_KEY,
  getHomeLocationScopes,
  loadHomeLocation,
  sanitizeHomeLocation,
  type HomeLocationSelection,
} from "./home-location";

type HomeMarketSearchProps = {
  initialQuery?: string;
};

function readCurrentLocation() {
  return loadHomeLocation();
}

export default function HomeMarketSearch({
  initialQuery = "",
}: HomeMarketSearchProps) {
  const [location, setLocation] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);

  useEffect(() => {
    setLocation(readCurrentLocation());

    function handleLocationChange(event: Event) {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setLocation(sanitizeHomeLocation(customEvent.detail));
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === HOME_LOCATION_STORAGE_KEY) {
        setLocation(readCurrentLocation());
      }
    }

    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const scopes = getHomeLocationScopes(location);
  const singleScope = scopes.length === 1 ? scopes[0] : null;
  const province = singleScope?.province || "";
  const city =
    singleScope && !singleScope.allCities && singleScope.cities.length === 1
      ? singleScope.cities[0]
      : "";

  return (
    <form
      className="masterSearch masterHeaderSearch"
      action="/cars"
      method="get"
      role="search"
    >
      <label className="masterSrOnly" htmlFor="master-search">
        جست‌وجوی خودرو در بازار چاکود
      </label>

      <span className="masterSearchLeadingIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <circle
            cx="10.5"
            cy="10.5"
            r="6.4"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m15.4 15.4 4.3 4.3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <input
        id="master-search"
        name="q"
        defaultValue={initialQuery}
        placeholder="برند، مدل یا نام نمایشگاه..."
        autoComplete="off"
        enterKeyHint="search"
      />

      {province ? <input type="hidden" name="province" value={province} /> : null}
      {city ? <input type="hidden" name="city" value={city} /> : null}

      <button type="submit" aria-label="جست‌وجو در بازار خودرو">
        <span className="masterSearchButtonText">جست‌وجو</span>
        <span className="masterSearchButtonIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
            <circle
              cx="10.5"
              cy="10.5"
              r="6.4"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path
              d="m15.4 15.4 4.3 4.3"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
    </form>
  );
}
