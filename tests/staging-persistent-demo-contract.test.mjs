import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("staging server fixtures survive runtime env folding while production defaults stay off", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const env = read(".env.example");

  assert.match(
    fixtures,
    /PRELAUNCH_SERVER_FIXTURES_ENABLED\s*=\s*[\s\S]{0,220}PRELAUNCH_FIXTURES\s*===\s*"true"[\s\S]{0,220}NEXT_PUBLIC_PRELAUNCH_FIXTURES\s*===\s*"true"/,
  );
  assert.match(env, /NEXT_PUBLIC_PRELAUNCH_FIXTURES=false/);
  assert.match(env, /PRELAUNCH_FIXTURES=false/);
});

test("demo stories are persistent fixtures and the public route does not expire them", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const route = read("app/api/stories/public/route.ts");

  assert.match(fixtures, /PRELAUNCH_STORIES[\s\S]{0,2200}expires_at:\s*null/);
  assert.match(fixtures, /PRELAUNCH_STORIES[\s\S]{0,2200}demo_persistent:\s*true/);
  assert.match(route, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.doesNotMatch(route, /const fixturesEnabled = process\.env\.PRELAUNCH_FIXTURES/);
  assert.doesNotMatch(
    route,
    /fixtureStories[\s\S]{0,1200}return !story\.expires_at \|\| story\.expires_at > now/,
  );
});

test("demo market-floor entries stay until manually removed and do not show a 24-hour countdown", () => {
  const fixtures = read("lib/prelaunch-fixtures.ts");
  const route = read("app/api/market-floor/public/route.ts");
  const page = read("app/market-floor/page.tsx");

  assert.match(fixtures, /PRELAUNCH_MARKET_FLOOR[\s\S]{0,1800}demoPersistent:\s*true/);
  assert.match(route, /PRELAUNCH_SERVER_FIXTURES_ENABLED/);
  assert.doesNotMatch(route, /const fixturesEnabled = process\.env\.PRELAUNCH_FIXTURES/);
  assert.match(page, /demoPersistent\?:\s*boolean/);
  assert.match(page, /item\.demoPersistent\s*\?/);
  assert.match(page, /نمایش ثابت|دمو/);
});

test("post-deploy smoke proves every presentation surface receives demo data", () => {
  const workflow = read(".github/workflows/staging-demo-content-smoke.yml");

  for (const expected of [
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
  ]) {
    assert.ok(workflow.includes(expected), `${expected} must be covered by staging smoke`);
  }
});
