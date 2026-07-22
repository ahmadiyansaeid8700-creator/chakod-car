// CHAKOD_HOME_LOCATION_STABLE_ALL_IRAN_V6
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HOME_LOCATION_STORAGE_KEY,
  createHomeLocationSelection,
  loadHomeLocation,
  saveHomeLocation,
  type HomeLocationScope,
  type HomeLocationSelection,
} from "./home-location";

const API_BASE = "https://api.chakod.com";
const MAX_PROVINCES = 6;
const MAX_CITIES = 24;
const RECENT_STORAGE_KEY = "chakod_home_location_recent_v2";
const LOCATION_UI_VERSION_KEY = "chakod_home_location_ui_version";
const LOCATION_UI_VERSION = "6";
const RECENT_LIMIT = 4;

type GeoResponse = {
  success: boolean;
  data?: string[];
};

async function fetchGeo(province?: string) {
  const params = new URLSearchParams();
  if (province) params.set("province", province);

  const response = await fetch(
    `${API_BASE}/api/geo-locations.php${params.size ? `?${params}` : ""}`,
    { cache: "no-store" },
  );

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = (await response.json()) as GeoResponse;
  return json.success && Array.isArray(json.data) ? json.data : [];
}

function normalize(value: string) {
  return String(value || "")
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase();
}

function cloneScopes(scopes: HomeLocationScope[]) {
  return scopes.map((scope) => ({
    ...scope,
    cities: [...scope.cities],
  }));
}

function getSelectionCount(scopes: HomeLocationScope[]) {
  return scopes.reduce(
    (total, scope) => total + (scope.allCities ? 1 : scope.cities.length),
    0,
  );
}


function selectionSignature(selection: HomeLocationSelection) {
  return selection.scopes
    .map((scope) =>
      scope.allCities
        ? `${scope.province}:*`
        : `${scope.province}:${[...scope.cities].sort().join("|")}`,
    )
    .sort()
    .join(";");
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
      const selection = createHomeLocationSelection(
        Array.isArray(item?.scopes) ? item.scopes : [],
      );
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

function getProvinceStatus(scope?: HomeLocationScope) {
  if (!scope) return "";
  if (scope.allCities) return "کل استان";
  return `${scope.cities.length.toLocaleString("fa-IR")} شهر`;
}

export default function HomeLocationSelector() {
  const dialogRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [savedSelection, setSavedSelection] = useState<HomeLocationSelection>(
    DEFAULT_HOME_LOCATION,
  );
  const [draftScopes, setDraftScopes] = useState<HomeLocationScope[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [expandedProvince, setExpandedProvince] = useState("");
  const [citiesByProvince, setCitiesByProvince] = useState<
    Record<string, string[]>
  >({});
  const [loadingProvince, setLoadingProvince] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [recentSelections, setRecentSelections] = useState<HomeLocationSelection[]>([]);

  useEffect(() => {
    let loadedSelection = DEFAULT_HOME_LOCATION;
    let storedRecents: HomeLocationSelection[] = [];

    try {
      const currentVersion = window.localStorage.getItem(
        LOCATION_UI_VERSION_KEY,
      );

      if (currentVersion !== LOCATION_UI_VERSION) {
        /*
         * داده‌های انتخاب موقعیت نسخه‌های آزمایشی قبلی ممکن است با ساختار
         * جدید سازگار نباشند. این مهاجرت فقط یک‌بار اجرا می‌شود و شروع
         * نسخه پایدار را روی «سراسر ایران» می‌گذارد.
         */
        window.localStorage.removeItem(HOME_LOCATION_STORAGE_KEY);
        window.localStorage.removeItem("chakod_home_location_recent_v1");
        window.localStorage.removeItem(RECENT_STORAGE_KEY);
        window.localStorage.setItem(
          LOCATION_UI_VERSION_KEY,
          LOCATION_UI_VERSION,
        );
        saveHomeLocation(DEFAULT_HOME_LOCATION);
      } else {
        loadedSelection = loadHomeLocation();
        storedRecents = readRecentSelections();
      }
    } catch {
      loadedSelection = DEFAULT_HOME_LOCATION;
      storedRecents = [];
    }

    setSavedSelection(loadedSelection);

    if (loadedSelection.mode !== "all") {
      const currentSignature = selectionSignature(loadedSelection);
      const merged = [
        loadedSelection,
        ...storedRecents.filter(
          (item) => selectionSignature(item) !== currentSignature,
        ),
      ].slice(0, RECENT_LIMIT);
      setRecentSelections(merged);
      writeRecentSelections(merged);
    } else {
      setRecentSelections(storedRecents);
    }

    let ignore = false;

    void fetchGeo()
      .then((data) => {
        if (!ignore) setProvinces(data);
      })
      .catch(() => {
        if (!ignore) setError("دریافت فهرست استان‌ها انجام نشد.");
      })
      .finally(() => {
        if (!ignore) setLoadingProvinces(false);
      });

    const handleStorage = (event: StorageEvent) => {
      if (event.key === HOME_LOCATION_STORAGE_KEY) {
        setSavedSelection(loadHomeLocation());
      }
    };

    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setSavedSelection(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(HOME_LOCATION_EVENT, handleLocationChange);

    return () => {
      ignore = true;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(HOME_LOCATION_EVENT, handleLocationChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const scopes = cloneScopes(savedSelection.scopes);
    setDraftScopes(scopes);
    setExpandedProvince(scopes[0]?.province || "");
    setQuery("");
    setError("");

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
    if (!open || !expandedProvince || citiesByProvince[expandedProvince]) {
      return;
    }

    let ignore = false;
    setLoadingProvince(expandedProvince);
    setError("");

    void fetchGeo(expandedProvince)
      .then((data) => {
        if (!ignore) {
          setCitiesByProvince((current) => ({
            ...current,
            [expandedProvince]: data,
          }));
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(`دریافت شهرهای ${expandedProvince} انجام نشد.`);
        }
      })
      .finally(() => {
        if (!ignore) setLoadingProvince("");
      });

    return () => {
      ignore = true;
    };
  }, [citiesByProvince, expandedProvince, open]);

  const filteredProvinces = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return provinces;

    return provinces.filter((province) => {
      if (normalize(province).includes(normalizedQuery)) return true;

      const cities = citiesByProvince[province] || [];
      return cities.some((city) => normalize(city).includes(normalizedQuery));
    });
  }, [citiesByProvince, provinces, query]);

  const draftSelection = useMemo(
    () => createHomeLocationSelection(draftScopes),
    [draftScopes],
  );

  const totalSelections = getSelectionCount(draftScopes);

  function findScope(province: string) {
    return draftScopes.find((scope) => scope.province === province);
  }

  function toggleExpand(province: string) {
    setExpandedProvince((current) => (current === province ? "" : province));
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

      if (existing) {
        return current.map((scope) =>
          scope.province === province
            ? { province, allCities: true, cities: [] }
            : scope,
        );
      }

      return [...current, { province, allCities: true, cities: [] }];
    });
  }

  function toggleCity(province: string, city: string) {
    setError("");

    setDraftScopes((current) => {
      const existing = current.find((scope) => scope.province === province);
      const selectedCities = current.reduce(
        (total, scope) => total + (scope.allCities ? 0 : scope.cities.length),
        0,
      );
      const currentCities = existing?.allCities ? [] : existing?.cities || [];
      const alreadySelected = currentCities.includes(city);

      if (!existing && current.length >= MAX_PROVINCES) {
        setError(`حداکثر ${MAX_PROVINCES} استان را می‌توان انتخاب کرد.`);
        return current;
      }

      if (!alreadySelected && selectedCities >= MAX_CITIES) {
        setError(`حداکثر ${MAX_CITIES} شهر را می‌توان انتخاب کرد.`);
        return current;
      }

      const nextCities = alreadySelected
        ? currentCities.filter((item) => item !== city)
        : [...currentCities, city];

      if (existing) {
        if (nextCities.length === 0) {
          return current.filter((scope) => scope.province !== province);
        }

        return current.map((scope) =>
          scope.province === province
            ? { province, allCities: false, cities: nextCities }
            : scope,
        );
      }

      return [
        ...current,
        { province, allCities: false, cities: [city] },
      ];
    });
  }

  function removeProvince(province: string) {
    setDraftScopes((current) =>
      current.filter((scope) => scope.province !== province),
    );
  }

  function removeCity(province: string, city: string) {
    setDraftScopes((current) =>
      current.flatMap((scope) => {
        if (scope.province !== province) return [scope];

        const cities = scope.cities.filter((item) => item !== city);
        return cities.length
          ? [{ ...scope, cities }]
          : [];
      }),
    );
  }

  function clearSelection() {
    setDraftScopes([]);
    setExpandedProvince("");
    setQuery("");
    setError("");
  }

  function chooseAllIran() {
    clearSelection();
    setSavedSelection(DEFAULT_HOME_LOCATION);
    saveHomeLocation(DEFAULT_HOME_LOCATION);
    setOpen(false);
  }

  function clearRecentSelections() {
    setRecentSelections([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RECENT_STORAGE_KEY);
    }
  }

  function removeRecentSelection(signature: string) {
    const next = recentSelections.filter(
      (selection) => selectionSignature(selection) !== signature,
    );
    setRecentSelections(next);
    writeRecentSelections(next);
  }

  function chooseRecent(selection: HomeLocationSelection) {
    setDraftScopes(cloneScopes(selection.scopes));
    setExpandedProvince(selection.scopes[0]?.province || "");
    setQuery("");
    setError("");
  }

  function applySelection() {
    const nextSelection = draftScopes.length
      ? draftSelection
      : DEFAULT_HOME_LOCATION;

    if (nextSelection.mode !== "all") {
      const nextSignature = selectionSignature(nextSelection);
      const merged = [
        nextSelection,
        ...recentSelections.filter(
          (item) => selectionSignature(item) !== nextSignature,
        ),
      ].slice(0, RECENT_LIMIT);
      setRecentSelections(merged);
      writeRecentSelections(merged);
    }

    saveHomeLocation(nextSelection);
    setOpen(false);
  }

  return (
    <div className="homeLocationSelector" dir="rtl">
      <button
        type="button"
        className="homeLocationTrigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="homeLocationPin" aria-hidden="true">⌖</span>
        <span className="homeLocationTriggerCopy">
          <small>محدوده نمایش</small>
          <strong>{savedSelection.label}</strong>
        </span>
        <span className="homeLocationArrow" aria-hidden="true">⌄</span>
      </button>

      {open && typeof document !== "undefined" ? createPortal((
        <div
          className="homeLocationSimpleBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            className="homeLocationSimpleDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-location-title"
            tabIndex={-1}
          >
            <header className="homeLocationSimpleHeader">
              <div>
                <span>محدوده آگهی‌ها</span>
                <h2 id="home-location-title">انتخاب شهر</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
              >
                ×
              </button>
            </header>

            <div className="homeLocationSimpleSearchWrap">
              <label className="homeLocationSimpleSearch">
                <span aria-hidden="true">⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="جست‌وجوی استان یا شهر"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")}>×</button>
                ) : null}
              </label>

              <button
                type="button"
                className={`homeLocationSimpleAll ${draftScopes.length === 0 ? "active" : ""}`}
                onClick={chooseAllIran}
              >
                <span aria-hidden="true">◎</span>
                <strong>سراسر ایران</strong>
                <small>
                  {draftScopes.length === 0
                    ? "انتخاب پیش‌فرض"
                    : "انتخاب و بستن"}
                </small>
              </button>
            </div>

            {draftScopes.length ? (
              <div className="homeLocationSimpleSelected" aria-label="محدوده‌های انتخاب‌شده">
                <div className="homeLocationSimpleSelectedHead">
                  <strong>انتخاب‌های من</strong>
                  <button type="button" onClick={clearSelection}>پاک کردن همه</button>
                </div>

                <div className="homeLocationSimpleChips">
                  {draftScopes.flatMap((scope) =>
                    scope.allCities
                      ? [
                          <button
                            key={`province-${scope.province}`}
                            type="button"
                            onClick={() => removeProvince(scope.province)}
                          >
                            کل {scope.province}<span>×</span>
                          </button>,
                        ]
                      : scope.cities.map((city) => (
                          <button
                            key={`${scope.province}-${city}`}
                            type="button"
                            onClick={() => removeCity(scope.province, city)}
                          >
                            {city}<small>{scope.province}</small><span>×</span>
                          </button>
                        )),
                  )}
                </div>
              </div>
            ) : null}

            <main className="homeLocationSimpleBody">
              {!query && recentSelections.length ? (
                <section className="homeLocationRecent" aria-label="انتخاب‌های قبلی">
                  <div className="homeLocationRecentHead">
                    <div>
                      <strong>انتخاب‌های قبلی</strong>
                      <small>برای استفاده دوباره انتخاب کن</small>
                    </div>
                    <button
                      type="button"
                      onClick={clearRecentSelections}
                    >
                      پاک کردن سابقه
                    </button>
                  </div>
                  <div className="homeLocationRecentRail">
                    {recentSelections.map((selection) => {
                      const signature = selectionSignature(selection);
                      const active =
                        signature === selectionSignature(draftSelection);

                      return (
                        <div
                          key={signature}
                          className={`homeLocationRecentItem ${active ? "active" : ""}`}
                        >
                          <button
                            type="button"
                            className="homeLocationRecentUse"
                            onClick={() => chooseRecent(selection)}
                          >
                            <span aria-hidden="true">↻</span>
                            <strong>{selection.label}</strong>
                          </button>
                          <button
                            type="button"
                            className="homeLocationRecentRemove"
                            aria-label={`حذف ${selection.label} از انتخاب‌های قبلی`}
                            onClick={() => removeRecentSelection(signature)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {loadingProvinces ? (
                <div className="homeLocationSimpleState">در حال دریافت استان‌ها...</div>
              ) : null}

              {!loadingProvinces && filteredProvinces.length === 0 ? (
                <div className="homeLocationSimpleState">محدوده‌ای پیدا نشد.</div>
              ) : null}

              <div className="homeLocationSimpleList">
                {filteredProvinces.map((province) => {
                  const scope = findScope(province);
                  const expanded = expandedProvince === province;
                  const cities = citiesByProvince[province] || [];
                  const normalizedQuery = normalize(query);
                  const filteredCities = normalizedQuery
                    ? cities.filter((city) => normalize(city).includes(normalizedQuery))
                    : cities;

                  return (
                    <section
                      key={province}
                      className={`homeLocationSimpleProvince ${expanded ? "expanded" : ""}`}
                    >
                      <div className="homeLocationSimpleProvinceRow">
                        <button
                          type="button"
                          className={`homeLocationSimpleProvinceCheck ${scope?.allCities ? "checked" : scope ? "partial" : ""}`}
                          onClick={() => selectWholeProvince(province)}
                          aria-label={`انتخاب کل استان ${province}`}
                        >
                          {scope?.allCities ? "✓" : scope ? "•" : ""}
                        </button>

                        <button
                          type="button"
                          className="homeLocationSimpleProvinceName"
                          onClick={() => toggleExpand(province)}
                          aria-expanded={expanded}
                        >
                          <span>
                            <strong>{province}</strong>
                            <small>{scope ? getProvinceStatus(scope) : "انتخاب شهر"}</small>
                          </span>
                          <b aria-hidden="true">⌄</b>
                        </button>
                      </div>

                      {expanded ? (
                        <div className="homeLocationSimpleCities">
                          <button
                            type="button"
                            className={`homeLocationSimpleWholeProvince ${scope?.allCities ? "active" : ""}`}
                            onClick={() => selectWholeProvince(province)}
                          >
                            <span>{scope?.allCities ? "✓" : ""}</span>
                            <strong>همه شهرهای {province}</strong>
                          </button>

                          {loadingProvince === province ? (
                            <div className="homeLocationSimpleCityState">در حال دریافت شهرها...</div>
                          ) : null}

                          {loadingProvince !== province && filteredCities.length === 0 ? (
                            <div className="homeLocationSimpleCityState">شهری پیدا نشد.</div>
                          ) : null}

                          <div className="homeLocationSimpleCityGrid">
                            {filteredCities.map((city) => {
                              const checked = Boolean(
                                scope &&
                                  !scope.allCities &&
                                  scope.cities.includes(city),
                              );

                              return (
                                <button
                                  key={city}
                                  type="button"
                                  className={checked ? "selected" : ""}
                                  onClick={() => toggleCity(province, city)}
                                >
                                  <span>{checked ? "✓" : ""}</span>
                                  <strong>{city}</strong>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>

              {error ? <div className="homeLocationSimpleError">{error}</div> : null}
            </main>

            <footer className="homeLocationSimpleFooter">
              <div>
                <strong>{draftScopes.length ? draftSelection.label : "سراسر ایران"}</strong>
                <small>
                  {draftScopes.length
                    ? `${totalSelections.toLocaleString("fa-IR")} محدوده انتخاب شده`
                    : "نمایش همه آگهی‌ها"}
                </small>
              </div>

              <button type="button" onClick={applySelection}>
                {draftScopes.length
                  ? `اعمال ${totalSelections.toLocaleString("fa-IR")} محدوده`
                  : "اعمال سراسر ایران"}
              </button>
            </footer>
          </section>
        </div>
        ), document.body) : null}

      <style>{`
        .homeLocationSelector{position:relative;font-family:Tahoma,Arial,sans-serif}.homeLocationTrigger{min-height:42px;max-width:270px;padding:6px 9px;border:1px solid #e6dcf6;border-radius:14px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;color:#211633;background:rgba(255,255,255,.96);cursor:pointer;box-shadow:0 10px 28px rgba(76,29,149,.08)}.homeLocationPin{width:31px;height:31px;border-radius:11px;display:grid;place-items:center;color:#6d28d9;background:#f3edff;font-size:17px}.homeLocationTriggerCopy{min-width:0;text-align:right}.homeLocationTrigger small,.homeLocationTrigger strong{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.homeLocationTrigger small{color:#8a7f96;font-size:8px}.homeLocationTrigger strong{margin-top:2px;font-size:10px}.homeLocationArrow{color:#6d28d9;font-size:14px}
        .homeLocationSimpleBackdrop{position:fixed;inset:0;z-index:2147483647;isolation:isolate;padding:12px;display:grid;place-items:center;background:rgba(25,18,34,.52);backdrop-filter:blur(7px)}.homeLocationSimpleDialog{width:min(680px,100%);height:min(720px,calc(100dvh - 24px));overflow:hidden;border:1px solid #e8e1ef;border-radius:22px;display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto;color:#24192e;background:#fff;box-shadow:0 32px 90px rgba(27,18,36,.3);outline:none;contain:layout paint}
        .homeLocationSimpleHeader{min-height:64px;padding:11px 15px;border-bottom:1px solid #eee8f2;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff}.homeLocationSimpleHeader>div>span{color:#7c3aed;font-size:8px;font-weight:900}.homeLocationSimpleHeader h2{margin:3px 0 0;font-size:18px}.homeLocationSimpleHeader>button{width:36px;height:36px;border:1px solid #e7dfec;border-radius:11px;color:#65576e;background:#fff;cursor:pointer;font-size:20px}
        .homeLocationSimpleSearchWrap{padding:9px 15px;border-bottom:1px solid #f0ebf3;display:grid;grid-template-columns:minmax(0,1fr) 134px;gap:8px;background:#fff}.homeLocationSimpleSearch{height:42px;padding:0 11px;border:1px solid #dfd6e6;border-radius:12px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:7px;background:#faf8fc}.homeLocationSimpleSearch>span{color:#7c3aed;font-size:16px}.homeLocationSimpleSearch input{width:100%;border:0;outline:0;color:#251a2e;background:transparent;font:inherit;font-size:10px}.homeLocationSimpleSearch button{width:24px;height:24px;border:0;border-radius:8px;color:#6c5e75;background:#ece6f0;cursor:pointer}.homeLocationSimpleAll{height:42px;padding:0 9px;border:1px solid #e2d9e8;border-radius:12px;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;text-align:right;color:#55475f;background:#fff;cursor:pointer}.homeLocationSimpleAll>span{grid-row:1/3;align-self:center;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:#7c3aed;background:#f2ebfb;font-size:13px}.homeLocationSimpleAll strong{align-self:end;font-size:9px}.homeLocationSimpleAll small{align-self:start;color:#91849a;font-size:7px}.homeLocationSimpleAll.active{border-color:#9d78ed;background:#f7f2ff}
        .homeLocationSimpleSelected{padding:7px 15px 6px;border-bottom:1px solid #f1ecf4;background:#fcfaff}.homeLocationSimpleSelectedHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.homeLocationSimpleSelectedHead strong{font-size:8px}.homeLocationSimpleSelectedHead button{border:0;color:#7c3aed;background:transparent;cursor:pointer;font-size:8px;font-weight:900}.homeLocationSimpleChips{margin-top:6px;display:flex;gap:5px;overflow-x:auto;padding-bottom:1px;scrollbar-width:none}.homeLocationSimpleChips::-webkit-scrollbar{display:none}.homeLocationSimpleChips>button{min-height:28px;padding:0 8px;border:1px solid #ded2eb;border-radius:9px;display:flex;align-items:center;gap:5px;white-space:nowrap;color:#5b21b6;background:#fff;cursor:pointer;font-size:8px;font-weight:900}.homeLocationSimpleChips small{color:#9a8da3;font-size:6px;font-weight:400}.homeLocationSimpleChips span{color:#9a8da3;font-size:11px}
        .homeLocationSimpleBody{min-height:0;overflow:auto;padding:7px 15px 14px;overscroll-behavior:contain;scrollbar-gutter:stable;background:#fff;touch-action:pan-y}.homeLocationRecent{margin:2px 0 8px;padding:8px;border:1px solid #eee7f3;border-radius:12px;background:#fbf9fd}.homeLocationRecentHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.homeLocationRecentHead>div{min-width:0}.homeLocationRecentHead strong,.homeLocationRecentHead small{display:block}.homeLocationRecentHead strong{font-size:8px}.homeLocationRecentHead small{margin-top:2px;color:#94869d;font-size:7px}.homeLocationRecentHead>button{border:0;color:#7c3aed;background:transparent;cursor:pointer;font-size:8px;font-weight:900}.homeLocationRecentRail{margin-top:6px;display:flex;gap:6px;overflow-x:auto;padding-bottom:1px;scrollbar-width:none}.homeLocationRecentRail::-webkit-scrollbar{display:none}.homeLocationRecentItem{min-height:34px;max-width:220px;border:1px solid #e3dbea;border-radius:10px;display:grid;grid-template-columns:minmax(0,1fr) 27px;overflow:hidden;color:#5a4b63;background:#fff}.homeLocationRecentItem.active{border-color:#9d78ed;color:#5b21b6;background:#f7f2ff}.homeLocationRecentUse{min-width:0;padding:0 8px;border:0;display:flex;align-items:center;gap:6px;white-space:nowrap;color:inherit;background:transparent;cursor:pointer}.homeLocationRecentUse span{width:20px;height:20px;flex:0 0 auto;border-radius:7px;display:grid;place-items:center;color:#6d28d9;background:#f3edff;font-size:11px}.homeLocationRecentUse strong{overflow:hidden;text-overflow:ellipsis;font-size:8px}.homeLocationRecentRemove{border:0;border-right:1px solid #eee6f3;color:#9a8da3;background:transparent;cursor:pointer;font-size:14px}
        .homeLocationSimpleList{display:grid}.homeLocationSimpleProvince{border-bottom:1px solid #eee8f1}.homeLocationSimpleProvinceRow{min-height:47px;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:7px}.homeLocationSimpleProvinceCheck{width:27px;height:27px;border:1px solid #d9cfdf;border-radius:8px;display:grid;place-items:center;color:#fff;background:#fff;cursor:pointer;font-size:10px;font-weight:900}.homeLocationSimpleProvinceCheck.checked{border-color:#7c3aed;background:#7c3aed}.homeLocationSimpleProvinceCheck.partial{border-color:#9d78ed;color:#7c3aed;background:#f5efff}.homeLocationSimpleProvinceName{min-width:0;height:47px;border:0;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:right;color:#33273b;background:transparent;cursor:pointer}.homeLocationSimpleProvinceName>span{min-width:0}.homeLocationSimpleProvinceName strong,.homeLocationSimpleProvinceName small{display:block}.homeLocationSimpleProvinceName strong{font-size:10px}.homeLocationSimpleProvinceName small{margin-top:2px;color:#95889e;font-size:7px}.homeLocationSimpleProvinceName>b{transition:transform .18s ease;color:#8b7c95;font-size:14px}.homeLocationSimpleProvince.expanded .homeLocationSimpleProvinceName>b{transform:rotate(180deg)}
        .homeLocationSimpleCities{margin:0 34px 8px 0;padding:8px;border:1px solid #e9e1ee;border-radius:12px;background:#faf8fc}.homeLocationSimpleWholeProvince{width:100%;min-height:38px;padding:6px 8px;border:1px solid #ded5e5;border-radius:10px;display:flex;align-items:center;gap:7px;text-align:right;color:#51445a;background:#fff;cursor:pointer}.homeLocationSimpleWholeProvince>span,.homeLocationSimpleCityGrid>button>span{width:22px;height:22px;flex:0 0 auto;border:1px solid #d8cedf;border-radius:7px;display:grid;place-items:center;color:#fff;background:#fff;font-size:8px;font-weight:900}.homeLocationSimpleWholeProvince strong{font-size:8px}.homeLocationSimpleWholeProvince.active{color:#5b21b6;border-color:#9d78ed;background:#f5efff}.homeLocationSimpleWholeProvince.active>span{border-color:#7c3aed;background:#7c3aed}.homeLocationSimpleCityGrid{margin-top:7px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.homeLocationSimpleCityGrid>button{min-height:36px;padding:5px 6px;border:1px solid #e4dce9;border-radius:9px;display:flex;align-items:center;gap:6px;text-align:right;color:#584b61;background:#fff;cursor:pointer}.homeLocationSimpleCityGrid>button strong{font-size:8px}.homeLocationSimpleCityGrid>button.selected{color:#5b21b6;border-color:#9d78ed;background:#f5efff}.homeLocationSimpleCityGrid>button.selected>span{border-color:#7c3aed;background:#7c3aed}.homeLocationSimpleState,.homeLocationSimpleCityState{min-height:72px;display:grid;place-items:center;color:#8d8096;font-size:9px}.homeLocationSimpleCityState{min-height:46px}.homeLocationSimpleError{margin-top:8px;padding:8px 10px;border:1px solid #ffd2cc;border-radius:9px;color:#b42318;background:#fff3f1;font-size:8px}
        .homeLocationSimpleFooter{position:relative;z-index:4;min-height:64px;padding:8px 15px calc(8px + env(safe-area-inset-bottom));border-top:1px solid #eae3ef;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;box-shadow:0 -8px 24px rgba(38,24,48,.07)}.homeLocationSimpleFooter>div{min-width:0}.homeLocationSimpleFooter strong,.homeLocationSimpleFooter small{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.homeLocationSimpleFooter strong{font-size:8px}.homeLocationSimpleFooter small{margin-top:3px;color:#8e8297;font-size:7px}.homeLocationSimpleFooter>button{min-height:40px;padding:0 17px;border:0;border-radius:11px;color:#fff;background:linear-gradient(135deg,#5b21b6,#8b5cf6);box-shadow:0 8px 20px rgba(109,40,217,.22);cursor:pointer;font-size:9px;font-weight:900}
        @media(max-width:760px){.homeLocationTrigger{width:min(165px,100%);max-width:165px;min-height:38px;padding:4px 6px;border-radius:12px}.homeLocationPin{width:29px;height:29px;border-radius:9px}.homeLocationTrigger small{display:none}.homeLocationTrigger strong{margin:0;font-size:9px}.homeLocationSimpleBackdrop{padding:0;place-items:stretch;background:#fff;backdrop-filter:none}.homeLocationSimpleDialog{position:fixed;inset:0;width:100%;max-width:none;height:100dvh;min-height:100dvh;border:0;border-radius:0;grid-template-rows:auto auto auto minmax(0,1fr) auto;box-shadow:none;contain:none}.homeLocationSimpleHeader{min-height:52px;padding:7px 10px}.homeLocationSimpleHeader>div>span{font-size:7px}.homeLocationSimpleHeader h2{font-size:15px}.homeLocationSimpleHeader>button{width:34px;height:34px}.homeLocationSimpleSearchWrap{padding:7px 10px;grid-template-columns:1fr;gap:6px}.homeLocationSimpleSearch,.homeLocationSimpleAll{height:38px}.homeLocationSimpleAll{grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:1fr}.homeLocationSimpleAll>span{grid-row:auto}.homeLocationSimpleAll strong,.homeLocationSimpleAll small{align-self:center}.homeLocationSimpleAll small{justify-self:end}.homeLocationSimpleSearch input{font-size:9px}.homeLocationSimpleSelected{padding:5px 10px}.homeLocationSimpleChips{margin-top:5px}.homeLocationSimpleBody{padding:5px 10px 10px;scroll-padding-bottom:16px}.homeLocationRecent{margin-bottom:6px;padding:7px}.homeLocationRecentHead small{display:none}.homeLocationRecentItem{max-width:190px}.homeLocationSimpleProvinceRow,.homeLocationSimpleProvinceName{min-height:43px;height:43px}.homeLocationSimpleProvinceName strong{font-size:10px}.homeLocationSimpleCities{margin:0 0 7px;padding:7px}.homeLocationSimpleCityGrid{grid-template-columns:1fr 1fr}.homeLocationSimpleCityGrid>button{min-height:36px}.homeLocationSimpleFooter{min-height:58px;padding:7px 10px max(7px,env(safe-area-inset-bottom));box-shadow:0 -10px 24px rgba(38,24,48,.1)}.homeLocationSimpleFooter>button{min-height:41px;padding:0 13px}}
        @media(max-width:390px){.homeLocationSimpleAll small{font-size:7px}.homeLocationSimpleFooter>div{display:none}.homeLocationSimpleFooter>button{width:100%}.homeLocationSimpleCityGrid{grid-template-columns:1fr 1fr}.homeLocationRecentItem{max-width:165px}}
        @media(max-width:340px){.homeLocationSimpleCityGrid{grid-template-columns:1fr}.homeLocationSimpleAll small{display:none}}
        @media(max-height:650px) and (max-width:760px){.homeLocationSimpleHeader{min-height:46px;padding-block:5px}.homeLocationSimpleHeader>div>span{display:none}.homeLocationSimpleHeader h2{margin:0}.homeLocationSimpleSearchWrap{padding-block:5px}.homeLocationSimpleSelected{padding-block:4px}.homeLocationSimpleFooter{min-height:52px;padding-block:5px}.homeLocationSimpleFooter>button{min-height:39px}.homeLocationSimpleProvinceRow,.homeLocationSimpleProvinceName{min-height:40px;height:40px}}
      `}</style>
    </div>
  );
}
