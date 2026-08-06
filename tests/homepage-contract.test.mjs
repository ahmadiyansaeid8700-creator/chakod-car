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

test("keeps public homepage navigation and show-all destinations stable", () => {
  const page = read("app/page.tsx");
  const vehicles = read("app/components/HomePublicListingsClient.tsx");

  for (const href of [
    'href="/cars"',
    'href="/showrooms"',
    'href="/businesses"',
    'href="/account/listings/new"',
  ]) {
    assert.ok(page.includes(href), `homepage link ${href} must exist`);
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

  for (const [name, source] of [
    ["stories", stories],
    ["showrooms", showrooms],
    ["vehicles", vehicles],
  ]) {
    for (const token of [
      "HOME_LOCATION_EVENT",
      "loadHomeLocation",
      "getHomeLocationScopes",
    ]) {
      assert.ok(source.includes(token), `${name} must include ${token}`);
    }
  }

  assert.ok(showrooms.includes("<ShowroomCard"));
  assert.ok(vehicles.includes("<HomeHorizontalRail"));
});

test("keeps show-all catalog pages on their multi-row grid", () => {
  const luxuryPage = read("app/cars/luxury/page.tsx");
  const freezonePage = read("app/cars/free-zone/page.tsx");
  const catalogClient = read("app/components/CatalogListingsClient.tsx");
  const catalogCss = read("app/ads/[segment]/CatalogPage.module.css");

  assert.ok(luxuryPage.includes("SegmentCatalogPage"));
  assert.ok(freezonePage.includes("SegmentCatalogPage"));
  assert.ok(catalogClient.includes("styles.grid"));
  assert.match(catalogCss, /\.grid\s*\{[\s\S]*?grid-template-columns:/);
});

test("keeps homepage rails horizontal and responsive on small screens", () => {
  const homeCss = read("app/home.css");
  const vehicleCardCss = read("app/components/HomeVehicleCard.module.css");
  const mobileNavCss = read("app/components/MobileBottomNav.module.css");

  assert.match(
    homeCss,
    /\.homeRailTrack\s*\{[\s\S]*?grid-auto-flow:\s*column;/,
  );
  assert.match(
    homeCss,
    /\.homeRailTrack\s*\{[\s\S]*?overflow-x:\s*auto;/,
  );
  assert.match(homeCss, /@media\s*\(max-width:\s*\d+px\)/);
  assert.match(vehicleCardCss, /@media\s*\(max-width:\s*640px\)/);
  assert.match(
    vehicleCardCss,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.card\s*\{/,
  );
  assert.match(
    mobileNavCss,
    /\.pageSpacer\s*\{[\s\S]*?height:\s*calc\(118px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\);/,
  );
  assert.match(
    mobileNavCss,
    /\.navigationShell\s*\{[\s\S]*?bottom:\s*max\(12px,\s*env\(safe-area-inset-bottom,\s*0px\)\);/,
  );
});
