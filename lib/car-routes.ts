export type CarMarketSegment = "all" | "luxury" | "freezone" | "economic";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

const SEGMENT_PATHS: Record<CarMarketSegment, string> = {
  all: "/cars",
  luxury: "/cars/luxury",
  freezone: "/cars/free-zone",
  economic: "/cars?segment=economic",
};

export function carMarketPath(segment: CarMarketSegment) {
  return SEGMENT_PATHS[segment];
}

export function carDetailPath(id: string | number) {
  return `/cars/${encodeURIComponent(String(id))}`;
}

export function withSearchParams(path: string, searchParams: SearchParams = {}) {
  const [pathname, existingSearch = ""] = path.split("?", 2);
  const params = new URLSearchParams(existingSearch);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return;
    params.delete(key);
    (Array.isArray(value) ? value : [value]).forEach((item) => {
      params.append(key, item);
    });
  });

  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ""}`;
}

export function legacyAdsRedirect(
  segment: string,
  searchParams: SearchParams = {},
) {
  const normalizedSegment: CarMarketSegment =
    segment === "luxury" || segment === "freezone" || segment === "economic"
      ? segment
      : "all";

  return withSearchParams(carMarketPath(normalizedSegment), searchParams);
}
