"use client";

export const HOME_LOCATION_STORAGE_KEY = "chakod_home_location_v1";
export const HOME_LOCATION_EVENT = "chakod:home-location-changed";

export type HomeLocationScope = {
  province: string;
  allCities: boolean;
  cities: string[];
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

const MAX_PROVINCES = 6;
const MAX_CITIES = 24;

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function uniqueTexts(values: unknown[]) {
  return Array.from(
    new Set(values.map(cleanText).filter(Boolean)),
  );
}

function normalizeScopes(rawScopes: unknown): HomeLocationScope[] {
  if (!Array.isArray(rawScopes)) return [];

  const map = new Map<string, HomeLocationScope>();

  for (const rawScope of rawScopes) {
    if (!rawScope || typeof rawScope !== "object") continue;

    const scope = rawScope as Partial<HomeLocationScope>;
    const province = cleanText(scope.province);
    if (!province) continue;

    const cities = uniqueTexts(Array.isArray(scope.cities) ? scope.cities : []);
    const allCities = Boolean(scope.allCities);
    const current = map.get(province);

    if (!current) {
      map.set(province, {
        province,
        allCities,
        cities: allCities ? [] : cities,
      });
      continue;
    }

    if (current.allCities || allCities) {
      map.set(province, {
        province,
        allCities: true,
        cities: [],
      });
      continue;
    }

    map.set(province, {
      province,
      allCities: false,
      cities: uniqueTexts([...current.cities, ...cities]),
    });
  }

  const limitedScopes = Array.from(map.values()).slice(0, MAX_PROVINCES);
  let remainingCities = MAX_CITIES;

  return limitedScopes
    .map((scope) => {
      if (scope.allCities) return scope;

      const cities = scope.cities.slice(0, Math.max(0, remainingCities));
      remainingCities -= cities.length;

      return {
        ...scope,
        cities,
      };
    })
    .filter((scope) => scope.allCities || scope.cities.length > 0);
}

function buildLabel(scopes: HomeLocationScope[]) {
  if (scopes.length === 0) return "سراسر ایران";

  const places = scopes.flatMap((scope) =>
    scope.allCities
      ? [`کل ${scope.province}`]
      : scope.cities.map((city) => city),
  );

  if (places.length === 1) return places[0];
  if (places.length === 2) return places.join("، ");

  return `${places.slice(0, 2).join("، ")} +${places.length - 2}`;
}

function selectionFromScopes(scopes: HomeLocationScope[]): HomeLocationSelection {
  const safeScopes = normalizeScopes(scopes);

  if (safeScopes.length === 0) return DEFAULT_HOME_LOCATION;

  const first = safeScopes[0];
  const allCities = safeScopes.flatMap((scope) => scope.cities);
  const mode: HomeLocationSelection["mode"] =
    safeScopes.length > 1
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
      },
    ]);
  }

  if ((value.mode === "cities" || value.mode === "multi") && cities.length > 0) {
    return selectionFromScopes([
      {
        province,
        allCities: false,
        cities,
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
 * پارامتر سازگار با API فعلی. برای انتخاب چنداستانی، فراخواننده باید برای
 * هر scope جداگانه درخواست بزند؛ بنابراین این تابع فقط scope نخست را می‌سازد.
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
    scope.cities.forEach((city) => params.append("cities[]", city));
  }

  return params;
}
