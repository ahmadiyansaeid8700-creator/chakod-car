"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  HOME_LOCATION_STORAGE_KEY,
  loadHomeLocation,
  saveHomeLocation,
} from "./home-location";
import type { HomeLocationSelection } from "./home-location";

const API_BASE = "https://api.chakod.com";

type GeoResponse = {
  success: boolean;
  type?: string;
  data?: string[];
};

async function fetchGeo(params?: { province?: string }) {
  const search = new URLSearchParams();

  if (params?.province) {
    search.set("province", params.province);
  }

  const url = search.toString()
    ? `${API_BASE}/api/geo-locations.php?${search.toString()}`
    : `${API_BASE}/api/geo-locations.php`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  const json: GeoResponse = await response.json();

  return {
    success: Boolean(json.success),
    data: Array.isArray(json.data) ? json.data : [],
  };
}

export default function HomeLocationSelector() {
  const [open, setOpen] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [savedSelection, setSavedSelection] =
    useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [draftMode, setDraftMode] =
    useState<HomeLocationSelection["mode"]>("all");
  const [draftProvince, setDraftProvince] = useState("");
  const [draftCities, setDraftCities] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setSavedSelection(loadHomeLocation());

    let ignore = false;

    async function loadProvinces() {
      try {
        const result = await fetchGeo();

        if (!ignore) {
          setProvinces(result.data);
        }
      } catch {
        if (!ignore) {
          setError("دریافت فهرست استان‌ها انجام نشد.");
        }
      } finally {
        if (!ignore) {
          setLoadingProvinces(false);
        }
      }
    }

    loadProvinces();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === HOME_LOCATION_STORAGE_KEY) {
        setSavedSelection(loadHomeLocation());
      }
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<HomeLocationSelection>;
      setSavedSelection(customEvent.detail || loadHomeLocation());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(HOME_LOCATION_EVENT, handleCustomEvent);

    return () => {
      ignore = true;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(HOME_LOCATION_EVENT, handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftMode(savedSelection.mode);
    setDraftProvince(savedSelection.province);
    setDraftCities(savedSelection.cities);
    setError("");
  }, [open, savedSelection]);

  useEffect(() => {
    if (!draftProvince || draftMode !== "cities") {
      setCities([]);
      return;
    }

    let ignore = false;

    async function loadCities() {
      setLoadingCities(true);
      setError("");

      try {
        const result = await fetchGeo({
          province: draftProvince,
        });

        if (!ignore) {
          setCities(result.data);
          setDraftCities((current) =>
            current.filter((city) => result.data.includes(city)),
          );
        }
      } catch {
        if (!ignore) {
          setError("دریافت فهرست شهرها انجام نشد.");
        }
      } finally {
        if (!ignore) {
          setLoadingCities(false);
        }
      }
    }

    loadCities();

    return () => {
      ignore = true;
    };
  }, [draftMode, draftProvince]);

  const selectedCityCount = draftCities.length;

  const actionDisabled = useMemo(() => {
    if (draftMode === "all") {
      return false;
    }

    if (draftMode === "province") {
      return !draftProvince;
    }

    return !draftProvince || draftCities.length === 0;
  }, [draftCities.length, draftMode, draftProvince]);

  function toggleCity(city: string) {
    setDraftCities((current) => {
      if (current.includes(city)) {
        return current.filter((item) => item !== city);
      }

      if (current.length >= 12) {
        setError("حداکثر ۱۲ شهر را می‌توان هم‌زمان انتخاب کرد.");
        return current;
      }

      setError("");
      return [...current, city];
    });
  }

  function applySelection() {
    if (draftMode === "all") {
      saveHomeLocation(DEFAULT_HOME_LOCATION);
      setOpen(false);
      return;
    }

    if (draftMode === "province") {
      saveHomeLocation({
        mode: "province",
        province: draftProvince,
        cities: [],
        label: `کل استان ${draftProvince}`,
      });
      setOpen(false);
      return;
    }

    saveHomeLocation({
      mode: "cities",
      province: draftProvince,
      cities: draftCities,
      label:
        draftCities.length === 1
          ? draftCities[0]
          : `${draftCities.slice(0, 2).join("، ")}${
              draftCities.length > 2 ? ` +${draftCities.length - 2}` : ""
            }`,
    });

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
        <span className="homeLocationPin" aria-hidden="true">
          ⌖
        </span>

        <span>
          <small>محدوده نمایش</small>
          <strong>{savedSelection.label}</strong>
        </span>

        <span className="homeLocationArrow" aria-hidden="true">
          ⌄
        </span>
      </button>

      {open ? (
        <div
          className="homeLocationBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setOpen(false);
            }
          }}
        >
          <section
            className="homeLocationDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-location-title"
          >
            <div className="homeLocationDialogHead">
              <div>
                <span>نمایش محتوای محلی</span>
                <h2 id="home-location-title">محدوده موردنظر را انتخاب کن</h2>
                <p>
                  استوری‌ها، بنرها و آگهی‌های صفحه اصلی بر اساس همین انتخاب
                  نمایش داده می‌شوند.
                </p>
              </div>

              <button
                type="button"
                className="homeLocationClose"
                onClick={() => setOpen(false)}
                aria-label="بستن"
              >
                ×
              </button>
            </div>

            <div className="homeLocationModes">
              <button
                type="button"
                className={draftMode === "all" ? "active" : ""}
                onClick={() => {
                  setDraftMode("all");
                  setDraftProvince("");
                  setDraftCities([]);
                }}
              >
                <strong>سراسر ایران</strong>
                <small>نمایش محتوای سراسری</small>
              </button>

              <button
                type="button"
                className={draftMode === "province" ? "active" : ""}
                onClick={() => {
                  setDraftMode("province");
                  setDraftCities([]);
                }}
              >
                <strong>کل استان</strong>
                <small>همه شهرهای یک استان</small>
              </button>

              <button
                type="button"
                className={draftMode === "cities" ? "active" : ""}
                onClick={() => setDraftMode("cities")}
              >
                <strong>چند شهر</strong>
                <small>انتخاب تا ۱۲ شهر</small>
              </button>
            </div>

            {draftMode !== "all" ? (
              <label className="homeLocationField">
                <span>استان</span>
                <select
                  value={draftProvince}
                  disabled={loadingProvinces}
                  onChange={(event) => {
                    setDraftProvince(event.target.value);
                    setDraftCities([]);
                  }}
                >
                  <option value="">
                    {loadingProvinces
                      ? "در حال دریافت استان‌ها..."
                      : "انتخاب استان"}
                  </option>

                  {provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {draftMode === "cities" && draftProvince ? (
              <div className="homeLocationCities">
                <div className="homeLocationCitiesHead">
                  <span>شهرها</span>
                  <small>
                    {loadingCities
                      ? "در حال دریافت..."
                      : `${selectedCityCount} شهر انتخاب شده`}
                  </small>
                </div>

                <div className="homeLocationCityGrid">
                  {cities.map((city) => {
                    const checked = draftCities.includes(city);

                    return (
                      <button
                        key={city}
                        type="button"
                        className={checked ? "selected" : ""}
                        onClick={() => toggleCity(city)}
                      >
                        <span>{checked ? "✓" : "+"}</span>
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {error ? <div className="homeLocationError">{error}</div> : null}

            <div className="homeLocationActions">
              <button
                type="button"
                className="homeLocationSecondary"
                onClick={() => setOpen(false)}
              >
                انصراف
              </button>

              <button
                type="button"
                className="homeLocationPrimary"
                disabled={actionDisabled}
                onClick={applySelection}
              >
                اعمال محدوده
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <style>{`
        .homeLocationSelector {
          position: relative;
          font-family: Tahoma, Arial, sans-serif;
        }

        .homeLocationTrigger {
          min-height: 42px;
          max-width: 250px;
          padding: 6px 9px;
          border: 1px solid #e6dcf6;
          border-radius: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          color: #211633;
          background: rgba(255, 255, 255, 0.95);
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(76, 29, 149, 0.08);
        }

        .homeLocationPin {
          width: 31px;
          height: 31px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f3edff;
          font-size: 17px;
        }

        .homeLocationTrigger > span:nth-child(2) {
          min-width: 0;
          text-align: right;
        }

        .homeLocationTrigger small,
        .homeLocationTrigger strong {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .homeLocationTrigger small {
          color: #8a7f96;
          font-size: 8px;
        }

        .homeLocationTrigger strong {
          margin-top: 2px;
          font-size: 10px;
        }

        .homeLocationArrow {
          color: #6d28d9;
          font-size: 14px;
        }

        .homeLocationBackdrop {
          position: fixed;
          inset: 0;
          z-index: 500;
          padding: 18px;
          display: grid;
          place-items: center;
          background: rgba(20, 11, 31, 0.48);
          backdrop-filter: blur(8px);
        }

        .homeLocationDialog {
          width: min(700px, 100%);
          max-height: min(780px, calc(100vh - 36px));
          overflow: auto;
          border: 1px solid #e8dff6;
          border-radius: 25px;
          padding: 22px;
          color: #211633;
          background: #ffffff;
          box-shadow: 0 30px 90px rgba(23, 17, 31, 0.25);
        }

        .homeLocationDialogHead {
          display: flex;
          justify-content: space-between;
          gap: 18px;
        }

        .homeLocationDialogHead > div > span {
          color: #6d28d9;
          font-size: 9px;
          font-weight: 900;
        }

        .homeLocationDialogHead h2 {
          margin: 5px 0 0;
          font-size: 22px;
        }

        .homeLocationDialogHead p {
          margin: 7px 0 0;
          color: #7b7087;
          font-size: 10px;
          line-height: 1.9;
        }

        .homeLocationClose {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          border: 0;
          border-radius: 11px;
          color: #5b4c68;
          background: #f5f1fb;
          font-size: 21px;
          cursor: pointer;
        }

        .homeLocationModes {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .homeLocationModes button {
          min-height: 75px;
          padding: 11px;
          border: 1px solid #ebe3f7;
          border-radius: 16px;
          text-align: right;
          color: #46384f;
          background: #fbf9ff;
          cursor: pointer;
        }

        .homeLocationModes button.active {
          color: #4c1d95;
          border-color: #a78bfa;
          background: #f3edff;
          box-shadow: inset 0 0 0 1px rgba(109, 40, 217, 0.08);
        }

        .homeLocationModes strong,
        .homeLocationModes small {
          display: block;
        }

        .homeLocationModes strong {
          font-size: 11px;
        }

        .homeLocationModes small {
          margin-top: 5px;
          color: #8b8096;
          font-size: 8px;
        }

        .homeLocationField {
          margin-top: 15px;
          display: grid;
          gap: 7px;
        }

        .homeLocationField > span,
        .homeLocationCitiesHead > span {
          color: #4a3d54;
          font-size: 10px;
          font-weight: 900;
        }

        .homeLocationField select {
          min-height: 44px;
          width: 100%;
          border: 1px solid #dfd5ed;
          border-radius: 13px;
          padding: 0 12px;
          outline: 0;
          color: #211633;
          background: #ffffff;
          font-size: 10px;
        }

        .homeLocationCities {
          margin-top: 15px;
        }

        .homeLocationCitiesHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .homeLocationCitiesHead small {
          color: #7f738c;
          font-size: 8px;
        }

        .homeLocationCityGrid {
          max-height: 280px;
          margin-top: 8px;
          overflow: auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .homeLocationCityGrid button {
          min-height: 39px;
          padding: 7px 9px;
          border: 1px solid #e9e1f4;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #5d5168;
          background: #ffffff;
          font-size: 9px;
          cursor: pointer;
        }

        .homeLocationCityGrid button > span {
          width: 19px;
          height: 19px;
          flex: 0 0 auto;
          border-radius: 7px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f3edff;
          font-size: 10px;
          font-weight: 900;
        }

        .homeLocationCityGrid button.selected {
          color: #4c1d95;
          border-color: #a78bfa;
          background: #f6f1ff;
        }

        .homeLocationError {
          margin-top: 11px;
          padding: 9px 10px;
          border-radius: 11px;
          color: #b42318;
          background: #fff1f0;
          border: 1px solid #ffd3cf;
          font-size: 9px;
        }

        .homeLocationActions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .homeLocationActions button {
          min-height: 41px;
          padding: 0 16px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .homeLocationSecondary {
          color: #5c5068;
          border: 1px solid #e4dbea;
          background: #ffffff;
        }

        .homeLocationPrimary {
          border: 0;
          color: #ffffff;
          background: linear-gradient(135deg, #4c1d95, #7c3aed);
        }

        .homeLocationPrimary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .homeLocationTrigger {
            max-width: 190px;
            min-height: 38px;
            padding: 4px 6px;
            border-radius: 12px;
          }

          .homeLocationPin {
            width: 29px;
            height: 29px;
            border-radius: 9px;
          }

          .homeLocationTrigger small {
            display: none;
          }

          .homeLocationTrigger strong {
            margin: 0;
            font-size: 9px;
          }

          .homeLocationBackdrop {
            align-items: end;
            padding: 0;
          }

          .homeLocationDialog {
            width: 100%;
            max-height: 88vh;
            border-radius: 24px 24px 0 0;
            padding: 18px 14px 20px;
          }

          .homeLocationDialogHead h2 {
            font-size: 18px;
          }

          .homeLocationModes {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .homeLocationModes button {
            min-height: 58px;
          }

          .homeLocationCityGrid {
            grid-template-columns: 1fr 1fr;
          }

          .homeLocationActions {
            position: sticky;
            bottom: -20px;
            margin: 17px -14px -20px;
            padding: 12px 14px 20px;
            background: rgba(255, 255, 255, 0.96);
            border-top: 1px solid #eee6f6;
          }

          .homeLocationActions button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}