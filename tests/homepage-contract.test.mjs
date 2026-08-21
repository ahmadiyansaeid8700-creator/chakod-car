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
  const showroomsCss = read("app/components/HomeFeaturedShowrooms.module.css");
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");

  for (const token of [
    ".homeRailTrack",
    "direction: rtl",
    "overflow-x: auto",
    "scroll-snap-type: inline mandatory",
  ]) {
    assert.ok(css.includes(token), `home rail CSS must include ${token}`);
  }

  assert.match(showroomsCss, /\.dealerRail,[\s\S]*?direction: rtl/);
  assert.match(businesses, /\.featuredBusinessRail \{[\s\S]*?direction: rtl/);
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

test("shows all active businesses on home while premium placements rank first", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");
  const servicesPage = read("app/car-services/page.tsx");

  assert.match(businesses, /allHref: "\/car-services"/);
  assert.match(businesses, /visibility: "all"/);
  assert.match(businesses, /HOME_BUSINESS_POLICY\.visibility === "all"/);
  assert.match(businesses, /selectedOrder\.get\(normalizeText\(a\.name\)\)/);
  assert.doesNotMatch(businesses, /href: "\/car-services\?category=/);
  assert.match(businesses, /featuredBusinessEmpty/);
  assert.match(businesses, /featuredBusinessHeader \{[\s\S]*?align-items: flex-start/);
  assert.match(servicesPage, /<BusinessesPage/);
  assert.match(servicesPage, /initialType="car_service"/);
  assert.match(servicesPage, /basePath="\/car-services"/);
  assert.match(servicesPage, /lockType/);
});

test("keeps parts stores on the shared homepage visibility policy and a dedicated directory", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");
  const partsPage = read("app/parts-stores/page.tsx");

  assert.match(
    businesses,
    /type: "parts_store"[\s\S]*?allHref: "\/parts-stores"[\s\S]*?fallbackLabels: \[\]/,
  );
  assert.match(partsPage, /<BusinessesPage/);
  assert.match(partsPage, /initialType="parts_store"/);
  assert.match(partsPage, /basePath="\/parts-stores"/);
  assert.match(partsPage, /lockType/);
});

test("keeps repair shops on the shared homepage visibility policy and a dedicated directory", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");
  const workshopsPage = read("app/workshops/page.tsx");

  assert.match(
    businesses,
    /type: "repair_shop"[\s\S]*?allHref: "\/workshops"[\s\S]*?fallbackLabels: \[\]/,
  );
  assert.match(workshopsPage, /<BusinessesPage/);
  assert.match(workshopsPage, /initialType="repair_shop"/);
  assert.match(workshopsPage, /basePath="\/workshops"/);
  assert.match(workshopsPage, /lockType/);
});

test("never leaves a localized homepage empty while nationwide inventory exists", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");
  const vehicles = read("app/components/HomePublicListingsClient.tsx");
  const showrooms = read("app/components/HomeFeaturedShowrooms.tsx");

  assert.match(businesses, /const nationwideQuery = new URLSearchParams\(\{ limit: "100" \}\)/);
  assert.match(businesses, /const exactItems = typeItems\.filter\(\(item\) => businessMatchesLocation\(item, location\)\)/);
  assert.match(businesses, /label: "پیشنهادهای سراسر ایران"/);
  assert.match(businesses, /resolveBusinessesForLocation\(items, config\.type, location, selected\)/);
  assert.match(vehicles, /resolveListingsForLocation/);
  assert.match(vehicles, /luxuryLabel: luxuryResolved\.label/);
  assert.match(showrooms, /resolveDealersForLocation/);
  assert.match(showrooms, /resolvedDealers\.label/);
});

test("keeps the mobile location name readable and the homepage footer identity clean", () => {
  const selector = read("app/components/HomeLocationSelector.tsx");
  const page = read("app/page.tsx");
  const css = read("app/home.css");

  assert.match(selector, /@media\(max-width:640px\)[\s\S]*?\.chakodLocationTriggerCopy small\{display:none\}/);
  assert.match(selector, /@media\(max-width:640px\)[\s\S]*?\.chakodLocationTriggerCopy strong\{[^}]*font-size:12px/);
  assert.match(css, /grid-template-columns:minmax\(148px,42vw\) minmax\(0,1fr\)/);
  assert.match(page, /className="masterFooterSymbol"[\s\S]*?src="\/brand\/chakod-symbol\.png"/);
  assert.match(page, /className="masterFooterWordmark"[\s\S]*?چاکود/);
  assert.doesNotMatch(page, /chakod-logo-full-light\.png/);
  assert.match(page, /شرکت یکتا الکترونیک گلشن نوین/);
  assert.match(page, /تأسیس ۱۳۹۴/);
});

test("contains large location selections inside the mobile dialog", () => {
  const selector = read("app/components/HomeLocationSelector.tsx");

  assert.match(selector, /\.chakodLocationDialog\{[^}]*min-width:0/);
  assert.match(selector, /\.chakodLocationSelected\{[^}]*min-width:0;[^}]*overflow:hidden/);
  assert.match(selector, /\.chakodLocationChips\{[^}]*width:100%;[^}]*max-width:100%;[^}]*overflow-x:auto/);
  assert.match(selector, /\.chakodLocationBody\{[^}]*overflow-y:auto;[^}]*overflow-x:hidden/);
  assert.match(selector, /@media\(max-width:760px\)[\s\S]*?\.chakodLocationFooter\{[^}]*width:100%;[^}]*box-sizing:border-box/);
});

test("keeps the mobile showroom heading concise and close to stories", () => {
  const showrooms = read("app/components/HomeFeaturedShowrooms.tsx");
  const css = read("app/components/HomeFeaturedShowrooms.module.css");

  assert.match(showrooms, /<h2>نمایشگاه‌های منتخب<\/h2>/);
  assert.doesNotMatch(showrooms, /نمایشگاه‌های منتخب چاکود/);
  assert.doesNotMatch(showrooms, /ویترین نمایشگاه‌ها/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.dealerSection \{[^}]*padding-top: 24px/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.dealerSection \{[^}]*padding-top: 18px/);
});
