import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

let selector;
try {
  selector = await import("../app/account/stories/story-listing-eligibility.ts");
} catch {
  selector = null;
}

test("shows only active listings that do not already have a story", () => {
  assert.equal(typeof selector?.eligibleStoryListings, "function");
  const listings = [
    { id: 11, status: { code: "active" } },
    { id: 12, status: { code: "active" } },
    { id: 13, status: { code: "draft" } },
  ];

  const result = selector.eligibleStoryListings(listings, [{ listing_id: 12 }]);

  assert.deepEqual(result.map((listing) => listing.id), [11]);
});

test("keeps duplicate active-story records from leaking an ineligible listing", () => {
  assert.equal(typeof selector?.eligibleStoryListings, "function");
  const result = selector.eligibleStoryListings(
    [{ id: 21, status: { code: "active" } }],
    [{ listing_id: 21 }, { listing_id: 21 }],
  );
  assert.deepEqual(result, []);
});

test("keeps the back icon readable and desktop navigation aligned to its breakpoint", () => {
  const source = fs.readFileSync("app/account/stories/StoryListingSelectorClient.tsx", "utf8");
  const css = fs.readFileSync("app/account/stories/page.module.css", "utf8");
  assert.match(source, /<MobileBackButton fallbackHref="\/" \/>/);
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*?\.desktopHeader \{ display: block;/);
});

test("loads every page of eligible owner-scoped listings", () => {
  const source = fs.readFileSync("app/account/stories/StoryListingSelectorClient.tsx", "utf8");
  assert.match(source, /while \(hasNext\)/);
  assert.match(source, /pagination\?\.has_next/);
  assert.match(source, /requestListings\("personal"\)/);
  assert.match(source, /requestListings\("dealer"\)/);
});
