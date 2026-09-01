import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("uses one accessible icon-only back control across primary mobile headers", () => {
  const component = read("app/components/MobileBackButton.tsx");
  const businesses = read("app/businesses/page.tsx");
  const dealerships = read("app/dealerships/DealerDirectoryClient.tsx");
  const stories = read("app/stories/[id]/page.tsx");
  const storySelector = read("app/account/stories/StoryListingSelectorClient.tsx");

  assert.match(component, /aria-label="بازگشت به صفحه قبل"/);
  assert.match(component, /d="m9 5 7 7-7 7"/);
  assert.match(component, /window\.history\.length > 1/);
  assert.match(component, /router\.push\(fallbackHref\)/);

  for (const source of [businesses, dealerships, stories, storySelector]) {
    assert.match(source, /<MobileBackButton/);
  }

  assert.doesNotMatch(stories, />\s*برگشت\s*<\/button>/);
});
