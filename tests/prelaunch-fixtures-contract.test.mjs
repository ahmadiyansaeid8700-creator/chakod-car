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
