"use client";

// CHAKOD_MARKET_FILTER_V1

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ListingCard from "./ListingCard";
import CatalogFilterPanel from "../cars/_catalog/CatalogFilterPanel";
import type {
  CatalogFacets,
  CatalogFilters,
  CatalogResponse,
  CatalogSegment,
} from "../cars/_catalog/catalog-types";
import styles from "../cars/_catalog/CatalogPage.module.css";
import { carMarketPath, withSearchParams } from "../../lib/car-routes";

type Props = {
  clientApiUrl: string;
  segment: CatalogSegment;
  badge: string;
  filters: CatalogFilters;
  initialResponse: CatalogResponse | null;
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

const sortLabels: Record<string, string> = {
  vip: "پیشنهاد چاکود",
  newest: "جدیدترین آگهی",
  cheap: "ارزان‌ترین",
  expensive: "گران‌ترین",
  low_mileage: "کم‌کارکردترین",
  newest_year: "جدیدترین سال ساخت",
  popular: "پربازدیدترین",
};

function normalizeResponse(payload: CatalogResponse): CatalogResponse {
  return {
    ...payload,
    total: Number(payload.total || 0),
    page: Number(payload.page || 1),
    total_pages: Number(payload.total_pages || 0),
    data: Array.isArray(payload.data) ? payload.data : [],
    facets: {
      ...emptyFacets,
      ...(payload.facets || {}),
      range: payload.facets?.range || {},
    },
  };
}

function formatCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
}

function formatNumberFilter(value: string, suffix: string) {
  const digits = normalizeDigits(value);
  if (!digits) return value;
  return `${new Intl.NumberFormat("fa-IR").format(Number(digits))} ${suffix}`;
}

function queryValues(filters: CatalogFilters) {
  return {
    q: filters.q,
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
    sort: filters.sort === "vip" ? "" : filters.sort,
  };
}

function buildHref(
  segment: CatalogSegment,
  filters: CatalogFilters,
  options: { remove?: string; page?: number; sort?: string } = {},
) {
  const params = new URLSearchParams();
  const values = queryValues(filters);

  Object.entries(values).forEach(([key, value]) => {
    if (!value || key === options.remove) return;
    if (options.remove === "province" && key === "city") return;
    if (options.remove === "brand" && key === "model") return;
    if (key === "sort" && options.sort !== undefined) return;
    params.set(key, value);
  });

  if (options.sort && options.sort !== "vip") {
    params.set("sort", options.sort);
  }

  if (options.page && options.page > 1) {
    params.set("page", String(options.page));
  }

  return withSearchParams(carMarketPath(segment), Object.fromEntries(params));
}

export default function CatalogListingsClient({
  clientApiUrl,
  segment,
  badge,
  filters,
  initialResponse,
}: Props) {
  const [response, setResponse] = useState<CatalogResponse | null>(
    initialResponse ? normalizeResponse(initialResponse) : null,
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    initialResponse ? "ready" : "loading",
  );

  useEffect(() => {
    if (initialResponse) return;

    const controller = new AbortController();

    async function load() {
      try {
        setStatus("loading");
        const apiResponse = await fetch(clientApiUrl, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!apiResponse.ok) throw new Error(`HTTP ${apiResponse.status}`);
        const payload = (await apiResponse.json()) as CatalogResponse;
        if (!payload?.success || !Array.isArray(payload.data)) {
          throw new Error("Invalid response");
        }

        setResponse(normalizeResponse(payload));
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }

    load();
    return () => controller.abort();
  }, [clientApiUrl, initialResponse]);

  const facets = response?.facets || emptyFacets;
  const resultCount = response?.total || 0;

  const activeItems = useMemo(() => {
    const brandName = facets.brands.find((item) => item.code === filters.brand)?.name;
    const modelName = facets.models.find(
      (item) => item.code === filters.model && (!filters.brand || item.brand_code === filters.brand),
    )?.name;

    return [
      filters.q ? { key: "q", label: `جست‌وجو: ${filters.q}` } : null,
      filters.province ? { key: "province", label: filters.province } : null,
      filters.city ? { key: "city", label: filters.city } : null,
      filters.category
        ? {
            key: "category",
            label:
              facets.categories.find((item) => item.code === filters.category)?.name ||
              filters.category,
          }
        : null,
      filters.brand
        ? { key: "brand", label: String(brandName || filters.brand) }
        : null,
      filters.model
        ? { key: "model", label: String(modelName || filters.model) }
        : null,
      filters.minPrice
        ? {
            key: "min_price",
            label: `قیمت از ${formatNumberFilter(filters.minPrice, "تومان")}`,
          }
        : null,
      filters.maxPrice
        ? {
            key: "max_price",
            label: `قیمت تا ${formatNumberFilter(filters.maxPrice, "تومان")}`,
          }
        : null,
      filters.minYear
        ? { key: "min_year", label: `سال از ${filters.minYear}` }
        : null,
      filters.maxYear
        ? { key: "max_year", label: `سال تا ${filters.maxYear}` }
        : null,
      filters.minMileage
        ? {
            key: "min_mileage",
            label: `کارکرد از ${formatNumberFilter(filters.minMileage, "کیلومتر")}`,
          }
        : null,
      filters.maxMileage
        ? {
            key: "max_mileage",
            label: `کارکرد تا ${formatNumberFilter(filters.maxMileage, "کیلومتر")}`,
          }
        : null,
      filters.bodyStatus
        ? { key: "body_status", label: filters.bodyStatus }
        : null,
      filters.transmission
        ? { key: "transmission", label: filters.transmission }
        : null,
      filters.fuelType ? { key: "fuel_type", label: filters.fuelType } : null,
      filters.sellerType
        ? {
            key: "seller_type",
            label:
              filters.sellerType === "personal"
                ? "فروشنده شخصی"
                : filters.sellerType === "dealer"
                  ? "نمایشگاه"
                  : "فعال منطقه آزاد",
          }
        : null,
      filters.sort !== "vip"
        ? {
            key: "sort",
            label: `مرتب‌سازی: ${sortLabels[filters.sort] || filters.sort}`,
          }
        : null,
    ].filter((item): item is { key: string; label: string } => Boolean(item));
  }, [facets.brands, facets.categories, facets.models, filters]);

  function changeSort(nextSort: string) {
    window.location.href = buildHref(segment, filters, { sort: nextSort });
  }

  const tone = segment === "all" ? "neutral" : segment;

  return (
    <div className={styles.marketGrid}>
      <CatalogFilterPanel
        segment={segment}
        filters={filters}
        facets={facets}
        resultCount={resultCount}
        loading={status === "loading"}
      />

      <section className={styles.resultsColumn} aria-live="polite">
        <div className={styles.resultsTop}>
          <div className={styles.resultsCopy}>
            <strong>
              {status === "loading"
                ? "در حال دریافت آگهی‌ها"
                : `${formatCount(resultCount)} خودرو پیدا شد`}
            </strong>
            <span>
              {filters.sort === "vip"
                ? "آگهی‌های ویژه و تازه در اولویت نمایش‌اند."
                : `مرتب‌شده بر اساس ${sortLabels[filters.sort] || "انتخاب شما"}`}
            </span>
          </div>

          <select
            className={styles.sortControl}
            value={filters.sort}
            onChange={(event) => changeSort(event.target.value)}
            aria-label="مرتب‌سازی آگهی‌ها"
          >
            <option value="vip">پیشنهاد چاکود</option>
            <option value="newest">جدیدترین آگهی</option>
            <option value="cheap">ارزان‌ترین</option>
            <option value="expensive">گران‌ترین</option>
            <option value="low_mileage">کم‌کارکردترین</option>
            <option value="newest_year">جدیدترین سال ساخت</option>
            <option value="popular">پربازدیدترین</option>
          </select>
        </div>

        {activeItems.length > 0 ? (
          <div className={styles.activeFilters} aria-label="فیلترهای فعال">
            {activeItems.map((item) => (
              <Link
                key={item.key}
                href={buildHref(segment, filters, { remove: item.key })}
              >
                {item.label}
                <span aria-hidden="true">×</span>
              </Link>
            ))}
            <Link className={styles.clearAllChip} href={carMarketPath(segment)}>
              پاک‌کردن همه
            </Link>
          </div>
        ) : null}

        {status === "loading" ? (
          <div className={styles.grid} aria-label="در حال بارگذاری">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className={styles.skeleton} key={index}>
                <div className={styles.skeletonMedia} />
                <div className={styles.skeletonBody}>
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonLine} />
                </div>
              </div>
            ))}
          </div>
        ) : status === "error" ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>!</span>
            <strong>ارتباط با بازار خودرو برقرار نشد</strong>
            <p>
              اتصال مرورگر به API چاکود برقرار نیست. صفحه را دوباره بارگذاری کن.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              تلاش دوباره
            </button>
          </div>
        ) : response && response.data.length > 0 ? (
          <div className={styles.grid}>
            {response.data.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                tone={tone}
                badge={badge}
                variant="grid"
                showActions
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⌕</span>
            <strong>آگهی مطابق این فیلترها پیدا نشد</strong>
            <p>
              محدوده قیمت، موقعیت یا مشخصات خودرو را تغییر بده تا گزینه‌های بیشتری ببینی.
            </p>
            <Link href={carMarketPath(segment)}>نمایش همه آگهی‌های این بخش</Link>
          </div>
        )}

        {status === "ready" && response && response.total_pages > 1 ? (
          <nav className={styles.pagination} aria-label="صفحه‌بندی آگهی‌ها">
            {response.page > 1 ? (
              <Link
                href={buildHref(segment, filters, { page: response.page - 1 })}
              >
                صفحه قبل
              </Link>
            ) : (
              <span />
            )}

            <strong>
              صفحه {formatCount(response.page)} از {formatCount(response.total_pages)}
            </strong>

            {response.page < response.total_pages ? (
              <Link
                href={buildHref(segment, filters, { page: response.page + 1 })}
              >
                صفحه بعد
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
