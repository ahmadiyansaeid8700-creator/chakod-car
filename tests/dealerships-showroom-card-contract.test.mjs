import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("dealership directory feeds the shared showroom card resolved listing titles and images", async () => {
  const directory = await source("app/dealerships/DealerDirectoryClient.tsx");

  assert.match(directory, /import ShowroomCard from "\.\.\/components\/ShowroomCard"/);
  assert.match(directory, /import type \{ ShowroomListingPreview \} from "\.\.\/components\/ShowroomCard"/);
  assert.match(directory, /listing-detail\.php\?id=/);
  assert.match(directory, /PRELAUNCH_FIXTURES_ENABLED/);
  assert.match(directory, /PRELAUNCH_LISTINGS/);
  assert.match(directory, /latestListings:\s*showroom\.latestListings/);
  assert.doesNotMatch(directory, /latestListings:\s*showroom\.listingIds\.map\(\(id\) => \(\{ id, title: `خودرو \$\{id\}` \}\)\)/);
});

test("staging featured-showroom API exposes fixture placements with their real listing ids", async () => {
  const route = await source("app/api/featured-showrooms/route.ts");

  assert.match(route, /PRELAUNCH_SHOWROOMS/);
  assert.match(route, /PRELAUNCH_LISTINGS/);
  assert.match(route, /prelaunchServerFixturesEnabled\(\)/);
  assert.match(route, /dealer_id:\s*Number\(showroom\.id\)/);
  assert.match(route, /listing_ids:[\s\S]{0,220}listing\.dealer_id[\s\S]{0,120}showroom\.id/);
  assert.match(route, /fixturePlacements[\s\S]{0,1600}merged/);
});
