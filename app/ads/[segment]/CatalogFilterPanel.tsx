"use client";

// CHAKOD_MARKET_FILTER_V1

import { useEffect, useMemo, useState } from "react";
import type {
  CatalogFacets,
  CatalogFilters,
  CatalogSegment,
} from "./catalog-types";
import styles from "./CatalogPage.module.css";
import { carMarketPath } from "../../../lib/car-routes";

type CatalogFilterPanelProps = {
  segment: CatalogSegment;
  filters: CatalogFilters;
  facets: CatalogFacets;
  resultCount: number;
  loading: boolean;
};

const emptyFacets: CatalogFacets = {
  provinces: [],
  cities: [],
  categories: [],
  brands: [],
  models: [],
  body_statuses: [],
  transmissions: [],
  fuel_types: [],
  range: {},
};

function countText(value: number | string) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

function optionLabel(name: string, count: number | string) {
  return `${name} (${countText(count)})`;
}

export default function CatalogFilterPanel({
  segment,
  filters,
  facets = emptyFacets,
  resultCount,
  loading,
}: CatalogFilterPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [province, setProvince] = useState(filters.province);
  const [city, setCity] = useState(filters.city);
  const [brand, setBrand] = useState(filters.brand);
  const [model, setModel] = useState(filters.model);

  const cities = useMemo(
    () =>
      facets.cities.filter(
        (item) => !province || String(item.province || "") === province,
      ),
    [facets.cities, province],
  );

  const models = useMemo(
    () =>
      facets.models.filter(
        (item) => !brand || String(item.brand_code || "") === brand,
      ),
    [brand, facets.models],
  );

  const activeCount = [
    filters.q,
    filters.province,
    filters.city,
    filters.category,
    filters.brand,
    filters.model,
    filters.minPrice,
    filters.maxPrice,
    filters.minYear,
    filters.maxYear,
    filters.minMileage,
    filters.maxMileage,
    filters.bodyStatus,
    filters.transmission,
    filters.fuelType,
    filters.sellerType,
    filters.sort !== "vip" ? filters.sort : "",
  ].filter(Boolean).length;

  useEffect(() => {
    if (!drawerOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  function handleProvince(nextProvince: string) {
    setProvince(nextProvince);

    const currentCityIsValid = facets.cities.some(
      (item) =>
        String(item.name) === city &&
        (!nextProvince || String(item.province || "") === nextProvince),
    );

    if (!currentCityIsValid) setCity("");
  }

  function handleBrand(nextBrand: string) {
    setBrand(nextBrand);

    const currentModelIsValid = facets.models.some(
      (item) =>
        String(item.code) === model &&
        (!nextBrand || String(item.brand_code || "") === nextBrand),
    );

    if (!currentModelIsValid) setModel("");
  }

  function renderSearchHiddenInputs() {
    const values: Record<string, string> = {
      province: filters.province,
      city: filters.city,
      category: filters.category,
      brand: filters.brand,
      model: filters.model,
      min_price: filters.minPrice,
      max_price: filters.maxPrice,
      min_year: filters.minYear,
      max_year: filters.maxYear,
      min_mileage: filters.minMileage,
      max_mileage: filters.maxMileage,
      body_status: filters.bodyStatus,
      transmission: filters.transmission,
      fuel_type: filters.fuelType,
      seller_type: filters.sellerType,
      sort: filters.sort,
    };

    return (
      <>
        {Object.entries(values).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null,
        )}
      </>
    );
  }

  function renderFilterFields() {
    return (
      <div className={styles.filterBody}>
        <section className={styles.filterSection}>
          <div className={styles.sectionTitle}>
            <span>جست‌وجوی خودرو</span>
            <small>برند، مدل، تیپ یا نمایشگاه</small>
          </div>
          <label className={styles.fieldWide}>
            <span>عبارت جست‌وجو</span>
            <input
              className={styles.input}
              name="q"
              defaultValue={filters.q}
              placeholder="مثلاً پژو ۲۰۷ پانوراما"
              autoComplete="off"
            />
          </label>

          <label className={styles.fieldWide}>
            <span>نوع آگهی</span>
            <select
              className={styles.select}
              name="category"
              defaultValue={filters.category}
            >
              <option value="">همه آگهی‌ها</option>
              {facets.categories.map((item) => (
                <option key={String(item.code)} value={item.code}>
                  {optionLabel(String(item.name), item.count)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className={styles.filterSection}>
          <div className={styles.sectionTitle}>
            <span>برند و مدل</span>
            <small>فقط خودروهای دارای آگهی</small>
          </div>

          <label className={styles.fieldWide}>
            <span>برند</span>
            <select
              className={styles.select}
              name="brand"
              value={brand}
              onChange={(event) => handleBrand(event.target.value)}
            >
              <option value="">همه برندها</option>
              {facets.brands.map((item) => (
                <option key={`${item.code}-${item.name}`} value={item.code}>
                  {optionLabel(String(item.name), item.count)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldWide}>
            <span>مدل</span>
            <select
              className={styles.select}
              name="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={!brand || models.length === 0}
            >
              <option value="">{brand ? "همه مدل‌ها" : "ابتدا برند را انتخاب کنید"}</option>
              {models.map((item) => (
                <option
                  key={`${item.brand_code}-${item.code}-${item.name}`}
                  value={item.code}
                >
                  {optionLabel(String(item.name), item.count)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className={styles.filterSection}>
          <div className={styles.sectionTitle}>
            <span>موقعیت</span>
            <small>استان و شهر</small>
          </div>

          <label className={styles.fieldWide}>
            <span>استان</span>
            <select
              className={styles.select}
              name="province"
              value={province}
              onChange={(event) => handleProvince(event.target.value)}
            >
              <option value="">همه استان‌ها</option>
              {facets.provinces.map((item) => (
                <option key={String(item.name)} value={item.name}>
                  {optionLabel(String(item.name), item.count)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldWide}>
            <span>شهر</span>
            <select
              className={styles.select}
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">همه شهرها</option>
              {cities.map((item) => (
                <option
                  key={`${item.province}-${item.name}`}
                  value={item.name}
                >
                  {optionLabel(String(item.name), item.count)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className={styles.filterSection}>
          <div className={styles.sectionTitle}>
            <span>قیمت</span>
            <small>مبلغ به تومان</small>
          </div>
          <div className={styles.fieldPair}>
            <label className={styles.field}>
              <span>حداقل</span>
              <input
                className={styles.input}
                name="min_price"
                inputMode="numeric"
                defaultValue={filters.minPrice}
                placeholder="۵۰۰ میلیون"
              />
            </label>
            <label className={styles.field}>
              <span>حداکثر</span>
              <input
                className={styles.input}
                name="max_price"
                inputMode="numeric"
                defaultValue={filters.maxPrice}
                placeholder="۳ میلیارد"
              />
            </label>
          </div>
        </section>

        <section className={styles.filterSection}>
          <div className={styles.sectionTitle}>
            <span>سال ساخت و کارکرد</span>
            <small>بازه دلخواه</small>
          </div>
          <div className={styles.fieldPair}>
            <label className={styles.field}>
              <span>سال از</span>
              <input
                className={styles.input}
                name="min_year"
                inputMode="numeric"
                defaultValue={filters.minYear}
                placeholder={String(facets.range.min_year || "۱۳۹۵")}
              />
            </label>
            <label className={styles.field}>
              <span>سال تا</span>
              <input
                className={styles.input}
                name="max_year"
                inputMode="numeric"
                defaultValue={filters.maxYear}
                placeholder={String(facets.range.max_year || "۱۴۰۵")}
              />
            </label>
          </div>
          <div className={styles.fieldPair}>
            <label className={styles.field}>
              <span>کارکرد از</span>
              <input
                className={styles.input}
                name="min_mileage"
                inputMode="numeric"
                defaultValue={filters.minMileage}
                placeholder="۰"
              />
            </label>
            <label className={styles.field}>
              <span>کارکرد تا</span>
              <input
                className={styles.input}
                name="max_mileage"
                inputMode="numeric"
                defaultValue={filters.maxMileage}
                placeholder="۱۰۰٬۰۰۰"
              />
            </label>
          </div>
        </section>

        <section className={styles.filterSection}>
          <div className={styles.sectionTitle}>
            <span>مشخصات فنی و فروشنده</span>
            <small>انتخاب اختیاری</small>
          </div>

          <label className={styles.fieldWide}>
            <span>وضعیت بدنه</span>
            <select
              className={styles.select}
              name="body_status"
              defaultValue={filters.bodyStatus}
            >
              <option value="">همه وضعیت‌ها</option>
              {facets.body_statuses.map((item) => (
                <option key={String(item.name)} value={item.name}>
                  {optionLabel(String(item.name), item.count)}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.fieldPair}>
            <label className={styles.field}>
              <span>گیربکس</span>
              <select
                className={styles.select}
                name="transmission"
                defaultValue={filters.transmission}
              >
                <option value="">همه</option>
                {facets.transmissions.map((item) => (
                  <option key={String(item.name)} value={item.name}>
                    {String(item.name)}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>سوخت</span>
              <select
                className={styles.select}
                name="fuel_type"
                defaultValue={filters.fuelType}
              >
                <option value="">همه</option>
                {facets.fuel_types.map((item) => (
                  <option key={String(item.name)} value={item.name}>
                    {String(item.name)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.fieldWide}>
            <span>نوع فروشنده</span>
            <select
              className={styles.select}
              name="seller_type"
              defaultValue={filters.sellerType}
            >
              <option value="">همه فروشنده‌ها</option>
              <option value="personal">فروشنده شخصی</option>
              <option value="dealer">نمایشگاه</option>
              <option value="freezone_operator">فعال منطقه آزاد</option>
            </select>
          </label>

          <label className={styles.fieldWide}>
            <span>مرتب‌سازی</span>
            <select
              className={styles.select}
              name="sort"
              defaultValue={filters.sort}
            >
              <option value="vip">پیشنهاد چاکود</option>
              <option value="newest">جدیدترین آگهی</option>
              <option value="cheap">ارزان‌ترین</option>
              <option value="expensive">گران‌ترین</option>
              <option value="low_mileage">کم‌کارکردترین</option>
              <option value="newest_year">جدیدترین سال ساخت</option>
              <option value="popular">پربازدیدترین</option>
            </select>
          </label>
        </section>
      </div>
    );
  }

  function renderFilterForm(mobile = false) {
    return (
      <form
        className={styles.filterForm}
        action={carMarketPath(segment)}
        method="get"
        onSubmit={() => mobile && setDrawerOpen(false)}
      >
        {renderFilterFields()}
        <div className={styles.filterActions}>
          <button className={styles.applyButton} type="submit">
            {loading ? "در حال دریافت آگهی‌ها" : "اعمال فیلترها"}
          </button>
          <a className={styles.clearButton} href={carMarketPath(segment)}>
            پاک‌کردن
          </a>
        </div>
      </form>
    );
  }

  return (
    <>
      <aside className={styles.desktopFilters} aria-label="فیلتر آگهی‌ها">
        <div className={styles.filterHeader}>
          <div>
            <span>{loading ? "در حال دریافت نتایج" : `${countText(resultCount)} نتیجه فعلی`}</span>
            <strong>فیلتر آگهی‌ها</strong>
          </div>
          <b>{countText(activeCount)}</b>
        </div>
        {renderFilterForm()}
      </aside>

      <div className={styles.mobileToolbar}>
        <form
          className={styles.mobileSearchForm}
          action={carMarketPath(segment)}
          method="get"
        >
          {renderSearchHiddenInputs()}
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="جست‌وجوی برند یا مدل"
            aria-label="جست‌وجوی آگهی"
          />
          <button type="submit" aria-label="جست‌وجو">
            ⌕
          </button>
        </form>

        <button
          className={styles.mobileFilterButton}
          type="button"
          onClick={() => setDrawerOpen(true)}
        >
          فیلترها
          {activeCount > 0 ? <b>{countText(activeCount)}</b> : null}
        </button>
      </div>

      <div
        className={`${styles.mobileLayer} ${
          drawerOpen ? styles.mobileLayerOpen : ""
        }`}
        aria-hidden={!drawerOpen}
      >
        <button
          className={styles.backdrop}
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="بستن فیلترها"
        />

        <aside className={styles.drawer} role="dialog" aria-modal="true">
          <div className={styles.drawerHeader}>
            <div>
              <span>جست‌وجوی دقیق‌تر</span>
              <strong>فیلتر آگهی‌ها</strong>
            </div>
            <button
              className={styles.drawerClose}
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="بستن"
            >
              ×
            </button>
          </div>
          {renderFilterForm(true)}
        </aside>
      </div>
    </>
  );
}
