"use client";

export const HOME_LOCATION_STORAGE_KEY = "chakod_home_location_v1";
export const HOME_LOCATION_EVENT = "chakod:home-location-changed";

export type HomeLocationCityArea = {
  city: string;
  allNeighborhoods: boolean;
  neighborhoods: string[];
};

export type HomeLocationScope = {
  province: string;
  allCities: boolean;
  /**
   * انتخاب کامل شهرها. برای سازگاری با نسخه‌های قبلی حفظ شده است.
   */
  cities: string[];
  /**
   * انتخاب‌های محله‌ای درون هر شهر.
   */
  areas?: HomeLocationCityArea[];
};

export type HomeLocationSelection = {
  mode: "all" | "province" | "cities" | "multi";
  /**
   * فیلدهای قدیمی برای سازگاری با بخش‌های قبلی پروژه نگه داشته شده‌اند.
   * در انتخاب چنداستانی، province اولین استان و cities مجموع شهرها است.
   */
  province: string;
  cities: string[];
  scopes: HomeLocationScope[];
  label: string;
};

export const DEFAULT_HOME_LOCATION: HomeLocationSelection = {
  mode: "all",
  province: "",
  cities: [],
  scopes: [],
  label: "سراسر ایران",
};

const MAX_PROVINCES = 31;
const MAX_SELECTED_ITEMS = 96;

function cleanText(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

function uniqueTexts(values: unknown[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function normalizeAreas(rawAreas: unknown, selectedCities: string[]) {
  if (!Array.isArray(rawAreas)) return [] as HomeLocationCityArea[];

  const selectedCitySet = new Set(selectedCities);
  const map = new Map<string, HomeLocationCityArea>();

  for (const rawArea of rawAreas) {
    if (!rawArea || typeof rawArea !== "object") continue;

    const area = rawArea as Partial<HomeLocationCityArea>;
    const city = cleanText(area.city);
    if (!city || selectedCitySet.has(city)) continue;

    const allNeighborhoods = Boolean(area.allNeighborhoods);
    const neighborhoods = allNeighborhoods
      ? []
      : uniqueTexts(Array.isArray(area.neighborhoods) ? area.neighborhoods : []);

    if (!allNeighborhoods && neighborhoods.length === 0) continue;

    const current = map.get(city);
    if (!current) {
      map.set(city, {
        city,
        allNeighborhoods,
        neighborhoods,
      });
      continue;
    }

    if (current.allNeighborhoods || allNeighborhoods) {
      map.set(city, {
        city,
        allNeighborhoods: true,
        neighborhoods: [],
      });
      continue;
    }

    map.set(city, {
      city,
      allNeighborhoods: false,
      neighborhoods: uniqueTexts([
        ...current.neighborhoods,
        ...neighborhoods,
      ]),
    });
  }

  return Array.from(map.values());
}

function normalizeScopes(rawScopes: unknown): HomeLocationScope[] {
  if (!Array.isArray(rawScopes)) return [];

  const map = new Map<string, HomeLocationScope>();

  for (const rawScope of rawScopes) {
    if (!rawScope || typeof rawScope !== "object") continue;

    const scope = rawScope as Partial<HomeLocationScope>;
    const province = cleanText(scope.province);
    if (!province) continue;

    const allCities = Boolean(scope.allCities);
    const cities = allCities
      ? []
      : uniqueTexts(Array.isArray(scope.cities) ? scope.cities : []);
    const areas = allCities ? [] : normalizeAreas(scope.areas, cities);

    if (!allCities && cities.length === 0 && areas.length === 0) continue;

    const current = map.get(province);
    if (!current) {
      map.set(province, {
        province,
        allCities,
        cities,
        areas,
      });
      continue;
    }

    if (current.allCities || allCities) {
      map.set(province, {
        province,
        allCities: true,
        cities: [],
        areas: [],
      });
      continue;
    }

    const mergedCities = uniqueTexts([...current.cities, ...cities]);
    map.set(province, {
      province,
      allCities: false,
      cities: mergedCities,
      areas: normalizeAreas(
        [...(current.areas || []), ...areas],
        mergedCities,
      ),
    });
  }

  const limitedScopes = Array.from(map.values()).slice(0, MAX_PROVINCES);
  let remaining = MAX_SELECTED_ITEMS;

  return limitedScopes
    .map((scope) => {
      if (scope.allCities) {
        if (remaining <= 0) return null;
        remaining -= 1;
        return scope;
      }

      const cities = scope.cities.slice(0, Math.max(0, remaining));
      remaining -= cities.length;

      const areas: HomeLocationCityArea[] = [];
      for (const area of scope.areas || []) {
        if (remaining <= 0) break;

        if (area.allNeighborhoods) {
          areas.push(area);
          remaining -= 1;
          continue;
        }

        const neighborhoods = area.neighborhoods.slice(
          0,
          Math.max(0, remaining),
        );
        remaining -= neighborhoods.length;

        if (neighborhoods.length) {
          areas.push({
            ...area,
            neighborhoods,
          });
        }
      }

      if (cities.length === 0 && areas.length === 0) return null;

      return {
        ...scope,
        cities,
        areas,
      };
    })
    .filter((scope): scope is HomeLocationScope => Boolean(scope));
}

function buildPlaces(scopes: HomeLocationScope[]) {
  return scopes.flatMap((scope) => {
    if (scope.allCities) return [`کل ${scope.province}`];

    const cityPlaces = scope.cities.map((city) => city);
    const neighborhoodPlaces = (scope.areas || []).flatMap((area) =>
      area.allNeighborhoods
        ? [area.city]
        : area.neighborhoods.map(
            (neighborhood) => `${neighborhood}، ${area.city}`,
          ),
    );

    return [...cityPlaces, ...neighborhoodPlaces];
  });
}

function buildLabel(scopes: HomeLocationScope[]) {
  if (scopes.length === 0) return "سراسر ایران";

  const places = buildPlaces(scopes);
  if (places.length === 1) return places[0];
  if (places.length === 2) return places.join("، ");

  return `${places.slice(0, 2).join("، ")} +${places.length - 2}`;
}

function selectionFromScopes(scopes: HomeLocationScope[]): HomeLocationSelection {
  const safeScopes = normalizeScopes(scopes);

  if (safeScopes.length === 0) return DEFAULT_HOME_LOCATION;

  const first = safeScopes[0];
  const allCities = uniqueTexts(
    safeScopes.flatMap((scope) => [
      ...scope.cities,
      ...(scope.areas || []).map((area) => area.city),
    ]),
  );
  const placeCount = buildPlaces(safeScopes).length;
  const mode: HomeLocationSelection["mode"] =
    safeScopes.length > 1 || placeCount > 1
      ? "multi"
      : first.allCities
        ? "province"
        : "cities";

  return {
    mode,
    province: first.province,
    cities: allCities,
    scopes: safeScopes,
    label: buildLabel(safeScopes),
  };
}

export function getHomeLocationScopes(
  selection: HomeLocationSelection,
): HomeLocationScope[] {
  return sanitizeHomeLocation(selection).scopes;
}

export function sanitizeHomeLocation(
  value: Partial<HomeLocationSelection> | null | undefined,
): HomeLocationSelection {
  if (!value || value.mode === "all") return DEFAULT_HOME_LOCATION;

  const scopes = normalizeScopes(value.scopes);
  if (scopes.length > 0) return selectionFromScopes(scopes);

  // مهاجرت خودکار داده‌های نسخه قدیمی localStorage.
  const province = cleanText(value.province);
  const cities = uniqueTexts(Array.isArray(value.cities) ? value.cities : []);

  if (value.mode === "province" && province) {
    return selectionFromScopes([
      {
        province,
        allCities: true,
        cities: [],
        areas: [],
      },
    ]);
  }

  if ((value.mode === "cities" || value.mode === "multi") && cities.length > 0) {
    return selectionFromScopes([
      {
        province,
        allCities: false,
        cities,
        areas: [],
      },
    ]);
  }

  return DEFAULT_HOME_LOCATION;
}

export function createHomeLocationSelection(
  scopes: HomeLocationScope[],
): HomeLocationSelection {
  return selectionFromScopes(scopes);
}

export function loadHomeLocation(): HomeLocationSelection {
  if (typeof window === "undefined") return DEFAULT_HOME_LOCATION;

  try {
    const raw = window.localStorage.getItem(HOME_LOCATION_STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_LOCATION;
    return sanitizeHomeLocation(JSON.parse(raw));
  } catch {
    return DEFAULT_HOME_LOCATION;
  }
}

export function saveHomeLocation(selection: HomeLocationSelection) {
  if (typeof window === "undefined") return;

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

/**
 * پارامتر سازگار با API فعلی. انتخاب محله در API عمومی فعلی به سطح شهر
 * نگاشت می‌شود تا فیلتر آگهی‌ها همچنان درست کار کند.
 */
export function buildHomeLocationQuery(selection: HomeLocationSelection) {
  const safeSelection = sanitizeHomeLocation(selection);
  const params = new URLSearchParams();

  if (safeSelection.mode === "all") {
    params.set("scope", "all");
    return params;
  }

  const scope = safeSelection.scopes[0];
  if (!scope) return params;

  params.set("province", scope.province);

  if (!scope.allCities) {
    const cities = uniqueTexts([
      ...scope.cities,
      ...(scope.areas || []).map((area) => area.city),
    ]);
    cities.forEach((city) => params.append("cities[]", city));
  }

  return params;
}
