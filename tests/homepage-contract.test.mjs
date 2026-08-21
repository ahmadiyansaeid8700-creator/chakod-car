import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertOrdered(source, tokens, label) {
  let previous = -1;

  for (const token of tokens) {
    const current = source.indexOf(token);
    assert.notEqual(current, -1, `${label}: ${token} must exist`);
    assert.ok(current > previous, `${label}: ${token} is out of order`);
    previous = current;
  }
}

test("keeps the approved homepage section order and excludes a hero before stories", () => {
  const page = read("app/page.tsx");

  assertOrdered(
    page,
    [
      "<HomeStories />",
      "<HomeFeaturedShowrooms query={query} />",
      "<HomePublicListingsClient query={query} />",
      "<HomeFeaturedBusinesses />",
      "<HomeGuides />",
    ],
    "homepage sections",
  );

  assert.equal(page.includes("HomeBannerSlot"), false);
  assert.equal(page.includes("HomeLaunchHero"), false);
});

test("keeps public homepage navigation and desktop create menu destinations stable", () => {
  const page = read("app/page.tsx");
  const createMenu = read("app/components/CreateActionMenu.tsx");
  const vehicles = read("app/components/HomePublicListingsClient.tsx");

  for (const href of [
    'href="/cars"',
    'href="/dealerships"',
    'href="/businesses"',
  ]) {
    assert.ok(page.includes(href), `homepage link ${href} must exist`);
  }

  assert.ok(page.includes("<CreateActionMenu"), "desktop create menu must be mounted on the homepage");
  assert.ok(page.includes('placement="down"'), "desktop create menu must open below its trigger");

  for (const href of [
    'href: "/account/stories"',
    'href: "/account/selected"',
    'href: "/account/listings/new"',
  ]) {
    assert.ok(createMenu.includes(href), `create menu destination ${href} must exist`);
  }

  assertOrdered(
    vehicles,
    ['id="luxury"', 'id="freezone"'],
    "vehicle sections",
  );
  assert.ok(vehicles.includes('allHref="/cars/luxury"'));
  assert.ok(vehicles.includes('allHref="/cars/free-zone"'));
  assert.ok(vehicles.includes("<HomeHorizontalRail"));
  assert.ok(vehicles.includes("<HomeVehicleCard"));
});

test("keeps the approved business order and shared location filtering", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");

  assertOrdered(
    businesses,
    ['type: "car_service"', 'type: "parts_store"', 'type: "repair_shop"'],
    "business sections",
  );

  for (const token of [
    "HOME_LOCATION_EVENT",
    "loadHomeLocation",
    "getHomeLocationScopes",
    "featuredBusinessRail",
  ]) {
    assert.ok(businesses.includes(token), `businesses must include ${token}`);
  }
});

test("keeps stories, showrooms and vehicle rails connected to the shared location", () => {
  const stories = read("app/components/HomeStories.tsx");
  const showrooms = read("app/components/HomeFeaturedShowrooms.tsx");
  const vehicles = read("app/components/HomePublicListingsClient.tsx");

  for (const source of [stories, showrooms, vehicles]) {
    assert.ok(source.includes("HOME_LOCATION_EVENT"));
    assert.ok(source.includes("loadHomeLocation"));
  }

  assert.ok(
    showrooms.includes('fetch(`/api/businesses?${params.toString()}`'),
    "homepage showrooms must use the canonical dealership directory source",
  );
  assert.ok(
    showrooms.includes('type: "dealer"'),
    "homepage showroom business requests must be limited to dealerships",
  );
});

test("keeps show-all catalog pages on their multi-row grid", () => {
  const catalog = read("app/components/CatalogListingsClient.tsx");
  const css = read("app/ads/[segment]/CatalogPage.module.css");

  assert.ok(catalog.includes('className={styles.grid}'));
  assert.ok(catalog.includes("<MarketListingItem"));
  assert.ok(css.includes(".grid {"));
  assert.ok(css.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"));
});

test("keeps homepage rails horizontal and responsive on small screens", () => {
  const css = read("app/home.css");

  for (const token of [
    ".homeRailTrack",
    "overflow-x: auto",
    "scroll-snap-type: inline mandatory",
  ]) {
    assert.ok(css.includes(token), `home rail CSS must include ${token}`);
  }
});

test("uses the same compact showroom-card design law on home and directory", () => {
  const homeShowrooms = read("app/components/HomeFeaturedShowrooms.tsx");
  const directory = read("app/dealerships/DealerDirectoryClient.tsx");

  assert.match(homeShowrooms, /<ShowroomCard density="compact"/);
  assert.match(directory, /<ShowroomCard[\s\S]*?density="compact"/);
});

test("uses the canonical catalog segments for homepage luxury and free-zone rails", () => {
  const vehicles = read("app/components/HomePublicListingsClient.tsx");
  const catalogItem = read("app/components/MarketListingItem.tsx");

  assert.match(vehicles, /\/api\/catalog\?/);
  assert.match(vehicles, /buildCatalogApiUrls\("luxury", location\)/);
  assert.match(vehicles, /buildCatalogApiUrls\("freezone", location\)/);
  assert.match(vehicles, /buildListingsApiUrls\(location\)[\s\S]*?\.catch\(\(\) => \[\]\)/);
  assert.match(vehicles, /buildCatalogApiUrls\("luxury", location\)[\s\S]*?\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(catalogItem, /showActions/);
});

test("shows only paid selected car services on home and keeps the directory separate", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");
  const servicesPage = read("app/car-services/page.tsx");

  assert.match(businesses, /allHref: "\/car-services"/);
  assert.match(businesses, /selectedOnly: true/);
  assert.match(businesses, /selectedOrder\.has\(normalizeText\(item\.name\)\)/);
  assert.doesNotMatch(businesses, /href: "\/car-services\?category=/);
  assert.match(businesses, /featuredBusinessEmpty/);
  assert.match(businesses, /featuredBusinessHeader \{[\s\S]*?align-items: flex-start/);
  assert.match(servicesPage, /<BusinessesPage/);
  assert.match(servicesPage, /initialType="car_service"/);
  assert.match(servicesPage, /basePath="\/car-services"/);
  assert.match(servicesPage, /lockType/);
});

test("shows only paid selected parts stores on home and keeps a dedicated directory", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");
  const partsPage = read("app/parts-stores/page.tsx");

  assert.match(
    businesses,
    /type: "parts_store"[\s\S]*?allHref: "\/parts-stores"[\s\S]*?fallbackLabels: \[\][\s\S]*?selectedOnly: true/,
  );
  assert.match(partsPage, /<BusinessesPage/);
  assert.match(partsPage, /initialType="parts_store"/);
  assert.match(partsPage, /basePath="\/parts-stores"/);
  assert.match(partsPage, /lockType/);
});
