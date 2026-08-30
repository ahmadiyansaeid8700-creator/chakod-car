import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("prelaunch fixtures stay explicitly gated and never become production defaults", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const env = read(".env.example");
  assert.match(fixtures, /NEXT_PUBLIC_PRELAUNCH_FIXTURES === "true"/);
  assert.match(env, /NEXT_PUBLIC_PRELAUNCH_FIXTURES=false/);
  assert.match(env, /PRELAUNCH_FIXTURES=false/);
  assert.doesNotMatch(fixtures, /password|mobile_number|phone_number|INSERT INTO/i);
});

test("staging Worker carries fixture gates as runtime vars and exposes them through process.env", () => {
  const config = read("vite.cloudflare.config.ts");
  const runtimeEnv = read("lib/runtime-env.ts");

  assert.match(config, /vars:\s*\{[\s\S]{0,300}NEXT_PUBLIC_PRELAUNCH_FIXTURES:\s*"true"/);
  assert.match(config, /vars:\s*\{[\s\S]{0,300}PRELAUNCH_FIXTURES:\s*"true"/);
  assert.match(config, /compatibility_flags:\s*\[[^\]]*"nodejs_compat_populate_process_env"[^\]]*\]/);
  assert.match(runtimeEnv, /NEXT_PUBLIC_PRELAUNCH_FIXTURES\?:\s*string/);
  assert.match(runtimeEnv, /PRELAUNCH_FIXTURES\?:\s*string/);
});

test("fixtures cover every requested prelaunch surface and are visibly marked", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  for (const token of [
    "PRELAUNCH_LISTINGS",
    "PRELAUNCH_STORIES",
    "PRELAUNCH_BUSINESSES",
    "PRELAUNCH_SHOWROOMS",
    "PRELAUNCH_MARKET_FLOOR",
    "TEST_",
  ]) assert.ok(fixtures.includes(token), `${token} must exist`);
});

test("homepage client fixtures remain browser-gated", () => {
  for (const path of [
    "app/components/HomeStories.tsx",
    "app/components/HomePublicListingsClient.tsx",
    "app/components/HomeFeaturedBusinesses.tsx",
    "app/components/HomeFeaturedShowrooms.tsx",
  ]) assert.match(read(path), /PRELAUNCH_FIXTURES_ENABLED/);
});

test("server demo gate reads the current Worker request environment", () => {
  const gate = read("lib/prelaunch-server-fixtures.ts");
  assert.match(gate, /getRuntimeEnv\(\)/);
  assert.match(gate, /env\.PRELAUNCH_FIXTURES === "true"/);
  assert.match(gate, /env\.NEXT_PUBLIC_PRELAUNCH_FIXTURES === "true"/);
  assert.match(gate, /process\.env\.PRELAUNCH_FIXTURES === "true"/);
});

test("staging demo fixtures resolve through public server catalog and detail paths", () => {
  const catalogRoute = read("app/api/catalog/route.ts");
  const catalogPage = read("app/ads/[segment]/page.tsx");
  const listingData = read("app/listing/[id]/listing-data.ts");
  const businessesRoute = read("app/api/businesses/route.ts");

  assert.match(catalogRoute, /PRELAUNCH_LISTINGS/);
  assert.match(catalogRoute, /prelaunchServerFixturesEnabled\(\)/);
  assert.match(catalogPage, /PRELAUNCH_LISTINGS/);
  assert.match(catalogPage, /prelaunchServerFixturesEnabled\(\)/);
  assert.match(listingData, /PRELAUNCH_LISTINGS/);
  assert.match(listingData, /prelaunchServerFixturesEnabled\(\)/);
  assert.match(businessesRoute, /PRELAUNCH_BUSINESSES/);
  assert.match(businessesRoute, /prelaunchServerFixturesEnabled\(\)/);
});

test("server demo gate is evaluated inside the request runtime instead of at module import", () => {
  for (const path of [
    "app/api/catalog/route.ts",
    "app/api/businesses/route.ts",
    "app/api/stories/public/route.ts",
    "app/api/market-floor/public/route.ts",
    "app/ads/[segment]/page.tsx",
    "app/listing/[id]/listing-data.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /PRELAUNCH_SERVER_FIXTURES_ENABLED/, `${path} must not capture the server fixture gate at module import`);
    assert.match(source, /prelaunchServerFixturesEnabled\(\)/, `${path} must evaluate the server fixture gate at request time`);
  }
});

test("staging demo stories are persistent until manually removed", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const storiesRoute = read("app/api/stories/public/route.ts");

  assert.match(fixtures, /PRELAUNCH_STORIES[\s\S]{0,2200}expires_at:\s*null/);
  assert.match(fixtures, /PRELAUNCH_STORIES[\s\S]{0,2200}demo_persistent:\s*true/);
  assert.match(storiesRoute, /prelaunchServerFixturesEnabled\(\)/);
  assert.doesNotMatch(storiesRoute, /const fixturesEnabled = process\.env\.PRELAUNCH_FIXTURES/);
});

test("staging market-floor fixtures are persistent and never show a fake 24-hour timer", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const marketFloorRoute = read("app/api/market-floor/public/route.ts");
  const marketFloorPage = read("app/market-floor/page.tsx");

  assert.match(fixtures, /PRELAUNCH_MARKET_FLOOR[\s\S]{0,1800}demoPersistent:\s*true/);
  assert.match(marketFloorRoute, /prelaunchServerFixturesEnabled\(\)/);
  assert.doesNotMatch(marketFloorRoute, /const fixturesEnabled = process\.env\.PRELAUNCH_FIXTURES/);
  assert.match(marketFloorPage, /demoPersistent\?:\s*boolean/);
  assert.match(marketFloorPage, /item\.demoPersistent\s*\?/);
  assert.match(marketFloorPage, /نمایش ثابت|دمو/);
});

test("staging services demo has enough inventory to fill every service filter", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const serviceRows = [...fixtures.matchAll(/\[(950\d{4}),\s*"(car_service|parts_store|repair_shop)"/g)];
  assert.ok(serviceRows.length >= 15, `expected at least 15 service businesses, got ${serviceRows.length}`);
  for (const category of [
    "car_wash",
    "detailing",
    "ceramic_coating",
    "window_tint",
    "ppf",
    "vehicle_wrap",
    "audio_alarm",
    "mechanical",
    "auto_electrical",
    "oil_change",
    "spare_parts",
  ]) assert.ok(fixtures.includes(`"${category}"`), `${category} needs demo inventory`);
});

test("staging businesses API falls back to fixtures when the legacy upstream returns an HTTP error", () => {
  const route = read("app/api/businesses/route.ts");
  assert.match(
    route,
    /if\s*\(fixturesEnabled\s*&&\s*!upstream\.ok\)\s*\{[\s\S]{0,500}success:\s*true[\s\S]{0,500}items:\s*fixtureItems/,
  );
});

test("staging service businesses use distinct self-hosted category-specific covers instead of vehicle listing art", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const block = fixtures.match(/export const PRELAUNCH_BUSINESSES = \(\[([\s\S]*?)\] as const\)\.map/)?.[1] || "";
  const serviceRows = [...block.matchAll(/\[(950\d{4}),\s*"(car_service|parts_store|repair_shop)"[^\n]*?"(demo-business-covers\/[^"]+)"\]/g)];
  const covers = serviceRows.map((match) => match[3]);

  assert.equal(serviceRows.length, 18, "every staging service business needs an explicit demo cover");
  assert.equal(new Set(covers).size, 18, "service demo covers must be unique per business");
  assert.doesNotMatch(block, /luxury-car\.webp|economic-car\.webp|freezone-car\.webp/);
  assert.doesNotMatch(fixtures, /unsplash\.com|images\.pexels\.com/);
  assert.match(fixtures, /cover_url:\s*`\$\{ASSET_BASE\}\/\$\{coverKey\}\.jpg`/);
  for (const token of ["detailing", "car-wash", "ppf", "tint", "wrap", "audio", "parts", "battery", "tire", "mechanic", "electrical", "oil-change"]) {
    assert.ok(covers.some((cover) => cover.includes(token)), `${token} needs a category-specific cover`);
  }
  for (const cover of covers) {
    const asset = new URL(`../public/${cover}.jpg`, import.meta.url);
    assert.ok(statSync(asset).size > 0, `${cover}.jpg must be materialized in public assets`);
  }
});

test("staging vehicle listings use distinct self-hosted covers and a second different gallery image", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const block = fixtures.match(/export const PRELAUNCH_LISTINGS = \(\[([\s\S]*?)\] as const\)\.map/)?.[1] || "";
  const rows = [...block.matchAll(/\[(910\d{4}),[^\n]*?"(demo-vehicle-covers\/[^"]+)",\s*"(demo-vehicle-covers\/[^"]+)"/g)];
  const covers = rows.map((match) => match[2]);
  const details = rows.map((match) => match[3]);

  assert.equal(rows.length, 12, "every staging vehicle listing needs explicit cover and detail art");
  assert.equal(new Set(covers).size, 12, "vehicle demo covers must be unique per listing");
  assert.equal(new Set([...covers, ...details]).size, 24, "every demo listing image should be visually distinct");
  assert.doesNotMatch(block, /luxury-car\.webp|economic-car\.webp|freezone-car\.webp/);
  assert.match(fixtures, /cover_image:\s*`\$\{ASSET_BASE\}\/\$\{coverKey\}\.jpg`/);
  assert.match(fixtures, /image_url:\s*`\$\{ASSET_BASE\}\/\$\{detailKey\}\.jpg`/);

  for (const key of [...covers, ...details]) {
    const asset = new URL(`../public/${key}.jpg`, import.meta.url);
    assert.ok(statSync(asset).size > 0, `${key}.jpg must be materialized in public assets`);
  }
});

test("staging service directories use one API-independent fixture fallback", () => {
  const route = read("app/services/ServicesRoute.tsx");
  const fallback = read("app/services/ServicesFixtureFallback.tsx");
  for (const path of [
    "app/services/page.tsx",
    "app/car-services/page.tsx",
    "app/parts-stores/page.tsx",
    "app/workshops/page.tsx",
  ]) assert.match(read(path), /ServicesRoute/, `${path} must use the shared services route`);
  assert.match(route, /PRELAUNCH_BUSINESSES/);
  assert.match(route, /prelaunchServerFixturesEnabled\(\)/);
  assert.match(route, /ServicesFixtureFallback/);
  assert.match(route, /BusinessesPage/);
  assert.match(fallback, /filterFixtureBusinesses/);
  assert.match(fallback, /category_keys/);
  assert.match(fallback, /\/services\/\$\{business\.slug\}/);
});

test("staging service detail resolves fixtures without the business API", () => {
  const detail = read("app/services/[slug]/page.tsx");
  assert.match(detail, /PRELAUNCH_BUSINESSES/);
  assert.match(detail, /prelaunchServerFixturesEnabled\(\)/);
  assert.match(detail, /redirect\(`\/businesses\/\$\{encodeURIComponent\(slug\)\}`\)/);
  assert.match(detail, /TEST_|business\.name/);
});

test("post-deploy staging smoke verifies every presentation surface instead of HTTP status only", () => {
  const workflow = read(".github/workflows/staging-demo-content-smoke.yml");
  for (const expected of [
    "Deploy staging Worker",
    "api/catalog?segment=luxury",
    "api/businesses?type=dealer",
    "api/businesses?type=car_service",
    "api/stories/public",
    "api/market-floor/public",
    "9100001",
    "9300001",
    "9600001",
    "test-showroom-9200001",
    "test-business-9500001",
  ]) assert.ok(workflow.includes(expected), `${expected} must be covered by staging smoke`);
});

test("compact featured showroom with exactly two listings overrides the fixed 58px compact height", () => {
  const card = read("app/components/ShowroomCard.tsx");
  const seamless = read("app/components/ShowroomCardSeamless.module.css");

  assert.match(card, /const compactTwoUp = latestListings\.length === 2 && density === "compact"/);
  assert.match(card, /compactTwoUp \? seamlessStyles\.galleryTwoCompact : ""/);
  assert.match(card, /height:\s*compactTwoUp \? "auto" : undefined/);
  assert.match(card, /compactTwoUp=\{compactTwoUp\}/);
  assert.match(card, /style=\{compactTwoUp \? \{ height: "auto", aspectRatio: "16 \/ 10" \} : undefined\}/);
  assert.match(seamless, /\.galleryTwo\s+\.item\s*\+\s*\.item\s*\{[\s\S]{0,120}border-inline-start:\s*1px/);
});
