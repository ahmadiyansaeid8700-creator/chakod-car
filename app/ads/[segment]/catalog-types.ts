export type CatalogSegment = "all" | "luxury" | "freezone" | "economic";

export type CatalogFilters = {
  q: string;
  province: string;
  city: string;
  category: string;
  brand: string;
  model: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  minMileage: string;
  maxMileage: string;
  bodyStatus: string;
  transmission: string;
  fuelType: string;
  sellerType: string;
  sort: string;
  page: number;
};

export type CountFacet = {
  name: string;
  count: number | string;
};

export type CityFacet = CountFacet & {
  province: string;
};

export type CategoryFacet = CountFacet & {
  code: string;
};

export type BrandFacet = CountFacet & {
  code: string;
};

export type ModelFacet = CountFacet & {
  code: string;
  brand_code: string;
};

export type CatalogFacets = {
  provinces: CountFacet[];
  cities: CityFacet[];
  categories: CategoryFacet[];
  brands: BrandFacet[];
  models: ModelFacet[];
  body_statuses: CountFacet[];
  transmissions: CountFacet[];
  fuel_types: CountFacet[];
  range: {
    min_price?: number | string | null;
    max_price?: number | string | null;
    min_year?: number | string | null;
    max_year?: number | string | null;
    min_mileage?: number | string | null;
    max_mileage?: number | string | null;
  };
};

export type CatalogListing = {
  id: number | string;
  title: string;
  brand?: string | null;
  model?: string | null;
  trim_name?: string | null;
  brand_code?: string | null;
  model_code?: string | null;
  production_year?: number | null;
  mileage_km?: number | null;
  price_toman?: number | null;
  province?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  body_status?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  seller_type?: string | null;
  dealer_name?: string | null;
  dealer_verified?: boolean | number | null;
  category_name?: string | null;
  cover_image?: string | null;
  views_count?: number | null;
  created_at?: string | null;
};

export type CatalogResponse = {
  success: boolean;
  segment: CatalogSegment;
  sort: string;
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  data: CatalogListing[];
  facets: CatalogFacets;
};
