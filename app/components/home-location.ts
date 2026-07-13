"use client";

export const HOME_LOCATION_STORAGE_KEY = "chakod_home_location_v1";
export const HOME_LOCATION_EVENT = "chakod:home-location-changed";

export type HomeLocationSelection = {
  mode: "all" | "province" | "cities";
  province: string;
  cities: string[];
  label: string;
};

export const DEFAULT_HOME_LOCATION: HomeLocationSelection = {
  mode: "all",
  province: "",
  cities: [],
  label: "سراسر ایران",
};

export function sanitizeHomeLocation(
  value: Partial<HomeLocationSelection> | null | undefined,
): HomeLocationSelection {
  if (!value || value.mode === "all") {
    return DEFAULT_HOME_LOCATION;
  }

  const province = String(value.province || "").trim();
  const cities = Array.isArray(value.cities)
    ? Array.from(
        new Set(
          value.cities
            .map((item) => String(item || "").trim())
            .filter(Boolean),
        ),
      )
    : [];

  if (value.mode === "province" && province) {
    return {
      mode: "province",
      province,
      cities: [],
      label: `کل استان ${province}`,
    };
  }

  if (value.mode === "cities" && cities.length > 0) {
    return {
      mode: "cities",
      province,
      cities,
      label:
        cities.length === 1
          ? cities[0]
          : `${cities.slice(0, 2).join("، ")}${
              cities.length > 2 ? ` +${cities.length - 2}` : ""
            }`,
    };
  }

  return DEFAULT_HOME_LOCATION;
}

export function loadHomeLocation(): HomeLocationSelection {
  if (typeof window === "undefined") {
    return DEFAULT_HOME_LOCATION;
  }

  try {
    const raw = window.localStorage.getItem(HOME_LOCATION_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_HOME_LOCATION;
    }

    return sanitizeHomeLocation(JSON.parse(raw));
  } catch {
    return DEFAULT_HOME_LOCATION;
  }
}

export function saveHomeLocation(selection: HomeLocationSelection) {
  if (typeof window === "undefined") {
    return;
  }

  const safeSelection = sanitizeHomeLocation(selection);

  window.localStorage.setItem(
    HOME_LOCATION_STORAGE_KEY,
    JSON.stringify(safeSelection),
  );

  window.dispatchEvent(
    new CustomEvent<HomeLocationSelection>(HOME_LOCATION_EVENT, {
      detail: safeSelection,
    }),
  );
}

export function buildHomeLocationQuery(selection: HomeLocationSelection) {
  const safeSelection = sanitizeHomeLocation(selection);
  const params = new URLSearchParams();

  if (safeSelection.mode === "all") {
    params.set("scope", "all");
    return params;
  }

  if (safeSelection.mode === "province" && safeSelection.province) {
    params.set("province", safeSelection.province);
    return params;
  }

  if (safeSelection.mode === "cities") {
    safeSelection.cities.forEach((city) => {
      params.append("cities[]", city);
    });
  }

  return params;
}