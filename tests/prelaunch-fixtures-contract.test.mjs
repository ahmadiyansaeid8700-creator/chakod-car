import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("homepage and market floor consume fixtures only through their gates", () => {
  for (const path of [
    "app/components/HomeStories.tsx",
    "app/components/HomePublicListingsClient.tsx",
    "app/components/HomeFeaturedBusinesses.tsx",
    "app/components/HomeFeaturedShowrooms.tsx",
  ]) assert.match(read(path), /PRELAUNCH_FIXTURES_ENABLED/);
  assert.match(read("app/api/market-floor/public/route.ts"), /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
});

test("staging demo fixtures resolve through public server catalog and detail paths", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const catalogRoute = read("app/api/catalog/route.ts");
  const catalogPage = read("app/ads/[segment]/page.tsx");
  const listingData = read("app/listing/[id]/listing-data.ts");
  const businessesRoute = read("app/api/businesses/route.ts");

  assert.match(fixtures, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(
    fixtures,
    /PRELAUNCH_SERVER_FIXTURES_ENABLED\s*=\s*[\s\S]{0,220}PRELAUNCH_FIXTURES\s*===\s*"true"[\s\S]{0,220}NEXT_PUBLIC_PRELAUNCH_FIXTURES\s*===\s*"true"/,
  );
  assert.match(catalogRoute, /PRELAUNCH_LISTINGS/);
  assert.match(catalogRoute, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(catalogPage, /PRELAUNCH_LISTINGS/);
  assert.match(catalogPage, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(listingData, /PRELAUNCH_LISTINGS/);
  assert.match(listingData, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(businessesRoute, /PRELAUNCH_BUSINESSES/);
  assert.match(businessesRoute, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
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
  assert.match(storiesRoute, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.doesNotMatch(storiesRoute, /const fixturesEnabled = process\.env\.PRELAUNCH_FIXTURES/);
});

test("staging market-floor fixtures are persistent and never show a fake 24-hour timer", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const marketFloorRoute = read("app/api/market-floor/public/route.ts");
  const marketFloorPage = read("app/market-floor/page.tsx");

  assert.match(fixtures, /PRELAUNCH_MARKET_FLOOR[\s\S]{0,1800}demoPersistent:\s*true/);
  assert.match(marketFloorRoute, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.doesNotMatch(marketFloorRoute, /const fixturesEnabled = process\.env\.PRELAUNCH_FIXTURES/);
  assert.match(marketFloorPage, /demoPersistent\?:\s*boolean/);
  assert.match(marketFloorPage, /item\.demoPersistent\s*\?/);
  assert.match(marketFloorPage, /نمایش ثابت|دمو/);
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
