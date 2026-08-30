import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("dealership directory feeds the shared showroom card resolved listing titles and images", async () => {
  const directory = await source("app/dealerships/DealerDirectoryClient.tsx");

  assert.match(directory, /ShowroomCard,[\s\S]{0,120}ShowroomListingPreview/);
  assert.match(directory, /listing-detail\.php\?id=/);
  assert.match(directory, /PRELAUNCH_FIXTURES_ENABLED/);
  assert.match(directory, /PRELAUNCH_LISTINGS/);
  assert.match(directory, /latestListings:\s*showroom\.latestListings/);
  assert.doesNotMatch(directory, /latestListings:\s*showroom\.listingIds\.map\(\(id\) => \(\{ id, title: `خودرو \$\{id\}` \}\)\)/);
});
