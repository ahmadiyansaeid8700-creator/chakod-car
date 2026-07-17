type CatalogFilterPanelProps = {
  segment: string;
  resultCount: number;
  query: string;
  city: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  cities: string[];
  brands: string[];
};

const sortLabels: Record<string, string> = {
  newest: "جدیدترین",
  cheap: "ارزان‌ترین",
  expensive: "گران‌ترین",
  popular: "پربازدیدترین",
};

function formatCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatPriceLabel(value: string) {
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");

  if (!normalized) return value;
  return `${new Intl.NumberFormat("fa-IR").format(Number(normalized))} تومان`;
}

export default function CatalogFilterPanel({
  segment,
  resultCount,
  query,
  city,
  brand,
  minPrice,
  maxPrice,
  sort,
  cities,
  brands,
}: CatalogFilterPanelProps) {
  const toggleId = `catalog-filter-toggle-${segment}`;
  const titleId = `catalog-filter-title-${segment}`;

  const values = {
    q: query,
    city,
    brand,
    min_price: minPrice,
    max_price: maxPrice,
    sort: sort === "newest" ? "" : sort,
  };

  const activeItems = [
    query ? { key: "q", label: `جست‌وجو: ${query}` } : null,
    city ? { key: "city", label: city } : null,
    brand ? { key: "brand", label: brand } : null,
    minPrice ? { key: "min_price", label: `از ${formatPriceLabel(minPrice)}` } : null,
    maxPrice ? { key: "max_price", label: `تا ${formatPriceLabel(maxPrice)}` } : null,
    sort !== "newest"
      ? { key: "sort", label: sortLabels[sort] || "مرتب‌سازی" }
      : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  function buildHref(removedKey?: string) {
    const params = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
      if (key !== removedKey && value) params.set(key, value);
    });

    const search = params.toString();
    return `/ads/${segment}${search ? `?${search}` : ""}`;
  }

  return (
    <>
      <section className="catalogDiscoveryBar" aria-label="کنترل فهرست آگهی‌ها">
        <div className="catalogDiscoveryCopy">
          <strong>{formatCount(resultCount)} خودرو برای چاکودگردی</strong>
          <span>فهرست را آزادانه ببین یا با فیلتر دقیق‌ترش کن.</span>
        </div>

        <div className="catalogDiscoveryActions">
          <span className="catalogSortPill">
            مرتب‌سازی: {sortLabels[sort] || sortLabels.newest}
          </span>

          <label
            className="catalogFilterOpen"
            htmlFor={toggleId}
            role="button"
            tabIndex={0}
            aria-controls={`${toggleId}-layer`}
          >
            <span aria-hidden="true">⌘</span>
            فیلتر و مرتب‌سازی
            {activeItems.length > 0 ? <b>{formatCount(activeItems.length)}</b> : null}
          </label>
        </div>
      </section>

      {activeItems.length > 0 ? (
        <div className="catalogActiveFilters" aria-label="فیلترهای فعال">
          {activeItems.map((item) => (
            <a href={buildHref(item.key)} key={item.key}>
              {item.label}
              <span aria-hidden="true">×</span>
            </a>
          ))}

          <a className="catalogClearAllChip" href={`/ads/${segment}`}>
            پاک‌کردن همه
          </a>
        </div>
      ) : null}

      <input
        id={toggleId}
        className="catalogFilterToggle"
        type="checkbox"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div id={`${toggleId}-layer`} className="catalogFilterLayer">
        <label
          className="catalogFilterBackdrop"
          htmlFor={toggleId}
          aria-label="بستن فیلترها"
        />

        <aside
          className="catalogFilterDrawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="catalogFilterDrawerHeader">
            <div>
              <span>جست‌وجوی دقیق‌تر</span>
              <strong id={titleId}>فیلتر آگهی‌ها</strong>
            </div>

            <label
              className="catalogFilterClose"
              htmlFor={toggleId}
              role="button"
              tabIndex={0}
              aria-label="بستن"
            >
              ×
            </label>
          </div>

          <form method="get" action={`/ads/${segment}`} className="catalogFilterForm">
            <div className="catalogFilterFields">
              <label>
                <span>جست‌وجو</span>
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="برند، مدل یا نمایشگاه"
                  autoComplete="off"
                />
              </label>

              <label>
                <span>شهر</span>
                <select name="city" defaultValue={city}>
                  <option value="">همه شهرها</option>
                  {cities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>برند</span>
                <select name="brand" defaultValue={brand}>
                  <option value="">همه برندها</option>
                  {brands.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="catalogPriceRow">
                <label>
                  <span>حداقل قیمت</span>
                  <input
                    name="min_price"
                    inputMode="numeric"
                    defaultValue={minPrice}
                    placeholder="مثلاً ۵۰۰ میلیون"
                  />
                </label>

                <label>
                  <span>حداکثر قیمت</span>
                  <input
                    name="max_price"
                    inputMode="numeric"
                    defaultValue={maxPrice}
                    placeholder="مثلاً ۳ میلیارد"
                  />
                </label>
              </div>

              <label>
                <span>مرتب‌سازی</span>
                <select name="sort" defaultValue={sort}>
                  <option value="newest">جدیدترین</option>
                  <option value="cheap">ارزان‌ترین</option>
                  <option value="expensive">گران‌ترین</option>
                  <option value="popular">پربازدیدترین</option>
                </select>
              </label>
            </div>

            <div className="catalogFilterFooter">
              <a href={`/ads/${segment}`}>پاک‌کردن فیلترها</a>
              <button type="submit">اعمال فیلتر و نمایش نتایج</button>
            </div>
          </form>
        </aside>
      </div>
    </>
  );
}
