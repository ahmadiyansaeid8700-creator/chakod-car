import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("keeps staging homepage service fixtures visible when businesses API fails", () => {
  const businesses = read("app/components/HomeFeaturedBusinesses.tsx");
  const catchStart = businesses.indexOf(".catch((error: unknown) =>");

  assert.notEqual(catchStart, -1, "homepage business fetch catch block must exist");

  const catchBlock = businesses.slice(catchStart, catchStart + 700);
  assert.match(catchBlock, /if \(PRELAUNCH_FIXTURES_ENABLED\)/);
  assert.match(catchBlock, /setItems\(PRELAUNCH_BUSINESSES as unknown as PublicBusiness\[\]\)/);
  assert.match(catchBlock, /setStatus\("ready"\)/);
  assert.match(catchBlock, /setStatus\("error"\)/);
});
