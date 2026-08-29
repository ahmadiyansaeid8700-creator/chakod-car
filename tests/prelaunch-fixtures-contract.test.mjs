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
  assert.match(read("app/api/market-floor/public/route.ts"), /PRELAUNCH_FIXTURES === "true"/);
});

test("staging demo fixtures resolve through public server catalog and detail paths", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const catalogRoute = read("app/api/catalog/route.ts");
  const catalogPage = read("app/ads/[segment]/page.tsx");
  const listingData = read("app/listing/[id]/listing-data.ts");
  const businessesRoute = read("app/api/businesses/route.ts");

  assert.match(fixtures, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(fixtures, /PRELAUNCH_FIXTURES === "true"/);
  assert.match(catalogRoute, /PRELAUNCH_LISTINGS/);
  assert.match(catalogRoute, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(catalogPage, /PRELAUNCH_LISTINGS/);
  assert.match(catalogPage, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(listingData, /PRELAUNCH_LISTINGS/);
  assert.match(listingData, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.match(businessesRoute, /PRELAUNCH_BUSINESSES/);
  assert.match(businessesRoute, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
});

test("staging deploy smoke verifies demo content instead of HTTP status only", () => {
  const workflow = read(".github/workflows/staging-deploy.yml");
  assert.match(workflow, /api\/catalog\?segment=luxury/);
  assert.match(workflow, /9100001/);
  assert.match(workflow, /test-business-9500001/);
  assert.match(workflow, /TEST_/);
});
