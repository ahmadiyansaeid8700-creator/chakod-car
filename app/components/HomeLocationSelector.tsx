"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HOME_LOCATION_STORAGE_KEY,
  createHomeLocationSelection,
  loadHomeLocation,
  saveHomeLocation,
  sanitizeHomeLocation,
  type HomeLocationCityArea,
  type HomeLocationScope,
  type HomeLocationSelection,
} from "./home-location";

const DIRECT_API_URL = "https://api.chakod.com/api/geo-locations.php";
const PROXY_API_URL = "/api/geo-locations";
const MAX_PROVINCES = 31;
const MAX_SELECTED_ITEMS = 96;
const RECENT_STORAGE_KEY = "chakod_home_location_recent_v2";
const RECENT_LIMIT = 4;
const SEARCH_MIN_LENGTH = 2;
const CITY_LOAD_CONCURRENCY = 5;
const GEO_CACHE_PREFIX = "chakod_geo_cache_v4:";
const GEO_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const GEO_REQUEST_TIMEOUT_MS = 6500;

type GeoResponse = {
  success?: boolean;
  type?: string;
  has_neighborhoods?: boolean;
  data?: string[];
  message?: string;
};

type GeoResult = {
  data: string[];
  type: string;
  hasNeighborhoods: boolean;
};

type GeoCacheEntry = {
  expiresAt: number;
  value: GeoResult;
};

const memoryGeoCache = new Map<string, GeoCacheEntry>();

type HomeLocationSelectorProps = {
  value?: HomeLocationSelection;
  onChange?: (selection: HomeLocationSelection) => void;
  persist?: boolean;
  triggerTitle?: string;
  dialogEyebrow?: string;
  dialogTitle?: string;
};

type CitySearchResult = {
  province: string;
  city: string;
};

type NeighborhoodSearchResult = {
  province: string;
  city: string;
  neighborhood: string;
};

function normalize(value: string) {
  return String(value || "")
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function uniqueTexts(values: string[]) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  );
}

function buildGeoUrl(base: string, params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();
  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);
  return search.size ? `${base}?${search.toString()}` : base;
}

async function parseGeoResponse(response: Response): Promise<GeoResult> {
  const text = await response.text();
  let json: GeoResponse;

  try {
    json = JSON.parse(text) as GeoResponse;
  } catch {
    throw new Error("پاسخ سرویس موقعیت معتبر نیست.");
  }

  if (!response.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || "دریافت اطلاعات موقعیت انجام نشد.");
  }

  return {
    data: uniqueTexts(json.data),
    type: String(json.type || ""),
    hasNeighborhoods: Boolean(json.has_neighborhoods),
  };
}

function geoCacheKey(params?: { province?: string; city?: string }) {
  return `${params?.province || "all"}::${params?.city || ""}`;
}

function readGeoCache(key: string) {
  const memoryEntry = memoryGeoCache.get(key);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.value;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`${GEO_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCacheEntry;
    if (!parsed?.value || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(`${GEO_CACHE_PREFIX}${key}`);
      return null;
    }
    memoryGeoCache.set(key, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

function writeGeoCache(key: string, value: GeoResult) {
  const entry: GeoCacheEntry = {
    expiresAt: Date.now() + GEO_CACHE_TTL_MS,
    value,
  };
  memoryGeoCache.set(key, entry);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${GEO_CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // پرشدن localStorage نباید انتخاب محدوده را متوقف کند.
    }
  }
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GEO_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchGeo(params?: { province?: string; city?: string }) {
  const key = geoCacheKey(params);
  const cached = readGeoCache(key);
  if (cached) return cached;

  let proxyError: unknown;

  try {
    const proxyResponse = await fetchWithTimeout(buildGeoUrl(PROXY_API_URL, params), {
      cache: "default",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const result = await parseGeoResponse(proxyResponse);
    if (!params?.province && result.data.length === 0) {
      throw new Error("فهرست استان‌ها خالی است.");
    }
    if (params?.province && !params.city && result.data.length === 0) {
      throw new Error(`فهرست شهرهای ${params.province} خالی است.`);
    }
    writeGeoCache(key, result);
    return result;
  } catch (error) {
    proxyError = error;
  }

  try {
    const directResponse = await fetchWithTimeout(buildGeoUrl(DIRECT_API_URL, params), {
      cache: "default",
      mode: "cors",
      headers: { Accept: "application/json" },
    });
    const result = await parseGeoResponse(directResponse);
    if (!params?.province && result.data.length === 0) {
      throw new Error("فهرست استان‌ها خالی است.");
    }
    if (params?.province && !params.city && result.data.length === 0) {
      throw new Error(`فهرست شهرهای ${params.province} خالی است.`);
    }
    writeGeoCache(key, result);
    return result;
  } catch (directError) {
    if (proxyError instanceof Error) throw proxyError;
    if (directError instanceof Error) throw directError;
    throw new Error("ارتباط با سرویس موقعیت برقرار نشد.");
  }
}

function cloneScopes(scopes: HomeLocationScope[]) {
  return scopes.map((scope) => ({
    ...scope,
    cities: [...scope.cities],
    areas: (scope.areas || []).map((area) => ({
      ...area,
      neighborhoods: [...area.neighborhoods],
    })),
  }));
}

function countSelectedItems(scopes: HomeLocationScope[]) {
  return scopes.reduce((total, scope) => {
    if (scope.allCities) return total + 1;

    const areasCount = (scope.areas || []).reduce(
      (areaTotal, area) =>
        areaTotal + (area.allNeighborhoods ? 1 : area.neighborhoods.length),
      0,
    );

    return total + scope.cities.length + areasCount;
  }, 0);
}

function selectionSignature(selection: HomeLocationSelection) {
  return selection.scopes
    .map((scope) => {
      if (scope.allCities) return `${scope.province}:*`;

      const cities = [...scope.cities].sort().join("|");
      const areas = (scope.areas || [])
        .map((area) =>
          area.allNeighborhoods
            ? `${area.city}:*`
            : `${area.city}:${[...area.neighborhoods].sort().join("|")}`,
        )
        .sort()
        .join(";");

      return `${scope.province}:${cities}#${areas}`;
    })
    .sort()
    .join(";;");
}

function readRecentSelections() {
  if (typeof window === "undefined") return [] as HomeLocationSelection[];

  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const selections: HomeLocationSelection[] = [];

    for (const item of parsed) {
      const selection = sanitizeHomeLocation(item);
      if (selection.mode === "all") continue;

      const signature = selectionSignature(selection);
      if (!signature || seen.has(signature)) continue;

      seen.add(signature);
      selections.push(selection);
      if (selections.length >= RECENT_LIMIT) break;
    }

    return selections;
  } catch {
    return [];
  }
}

function writeRecentSelections(selections: HomeLocationSelection[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    RECENT_STORAGE_KEY,
    JSON.stringify(selections.slice(0, RECENT_LIMIT)),
  );
}

function locationKey(province: string, city: string) {
  return `${province}::${city}`;
}

function splitLocationKey(key: string) {
  const separatorIndex = key.indexOf("::");
  return separatorIndex >= 0
    ? [key.slice(0, separatorIndex), key.slice(separatorIndex + 2)]
    : ["", ""];
}

function getProvinceStatus(scope?: HomeLocationScope) {
  if (!scope) return "انتخاب شهر یا محله";
  if (scope.allCities) return "کل استان انتخاب شده";

  const areaCount = (scope.areas || []).reduce(
    (total, area) =>
      total + (area.allNeighborhoods ? 1 : area.neighborhoods.length),
    0,
  );
  const count = scope.cities.length + areaCount;
  return `${count.toLocaleString("fa-IR")} محدوده انتخاب شده`;
}

function getCityArea(scope: HomeLocationScope | undefined, city: string) {
  return scope?.areas?.find((area) => area.city === city);
}

export default function HomeLocationSelector({
  value,
  onChange,
  persist = true,
  triggerTitle = "محدوده نمایش",
  dialogEyebrow = "محدوده آگهی‌ها",
  dialogTitle = "انتخاب محدوده",
}: HomeLocationSelectorProps = {}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const cityIndexPromiseRef = useRef<Promise<void> | null>(null);

  const [open, setOpen] = useState(false);
  const [savedSelection, setSavedSelection] = useState<HomeLocationSelection>(
    DEFAULT_HOME_LOCATION,
  );
  const [draftScopes, setDraftScopes] = useState<HomeLocationScope[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [citiesByProvince, setCitiesByProvince] = useState<Record<string, string[]>>({});
  const [neighborhoodsByCity, setNeighborhoodsByCity] = useState<Record<string, string[]>>({});
  const [cityHasNeighborhoods, setCityHasNeighborhoods] = useState<Record<string, boolean>>({});
  const [expandedProvince, setExpandedProvince] = useState("");
  const [expandedCityKey, setExpandedCityKey] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingProvince, setLoadingProvince] = useState("");
  const [loadingCityKey, setLoadingCityKey] = useState("");
  const [indexingCities, setIndexingCities] = useState(false);
  const [cityIndexReady, setCityIndexReady] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const [recentSelections, setRecentSelections] = useState<HomeLocationSelection[]>([]);

  const loadProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    setError("");

    try {
      const result = await fetchGeo();
      if (!result.data.length) {
        throw new Error("فهرست استان‌ها خالی است.");
      }
      setProvinces(result.data);
    } catch (loadError) {
      setProvinces([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "دریافت فهرست استان‌ها انجام نشد.",
      );
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  useEffect(() => {
    let loadedSelection = DEFAULT_HOME_LOCATION;

    try {
      loadedSelection = value
        ? sanitizeHomeLocation(value)
        : persist
          ? loadHomeLocation()
          : DEFAULT_HOME_LOCATION;
    } catch {
      loadedSelection = DEFAULT_HOME_LOCATION;
    }

    setSavedSelection(loadedSelection);
    setRecentSelections(readRecentSelections());
    void loadProvinces();

    const handleStorage = (event: StorageEvent) => {
      if (persist && event.key === HOME_LOCATION_STORAGE_KEY) {
        setSavedSelection(loadHomeLocation());
      }
    };

    const handleLocationChange = (event: Event) => {
      if (!persist) return;
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setSavedSelection(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    };
  }, [loadProvinces, loadVersion, persist]);

  useEffect(() => {
    if (value) setSavedSelection(sanitizeHomeLocation(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const scopes = cloneScopes(savedSelection.scopes);
    setDraftScopes(scopes);
    setExpandedProvince(scopes[0]?.province || "");
    setExpandedCityKey("");
    setQuery("");

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, savedSelection]);

  useEffect(() => {
    if (!open || loadingProvinces || provinces.length > 0) return;
    void loadProvinces();
  }, [loadProvinces, loadingProvinces, open, provinces.length]);

  const ensureProvinceCities = useCallback(
    async (province: string) => {
      if (!province || citiesByProvince[province]) return citiesByProvince[province] || [];

      setLoadingProvince(province);
      setError("");

      try {
        const result = await fetchGeo({ province });
        setCitiesByProvince((current) => ({
          ...current,
          [province]: result.data,
        }));
        return result.data;
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : `دریافت شهرهای ${province} انجام نشد.`,
        );
        return [];
      } finally {
        setLoadingProvince("");
      }
    },
    [citiesByProvince],
  );

  useEffect(() => {
    if (open && expandedProvince && !citiesByProvince[expandedProvince]) {
      void ensureProvinceCities(expandedProvince);
    }
  }, [citiesByProvince, ensureProvinceCities, expandedProvince, open]);

  const ensureCityNeighborhoods = useCallback(
    async (province: string, city: string) => {
      const key = locationKey(province, city);
      if (Object.prototype.hasOwnProperty.call(neighborhoodsByCity, key)) {
        return neighborhoodsByCity[key];
      }

      setLoadingCityKey(key);
      setError("");

      try {
        const result = await fetchGeo({ province, city });
        setNeighborhoodsByCity((current) => ({
          ...current,
          [key]: result.data,
        }));
        setCityHasNeighborhoods((current) => ({
          ...current,
          [key]: result.hasNeighborhoods || result.data.length > 0,
        }));
        return result.data;
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : `دریافت محله‌های ${city} انجام نشد.`,
        );
        return [];
      } finally {
        setLoadingCityKey("");
      }
    },
    [neighborhoodsByCity],
  );

  useEffect(() => {
    if (!open || !expandedCityKey) return;
    const [province, city] = splitLocationKey(expandedCityKey);
    if (province && city) void ensureCityNeighborhoods(province, city);
  }, [ensureCityNeighborhoods, expandedCityKey, open]);

  const ensureCityIndex = useCallback(async () => {
    if (cityIndexReady || indexingCities || !provinces.length) return;
    if (cityIndexPromiseRef.current) return cityIndexPromiseRef.current;

    const task = (async () => {
      setIndexingCities(true);
      setError("");

      try {
        for (let index = 0; index < provinces.length; index += CITY_LOAD_CONCURRENCY) {
          const batch = provinces.slice(index, index + CITY_LOAD_CONCURRENCY);
          const results = await Promise.all(
            batch.map(async (province) => {
              if (citiesByProvince[province]) {
                return [province, citiesByProvince[province]] as const;
              }

              try {
                const result = await fetchGeo({ province });
                return [province, result.data] as const;
              } catch {
                return [province, [] as string[]] as const;
              }
            }),
          );

          setCitiesByProvince((current) => {
            const next = { ...current };
            for (const [province, cities] of results) {
              if (!next[province]) next[province] = cities;
            }
            return next;
          });
        }

        setCityIndexReady(true);
      } finally {
        setIndexingCities(false);
        cityIndexPromiseRef.current = null;
      }
    })();

    cityIndexPromiseRef.current = task;
    return task;
  }, [citiesByProvince, cityIndexReady, indexingCities, provinces]);

  useEffect(() => {
    const normalizedQuery = normalize(query);
    if (open && normalizedQuery.length >= SEARCH_MIN_LENGTH) {
      void ensureCityIndex();
    }
  }, [ensureCityIndex, open, query]);

  const normalizedQuery = normalize(query);

  const provinceResults = useMemo(() => {
    if (normalizedQuery.length < SEARCH_MIN_LENGTH) return [];
    return provinces.filter((province) =>
      normalize(province).includes(normalizedQuery),
    );
  }, [normalizedQuery, provinces]);

  const cityResults = useMemo(() => {
    if (normalizedQuery.length < SEARCH_MIN_LENGTH) return [] as CitySearchResult[];

    const results: CitySearchResult[] = [];
    for (const province of provinces) {
      for (const city of citiesByProvince[province] || []) {
        if (normalize(city).includes(normalizedQuery)) {
          results.push({ province, city });
          if (results.length >= 24) return results;
        }
      }
    }
    return results;
  }, [citiesByProvince, normalizedQuery, provinces]);

  const neighborhoodResults = useMemo(() => {
    if (normalizedQuery.length < SEARCH_MIN_LENGTH) {
      return [] as NeighborhoodSearchResult[];
    }

    const results: NeighborhoodSearchResult[] = [];
    for (const [key, neighborhoods] of Object.entries(neighborhoodsByCity)) {
      const [province, city] = splitLocationKey(key);
      for (const neighborhood of neighborhoods) {
        if (normalize(neighborhood).includes(normalizedQuery)) {
          results.push({ province, city, neighborhood });
          if (results.length >= 24) return results;
        }
      }
    }
    return results;
  }, [neighborhoodsByCity, normalizedQuery]);

  const visibleProvinces = useMemo(() => {
    if (normalizedQuery.length < SEARCH_MIN_LENGTH) return provinces;

    const provinceSet = new Set(provinceResults);
    cityResults.forEach((result) => provinceSet.add(result.province));
    neighborhoodResults.forEach((result) => provinceSet.add(result.province));

    return provinces.filter((province) => provinceSet.has(province));
  }, [cityResults, neighborhoodResults, normalizedQuery, provinceResults, provinces]);

  const draftSelection = useMemo(
    () => createHomeLocationSelection(draftScopes),
    [draftScopes],
  );
  const totalSelections = countSelectedItems(draftScopes);

  function findScope(province: string) {
    return draftScopes.find((scope) => scope.province === province);
  }

  function canAddSelection(current: HomeLocationScope[], amount = 1) {
    if (countSelectedItems(current) + amount > MAX_SELECTED_ITEMS) {
      setError(`حداکثر ${MAX_SELECTED_ITEMS} محدوده را می‌توان انتخاب کرد.`);
      return false;
    }
    return true;
  }

  function toggleExpandProvince(province: string) {
    setExpandedProvince((current) => (current === province ? "" : province));
    setExpandedCityKey("");
    setError("");
  }

  function openProvince(province: string) {
    setQuery("");
    setExpandedProvince(province);
    setExpandedCityKey("");
    setError("");
    void ensureProvinceCities(province);
  }

  function openCity(province: string, city: string) {
    const key = locationKey(province, city);
    setQuery("");
    setExpandedProvince(province);
    setExpandedCityKey(key);
    setError("");
    void ensureProvinceCities(province);
    void ensureCityNeighborhoods(province, city);
  }

  function selectWholeProvince(province: string) {
    setError("");
    setDraftScopes((current) => {
      const existing = current.find((scope) => scope.province === province);

      if (existing?.allCities) {
        return current.filter((scope) => scope.province !== province);
      }

      if (!existing && current.length >= MAX_PROVINCES) {
        setError(`حداکثر ${MAX_PROVINCES} استان را می‌توان انتخاب کرد.`);
        return current;
      }

      if (!existing && !canAddSelection(current)) return current;

      const nextScope: HomeLocationScope = {
        province,
        allCities: true,
        cities: [],
        areas: [],
      };

      return existing
        ? current.map((scope) =>
            scope.province === province ? nextScope : scope,
          )
        : [...current, nextScope];
    });
  }

  function toggleWholeCity(province: string, city: string) {
    setError("");
    setDraftScopes((current) => {
      const existing = current.find((scope) => scope.province === province);
      const citySelected = Boolean(existing?.allCities || existing?.cities.includes(city));

      if (existing?.allCities) {
        return current.map((scope) =>
          scope.province === province
            ? {
                province,
                allCities: false,
                cities: [city],
                areas: [],
              }
            : scope,
        );
      }

      if (citySelected) {
        return current.flatMap((scope) => {
          if (scope.province !== province) return [scope];

          const cities = scope.cities.filter((item) => item !== city);
          const areas = (scope.areas || []).filter((area) => area.city !== city);
          return cities.length || areas.length
            ? [{ ...scope, cities, areas }]
            : [];
        });
      }

      if (!existing && current.length >= MAX_PROVINCES) {
        setError(`حداکثر ${MAX_PROVINCES} استان را می‌توان انتخاب کرد.`);
        return current;
      }
      if (!canAddSelection(current)) return current;

      if (existing) {
        return current.map((scope) =>
          scope.province === province
            ? {
                ...scope,
                allCities: false,
                cities: [...scope.cities, city],
                areas: (scope.areas || []).filter((area) => area.city !== city),
              }
            : scope,
        );
      }

      return [
        ...current,
        {
          province,
          allCities: false,
          cities: [city],
          areas: [],
        },
      ];
    });
  }

  function toggleNeighborhood(province: string, city: string, neighborhood: string) {
    setError("");
    setDraftScopes((current) => {
      const existing = current.find((scope) => scope.province === province);
      const area = getCityArea(existing, city);
      const neighborhoodSelected = Boolean(
        existing?.allCities ||
          existing?.cities.includes(city) ||
          area?.allNeighborhoods ||
          area?.neighborhoods.includes(neighborhood),
      );

      if (existing?.allCities || existing?.cities.includes(city)) {
        return current.map((scope) =>
          scope.province === province
            ? {
                province,
                allCities: false,
                cities: scope.cities.filter((item) => item !== city),
                areas: [
                  ...(scope.areas || []).filter((item) => item.city !== city),
                  {
                    city,
                    allNeighborhoods: false,
                    neighborhoods: [neighborhood],
                  },
                ],
              }
            : scope,
        );
      }

      if (neighborhoodSelected) {
        return current.flatMap((scope) => {
          if (scope.province !== province) return [scope];

          const areas = (scope.areas || []).flatMap((item) => {
            if (item.city !== city) return [item];
            if (item.allNeighborhoods) return [];

            const neighborhoods = item.neighborhoods.filter(
              (value) => value !== neighborhood,
            );
            return neighborhoods.length
              ? [{ ...item, neighborhoods }]
              : [];
          });

          return scope.cities.length || areas.length
            ? [{ ...scope, areas }]
            : [];
        });
      }

      if (!existing && current.length >= MAX_PROVINCES) {
        setError(`حداکثر ${MAX_PROVINCES} استان را می‌توان انتخاب کرد.`);
        return current;
      }
      if (!canAddSelection(current)) return current;

      if (existing) {
        return current.map((scope) => {
          if (scope.province !== province) return scope;

          const currentArea = getCityArea(scope, city);
          const nextArea: HomeLocationCityArea = currentArea
            ? {
                city,
                allNeighborhoods: false,
                neighborhoods: [...currentArea.neighborhoods, neighborhood],
              }
            : {
                city,
                allNeighborhoods: false,
                neighborhoods: [neighborhood],
              };

          return {
            ...scope,
            areas: [
              ...(scope.areas || []).filter((item) => item.city !== city),
              nextArea,
            ],
          };
        });
      }

      return [
        ...current,
        {
          province,
          allCities: false,
          cities: [],
          areas: [
            {
              city,
              allNeighborhoods: false,
              neighborhoods: [neighborhood],
            },
          ],
        },
      ];
    });
  }

  function removeScope(province: string) {
    setDraftScopes((current) =>
      current.filter((scope) => scope.province !== province),
    );
  }

  function removeCity(province: string, city: string) {
    setDraftScopes((current) =>
      current.flatMap((scope) => {
        if (scope.province !== province) return [scope];
        const cities = scope.cities.filter((item) => item !== city);
        const areas = (scope.areas || []).filter((area) => area.city !== city);
        return cities.length || areas.length
          ? [{ ...scope, cities, areas }]
          : [];
      }),
    );
  }

  function removeNeighborhood(province: string, city: string, neighborhood: string) {
    setDraftScopes((current) =>
      current.flatMap((scope) => {
        if (scope.province !== province) return [scope];

        const areas = (scope.areas || []).flatMap((area) => {
          if (area.city !== city) return [area];
          const neighborhoods = area.neighborhoods.filter(
            (item) => item !== neighborhood,
          );
          return neighborhoods.length ? [{ ...area, neighborhoods }] : [];
        });

        return scope.cities.length || areas.length
          ? [{ ...scope, areas }]
          : [];
      }),
    );
  }

  function clearSelection() {
    setDraftScopes([]);
    setExpandedProvince("");
    setExpandedCityKey("");
    setError("");
  }

  function commitSelection(selection: HomeLocationSelection) {
    const safeSelection = sanitizeHomeLocation(selection);
    setSavedSelection(safeSelection);
    if (persist) saveHomeLocation(safeSelection);
    onChange?.(safeSelection);
    setOpen(false);
  }

  function chooseAllIran() {
    commitSelection(DEFAULT_HOME_LOCATION);
  }

  function chooseRecent(selection: HomeLocationSelection) {
    setDraftScopes(cloneScopes(selection.scopes));
    setExpandedProvince(selection.scopes[0]?.province || "");
    setExpandedCityKey("");
    setQuery("");
    setError("");
  }

  function removeRecentSelection(signature: string) {
    const next = recentSelections.filter(
      (selection) => selectionSignature(selection) !== signature,
    );
    setRecentSelections(next);
    writeRecentSelections(next);
  }

  function applySelection() {
    const nextSelection = draftScopes.length
      ? draftSelection
      : DEFAULT_HOME_LOCATION;

    if (nextSelection.mode !== "all") {
      const signature = selectionSignature(nextSelection);
      const merged = [
        nextSelection,
        ...recentSelections.filter(
          (selection) => selectionSignature(selection) !== signature,
        ),
      ].slice(0, RECENT_LIMIT);
      setRecentSelections(merged);
      writeRecentSelections(merged);
    }

    commitSelection(nextSelection);
  }

  const hasSearchResults =
    provinceResults.length > 0 ||
    cityResults.length > 0 ||
    neighborhoodResults.length > 0;

  return (
    <div className="chakodLocationSelector" dir="rtl">
      <button
        type="button"
        className={`chakodLocationTrigger ${open ? "open" : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="chakodLocationPin" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M19 9.8c0 4.8-7 10.7-7 10.7S5 14.6 5 9.8a7 7 0 1 1 14 0Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="9.8" r="2.2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
        <span className="chakodLocationTriggerCopy">
          <small>{triggerTitle}</small>
          <strong>{savedSelection.label}</strong>
        </span>
        <span className="chakodLocationArrowWrap" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="chakodLocationBackdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) setOpen(false);
              }}
            >
              <section
                ref={dialogRef}
                className="chakodLocationDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="chakod-location-title"
                tabIndex={-1}
              >
                <header className="chakodLocationHeader">
                  <div>
                    <span>{dialogEyebrow}</span>
                    <h2 id="chakod-location-title">{dialogTitle}</h2>
                    <p>سراسر ایران، یک استان کامل، شهر یا محله‌های مشخص را انتخاب کنید.</p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="بستن">
                    <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                      <path d="M5 5 15 15M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </header>

                <div className="chakodLocationSearchWrap">
                  <label className="chakodLocationSearch">
                    <span aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" strokeWidth="1.8" />
                        <path d="m15.2 15.2 4.4 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="جست‌وجوی استان، شهر یا محله"
                    />
                    {query ? (
                      <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جست‌وجو">×</button>
                    ) : null}
                  </label>

                  <button
                    type="button"
                    className={`chakodLocationAll ${draftScopes.length === 0 ? "active" : ""}`}
                    onClick={chooseAllIran}
                  >
                    <span aria-hidden="true">◎</span>
                    <div>
                      <strong>سراسر ایران</strong>
                      <small>نمایش همه آگهی‌ها</small>
                    </div>
                  </button>
                </div>

                {draftScopes.length ? (
                  <div className="chakodLocationSelected">
                    <div className="chakodLocationSelectedHead">
                      <strong>انتخاب‌های من</strong>
                      <button type="button" onClick={clearSelection} aria-label="حذف همه انتخاب‌ها">
                        <span aria-hidden="true">⌫</span> حذف همه
                      </button>
                    </div>
                    <div className="chakodLocationChips">
                      {draftScopes.flatMap((scope) => {
                        if (scope.allCities) {
                          return [
                            <button key={`${scope.province}-all`} type="button" onClick={() => removeScope(scope.province)} aria-label={`حذف کل ${scope.province}`}>
                              <b>کل {scope.province}</b><span aria-hidden="true">×</span>
                            </button>,
                          ];
                        }

                        return [
                          ...scope.cities.map((city) => (
                            <button key={`${scope.province}-${city}`} type="button" onClick={() => removeCity(scope.province, city)} aria-label={`حذف ${city} از ${scope.province}`}>
                              <b>{city}</b><small>{scope.province}</small><span aria-hidden="true">×</span>
                            </button>
                          )),
                          ...(scope.areas || []).flatMap((area) =>
                            area.neighborhoods.map((neighborhood) => (
                              <button key={`${scope.province}-${area.city}-${neighborhood}`} type="button" onClick={() => removeNeighborhood(scope.province, area.city, neighborhood)} aria-label={`حذف ${neighborhood} از ${area.city}`}>
                                <b>{neighborhood}</b><small>{area.city}</small><span aria-hidden="true">×</span>
                              </button>
                            )),
                          ),
                        ];
                      })}
                    </div>
                  </div>
                ) : null}

                <main className="chakodLocationBody">
                  {!query && recentSelections.length ? (
                    <section className="chakodLocationRecent">
                      <div className="chakodLocationRecentHead">
                        <div><strong>انتخاب‌های قبلی</strong><small>برای استفاده دوباره انتخاب کنید</small></div>
                        <button type="button" onClick={() => {
                          setRecentSelections([]);
                          window.localStorage.removeItem(RECENT_STORAGE_KEY);
                        }}>پاک کردن سابقه</button>
                      </div>
                      <div className="chakodLocationRecentRail">
                        {recentSelections.map((selection) => {
                          const signature = selectionSignature(selection);
                          return (
                            <div key={signature} className="chakodLocationRecentItem">
                              <button type="button" className="chakodLocationRecentUse" onClick={() => chooseRecent(selection)}>
                                <span>↻</span><strong>{selection.label}</strong>
                              </button>
                              <button type="button" className="chakodLocationRecentRemove" onClick={() => removeRecentSelection(signature)}>×</button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {normalizedQuery.length >= SEARCH_MIN_LENGTH ? (
                    <section className="chakodLocationSearchResults">
                      <div className="chakodLocationSearchResultsHead">
                        <strong>نتایج جست‌وجو</strong>
                        {indexingCities ? <small>در حال بررسی شهرهای همه استان‌ها...</small> : null}
                      </div>

                      {!hasSearchResults && !indexingCities ? (
                        <div className="chakodLocationEmptySearch">نتیجه‌ای پیدا نشد. نام را کوتاه‌تر وارد کنید.</div>
                      ) : null}

                      {provinceResults.length ? (
                        <div className="chakodLocationResultGroup">
                          <span>استان‌ها</span>
                          <div>
                            {provinceResults.map((province) => (
                              <button key={province} type="button" onClick={() => openProvince(province)}>
                                <strong>{province}</strong><small>مشاهده همه شهرها</small><b>←</b>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {cityResults.length ? (
                        <div className="chakodLocationResultGroup">
                          <span>شهرها</span>
                          <div>
                            {cityResults.map(({ province, city }) => (
                              <button key={`${province}-${city}`} type="button" onClick={() => openCity(province, city)}>
                                <strong>{city}</strong><small>{province}</small><b>←</b>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {neighborhoodResults.length ? (
                        <div className="chakodLocationResultGroup">
                          <span>محله‌ها</span>
                          <div>
                            {neighborhoodResults.map(({ province, city, neighborhood }) => (
                              <button key={`${province}-${city}-${neighborhood}`} type="button" onClick={() => toggleNeighborhood(province, city, neighborhood)}>
                                <strong>{neighborhood}</strong><small>{city}، {province}</small><b>+</b>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {loadingProvinces ? <div className="chakodLocationState">در حال دریافت استان‌ها...</div> : null}

                  {error ? (
                    <div className="chakodLocationError">
                      <span>{error}</span>
                      <button type="button" onClick={() => {
                        setError("");
                        setLoadVersion((value) => value + 1);
                      }}>تلاش دوباره</button>
                    </div>
                  ) : null}

                  {!loadingProvinces && !error && provinces.length === 0 ? (
                    <div className="chakodLocationEmptyState">
                      <strong>فهرست موقعیت‌ها دریافت نشد</strong>
                      <span>اتصال به سرویس موقعیت برقرار نیست یا مسیر API در دسترس نیست.</span>
                      <button type="button" onClick={() => setLoadVersion((value) => value + 1)}>
                        دریافت دوباره
                      </button>
                    </div>
                  ) : null}

                  <div className="chakodLocationList">
                    {visibleProvinces.map((province) => {
                      const scope = findScope(province);
                      const expanded = expandedProvince === province;
                      const cities = citiesByProvince[province] || [];

                      return (
                        <section key={province} className={`chakodLocationProvince ${expanded ? "expanded" : ""}`}>
                          <div className="chakodLocationProvinceRow">
                            <button
                              type="button"
                              className={`chakodLocationProvinceCheck ${scope?.allCities ? "checked" : scope ? "partial" : ""}`}
                              onClick={() => selectWholeProvince(province)}
                              aria-label={`انتخاب کل استان ${province}`}
                            >
                              {scope?.allCities ? "✓" : scope ? "•" : ""}
                            </button>
                            <button type="button" className="chakodLocationProvinceName" onClick={() => toggleExpandProvince(province)}>
                              <span><strong>{province}</strong><small>{getProvinceStatus(scope)}</small></span>
                              <b><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></b>
                            </button>
                          </div>

                          {expanded ? (
                            <div className="chakodLocationCities">
                              <button type="button" className={`chakodLocationWholeProvince ${scope?.allCities ? "active" : ""}`} onClick={() => selectWholeProvince(province)}>
                                <span>{scope?.allCities ? "✓" : ""}</span><div><strong>کل استان {province}</strong><small>تمام شهرها و محله‌های این استان</small></div>
                              </button>

                              {loadingProvince === province ? <div className="chakodLocationCityState">در حال دریافت شهرها...</div> : null}
                              {loadingProvince !== province && cities.length === 0 ? <div className="chakodLocationCityState">شهری برای این استان دریافت نشد.</div> : null}

                              <div className="chakodLocationCityList">
                                {cities.map((city) => {
                                  const key = locationKey(province, city);
                                  const cityExpanded = expandedCityKey === key;
                                  const citySelected = Boolean(scope?.allCities || scope?.cities.includes(city));
                                  const cityArea = getCityArea(scope, city);
                                  const cityPartial = Boolean(cityArea?.neighborhoods.length);
                                  const neighborhoods = neighborhoodsByCity[key] || [];
                                  const hasNeighborhoods = cityHasNeighborhoods[key];

                                  return (
                                    <section key={key} className={`chakodLocationCity ${cityExpanded ? "expanded" : ""}`}>
                                      <div className="chakodLocationCityRow">
                                        <button type="button" className={`chakodLocationCityCheck ${citySelected ? "checked" : cityPartial ? "partial" : ""}`} onClick={() => toggleWholeCity(province, city)}>
                                          {citySelected ? "✓" : cityPartial ? "•" : ""}
                                        </button>
                                        <button type="button" className="chakodLocationCityName" onClick={() => {
                                          setExpandedCityKey((current) => current === key ? "" : key);
                                          setError("");
                                        }}>
                                          <span><strong>{city}</strong><small>{citySelected ? "کل شهر انتخاب شده" : cityPartial ? `${cityArea?.neighborhoods.length || 0} محله انتخاب شده` : "انتخاب شهر یا محله"}</small></span>
                                          <b><svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></b>
                                        </button>
                                      </div>

                                      {cityExpanded ? (
                                        <div className="chakodLocationNeighborhoods">
                                          <button type="button" className={`chakodLocationWholeCity ${citySelected ? "active" : ""}`} onClick={() => toggleWholeCity(province, city)}>
                                            <span>{citySelected ? "✓" : ""}</span><div><strong>کل شهر {city}</strong><small>همه محله‌های این شهر</small></div>
                                          </button>

                                          {loadingCityKey === key ? <div className="chakodLocationNeighborhoodState">در حال دریافت محله‌ها...</div> : null}
                                          {loadingCityKey !== key && hasNeighborhoods === false ? <div className="chakodLocationNeighborhoodState">برای این شهر محله‌ای ثبت نشده است.</div> : null}

                                          {neighborhoods.length ? (
                                            <div className="chakodLocationNeighborhoodGrid">
                                              {neighborhoods.map((neighborhood) => {
                                                const selected = Boolean(citySelected || cityArea?.neighborhoods.includes(neighborhood));
                                                return (
                                                  <button key={neighborhood} type="button" className={selected ? "selected" : ""} onClick={() => toggleNeighborhood(province, city, neighborhood)}>
                                                    <span>{selected ? "✓" : ""}</span><strong>{neighborhood}</strong>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </section>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </section>
                      );
                    })}
                  </div>
                </main>

                <footer className="chakodLocationFooter">
                  <div><strong>{draftScopes.length ? draftSelection.label : "سراسر ایران"}</strong><small>{draftScopes.length ? `${totalSelections.toLocaleString("fa-IR")} محدوده انتخاب شده` : "نمایش همه آگهی‌ها"}</small></div>
                  <button type="button" onClick={applySelection}>{draftScopes.length ? `اعمال ${totalSelections.toLocaleString("fa-IR")} محدوده` : "اعمال سراسر ایران"}</button>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}

      <style>{`
        .chakodLocationSelector{position:relative;font-family:Tahoma,Arial,sans-serif}.chakodLocationTrigger{width:100%;min-height:54px;padding:10px 12px;border:1px solid #e3d8f3;border-radius:18px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;color:#211633;background:linear-gradient(180deg,#fff,#fcf9ff);cursor:pointer;box-shadow:0 14px 36px rgba(76,29,149,.09);transition:.18s}.chakodLocationTrigger:hover,.chakodLocationTrigger.open{border-color:#b794f4;box-shadow:0 18px 40px rgba(109,40,217,.14);transform:translateY(-1px)}.chakodLocationPin{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#7c3aed,#a855f7)}.chakodLocationTriggerCopy{min-width:0;text-align:right}.chakodLocationTriggerCopy small,.chakodLocationTriggerCopy strong{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.chakodLocationTriggerCopy small{color:#8a7f96;font-size:11px}.chakodLocationTriggerCopy strong{margin-top:4px;font-size:13px}.chakodLocationArrowWrap{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;color:#6d28d9;background:#f4eeff;transition:.2s}.chakodLocationTrigger.open .chakodLocationArrowWrap{transform:rotate(180deg)}
        .chakodLocationBackdrop{position:fixed;inset:0;z-index:2147483647;padding:18px;display:grid;place-items:center;background:rgba(22,18,30,.56);backdrop-filter:blur(8px)}.chakodLocationDialog{width:min(780px,100%);min-width:0;height:min(850px,calc(100dvh - 36px));overflow:hidden;border:1px solid #e8e1ef;border-radius:24px;display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto;color:#24192e;background:#fff;box-shadow:0 38px 100px rgba(27,18,36,.32);outline:none}.chakodLocationHeader{padding:18px 20px;border-bottom:1px solid #efe8f5;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.chakodLocationHeader>div>span{display:inline-flex;padding:6px 10px;border-radius:999px;color:#7c3aed;background:#f4eeff;font-size:12px;font-weight:800}.chakodLocationHeader h2{margin:10px 0 0;font-size:26px}.chakodLocationHeader p{margin:8px 0 0;color:#7e7289;font-size:14px}.chakodLocationHeader>button{width:42px;height:42px;border:1px solid #e7dfec;border-radius:14px;display:grid;place-items:center;color:#65576e;background:#fff;cursor:pointer}
        .chakodLocationSearchWrap{padding:14px 20px;border-bottom:1px solid #f0ebf3;display:grid;grid-template-columns:minmax(0,1fr) 176px;gap:10px}.chakodLocationSearch{height:50px;padding:0 14px;border:1px solid #dfd6e6;border-radius:15px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;background:#faf8fc}.chakodLocationSearch>span{color:#7c3aed}.chakodLocationSearch input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:14px}.chakodLocationSearch button{width:26px;height:26px;border:0;border-radius:9px;background:#ece6f0;cursor:pointer}.chakodLocationAll{height:50px;padding:0 12px;border:1px solid #e2d9e8;border-radius:15px;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;text-align:right;background:#fff;cursor:pointer}.chakodLocationAll.active,.chakodLocationAll:hover{border-color:#9d78ed;background:#f7f2ff}.chakodLocationAll>span{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;color:#7c3aed;background:#f2ebfb}.chakodLocationAll strong,.chakodLocationAll small{display:block}.chakodLocationAll strong{font-size:13px}.chakodLocationAll small{margin-top:2px;color:#91849a;font-size:11px}
        .chakodLocationSelected{min-width:0;overflow:hidden;padding:10px 20px 12px;border-bottom:1px solid #f1ecf4;background:#fcfaff}.chakodLocationSelectedHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.chakodLocationSelectedHead strong,.chakodLocationSelectedHead button{font-size:12px}.chakodLocationSelectedHead button{min-height:30px;padding:0 9px;border:1px solid #e3d7ee;border-radius:9px;display:inline-flex;align-items:center;gap:5px;color:#7c3aed;background:#fff;cursor:pointer;font-weight:800}.chakodLocationSelectedHead button span{font-size:14px}.chakodLocationChips{width:100%;max-width:100%;min-width:0;max-height:106px;margin-top:8px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:6px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.chakodLocationChips>button{max-width:100%;min-height:29px;padding:0 7px 0 5px;border:1px solid #ded2eb;border-radius:9px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;color:#5b21b6;background:#fff;cursor:pointer;font-size:10px;font-weight:800}.chakodLocationChips b{max-width:150px;overflow:hidden;text-overflow:ellipsis;font:inherit}.chakodLocationChips small{color:#9a8da3;font-size:8px;font-weight:400}.chakodLocationChips span{width:20px;height:20px;border-radius:6px;display:grid;place-items:center;color:#6d28d9;background:#f3edff;font-size:13px;line-height:1}.chakodLocationChips>button:hover span{color:#fff;background:#7c3aed}
        .chakodLocationBody{min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:12px 20px 16px}.chakodLocationRecent,.chakodLocationSearchResults{margin-bottom:12px;padding:12px;border:1px solid #eee7f3;border-radius:15px;background:#fbf9fd}.chakodLocationRecentHead,.chakodLocationSearchResultsHead{display:flex;justify-content:space-between;gap:10px}.chakodLocationRecentHead strong,.chakodLocationRecentHead small{display:block}.chakodLocationRecentHead small,.chakodLocationSearchResultsHead small{color:#94869d;font-size:11px}.chakodLocationRecentHead>button{border:0;color:#7c3aed;background:transparent;cursor:pointer}.chakodLocationRecentRail{margin-top:8px;display:flex;gap:8px;overflow-x:auto}.chakodLocationRecentItem{min-height:38px;border:1px solid #e3dbea;border-radius:12px;display:grid;grid-template-columns:minmax(0,1fr) 30px;overflow:hidden;background:#fff}.chakodLocationRecentUse{padding:0 10px;border:0;display:flex;align-items:center;gap:7px;background:transparent;cursor:pointer}.chakodLocationRecentRemove{border:0;border-right:1px solid #eee6f3;background:transparent;cursor:pointer}.chakodLocationResultGroup{margin-top:12px}.chakodLocationResultGroup>span{display:block;margin-bottom:6px;color:#776982;font-size:11px;font-weight:800}.chakodLocationResultGroup>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.chakodLocationResultGroup button{min-height:48px;padding:7px 10px;border:1px solid #e4dce9;border-radius:12px;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;text-align:right;background:#fff;cursor:pointer}.chakodLocationResultGroup strong{font-size:13px}.chakodLocationResultGroup small{color:#91849a;font-size:11px}.chakodLocationResultGroup b{grid-column:2;grid-row:1/3;align-self:center;color:#7c3aed}.chakodLocationEmptySearch{margin-top:10px;color:#8d8096;font-size:12px}
        .chakodLocationError{margin-bottom:10px;padding:10px 12px;border:1px solid #ffd2cc;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#b42318;background:#fff3f1;font-size:12px}.chakodLocationError button{border:0;border-radius:9px;padding:7px 10px;color:#fff;background:#b42318;cursor:pointer}.chakodLocationState,.chakodLocationCityState,.chakodLocationNeighborhoodState{min-height:70px;display:grid;place-items:center;color:#8d8096;font-size:12px}.chakodLocationEmptyState{min-height:180px;padding:24px;border:1px dashed #d8cae8;border-radius:16px;display:grid;place-items:center;align-content:center;gap:9px;text-align:center;color:#6d5c78;background:#fcfaff}.chakodLocationEmptyState strong{color:#33213f;font-size:15px}.chakodLocationEmptyState span{max-width:420px;font-size:12px;line-height:1.8}.chakodLocationEmptyState button{min-height:38px;padding:0 15px;border:0;border-radius:11px;color:#fff;background:linear-gradient(135deg,#5b21b6,#8b5cf6);cursor:pointer;font:inherit;font-size:12px;font-weight:800}
        .chakodLocationProvince{border-bottom:1px solid #eee8f1}.chakodLocationProvinceRow{min-height:58px;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px}.chakodLocationProvinceCheck,.chakodLocationCityCheck{width:32px;height:32px;border:1px solid #d9cfdf;border-radius:10px;display:grid;place-items:center;color:#fff;background:#fff;cursor:pointer}.chakodLocationProvinceCheck.checked,.chakodLocationCityCheck.checked{border-color:#7c3aed;background:#7c3aed}.chakodLocationProvinceCheck.partial,.chakodLocationCityCheck.partial{border-color:#9d78ed;color:#7c3aed;background:#f5efff}.chakodLocationProvinceName,.chakodLocationCityName{min-width:0;height:58px;border:0;display:flex;align-items:center;justify-content:space-between;text-align:right;background:transparent;cursor:pointer}.chakodLocationProvinceName strong,.chakodLocationProvinceName small,.chakodLocationCityName strong,.chakodLocationCityName small{display:block}.chakodLocationProvinceName strong{font-size:15px}.chakodLocationProvinceName small,.chakodLocationCityName small{margin-top:3px;color:#95889e;font-size:11px}.chakodLocationProvinceName b,.chakodLocationCityName b{display:grid;transition:.2s}.chakodLocationProvince.expanded>.chakodLocationProvinceRow .chakodLocationProvinceName b,.chakodLocationCity.expanded>.chakodLocationCityRow .chakodLocationCityName b{transform:rotate(180deg)}
        .chakodLocationCities{margin-bottom:10px;padding:12px;border:1px solid #e9e1ee;border-radius:16px;background:#faf8fc}.chakodLocationWholeProvince,.chakodLocationWholeCity{width:100%;min-height:46px;padding:8px 10px;border:1px solid #ded5e5;border-radius:12px;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:8px;text-align:right;background:#fff;cursor:pointer}.chakodLocationWholeProvince>span,.chakodLocationWholeCity>span,.chakodLocationNeighborhoodGrid button>span{width:24px;height:24px;border:1px solid #d8cedf;border-radius:8px;display:grid;place-items:center;color:#fff}.chakodLocationWholeProvince.active,.chakodLocationWholeCity.active{border-color:#9d78ed;color:#5b21b6;background:#f5efff}.chakodLocationWholeProvince.active>span,.chakodLocationWholeCity.active>span{border-color:#7c3aed;background:#7c3aed}.chakodLocationWholeProvince strong,.chakodLocationWholeProvince small,.chakodLocationWholeCity strong,.chakodLocationWholeCity small{display:block}.chakodLocationWholeProvince strong,.chakodLocationWholeCity strong{font-size:13px}.chakodLocationWholeProvince small,.chakodLocationWholeCity small{color:#8f8398;font-size:11px}.chakodLocationCity{margin-top:7px;border:1px solid #e4dce9;border-radius:13px;background:#fff;overflow:hidden}.chakodLocationCityRow{min-height:52px;padding:0 9px;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:8px}.chakodLocationCityName{height:52px}.chakodLocationCityName strong{font-size:13px}.chakodLocationNeighborhoods{padding:10px;border-top:1px solid #eee8f1;background:#fcfbfd}.chakodLocationNeighborhoodGrid{margin-top:9px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.chakodLocationNeighborhoodGrid button{min-height:40px;padding:6px 7px;border:1px solid #e4dce9;border-radius:10px;display:flex;align-items:center;gap:7px;text-align:right;background:#fff;cursor:pointer}.chakodLocationNeighborhoodGrid button.selected{border-color:#9d78ed;color:#5b21b6;background:#f5efff}.chakodLocationNeighborhoodGrid button.selected>span{border-color:#7c3aed;background:#7c3aed}.chakodLocationNeighborhoodGrid strong{font-size:11px}
        .chakodLocationFooter{min-height:74px;padding:10px 20px;border-top:1px solid #eae3ef;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -8px 24px rgba(38,24,48,.07)}.chakodLocationFooter strong,.chakodLocationFooter small{display:block}.chakodLocationFooter strong{font-size:13px}.chakodLocationFooter small{margin-top:4px;color:#8e8297;font-size:11px}.chakodLocationFooter>button{min-height:44px;padding:0 18px;border:0;border-radius:13px;color:#fff;background:linear-gradient(135deg,#5b21b6,#8b5cf6);cursor:pointer;font-size:13px;font-weight:800}
        @media(max-width:760px){.chakodLocationBackdrop{padding:0;place-items:stretch;background:#fff;backdrop-filter:none}.chakodLocationDialog{position:fixed;inset:0;width:100%;max-width:100vw;height:100dvh;border:0;border-radius:0;box-sizing:border-box}.chakodLocationHeader{padding:14px}.chakodLocationHeader h2{font-size:19px}.chakodLocationHeader p{font-size:11px}.chakodLocationSearchWrap{padding:10px 14px;grid-template-columns:1fr}.chakodLocationSelected,.chakodLocationBody{padding-right:14px;padding-left:14px}.chakodLocationResultGroup>div{grid-template-columns:1fr}.chakodLocationProvinceName strong{font-size:13px;line-height:1.45}.chakodLocationCityName strong,.chakodLocationWholeProvince strong,.chakodLocationWholeCity strong,.chakodLocationResultGroup strong{font-size:12px;line-height:1.45}.chakodLocationProvinceName small,.chakodLocationCityName small,.chakodLocationWholeProvince small,.chakodLocationWholeCity small,.chakodLocationResultGroup small{font-size:10px}.chakodLocationNeighborhoodGrid strong{font-size:10.5px;line-height:1.45}.chakodLocationChips{max-height:100px}.chakodLocationChips>button{font-size:10px}.chakodLocationChips b{max-width:105px}.chakodLocationNeighborhoodGrid{grid-template-columns:1fr 1fr}.chakodLocationFooter{width:100%;min-width:0;padding:10px 14px;box-sizing:border-box;overflow:hidden}.chakodLocationFooter>button{max-width:100%;padding:0 14px}}
        @media(max-width:640px){.chakodLocationTrigger{min-height:42px;padding:5px 7px;grid-template-columns:32px minmax(0,1fr) 24px;gap:6px}.chakodLocationPin{width:32px;height:32px;border-radius:10px}.chakodLocationArrowWrap{width:24px;height:28px}.chakodLocationTriggerCopy small{display:none}.chakodLocationTriggerCopy strong{margin-top:0;font-size:12px;line-height:1.5;text-overflow:ellipsis;direction:rtl}}
        @media(max-width:390px){.chakodLocationTriggerCopy small{display:none}.chakodLocationHeader p{display:none}.chakodLocationNeighborhoodGrid{grid-template-columns:1fr 1fr}.chakodLocationFooter>div{display:none}.chakodLocationFooter>button{width:100%}}
        @media(max-width:340px){.chakodLocationNeighborhoodGrid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
