import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("keeps the Instagram story price gate server-side at three billion toman by default", async () => {
  const source = await read("lib/instagram-story-publishing.ts");
  assert.match(source, /DEFAULT_MIN_PRICE_TOMAN = 3_000_000_000/);
  assert.match(source, /normalizedPrice >= config\.minPriceToman/);
  assert.match(source, /price_below_threshold/);
});

test("keeps Instagram publication queued, capacity limited and paced", async () => {
  const source = await read("lib/instagram-story-publishing.ts");
  assert.match(source, /DEFAULT_DAILY_CAPACITY = 20/);
  assert.match(source, /DEFAULT_MIN_INTERVAL_MINUTES = 30/);
  assert.match(source, /media_type: "STORIES"/);
  assert.match(source, /media_publish/);
  assert.match(source, /status: "publishing"/);
  assert.match(source, /status: "published"/);
});

test("keeps the Instagram queue durable and one story order per queue row", async () => {
  const migration = await read("drizzle/0007_instagram_story_queue.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `instagram_story_queue`/);
  assert.match(migration, /`story_order_id` integer NOT NULL/);
  assert.match(migration, /instagram_story_queue_story_order_unique/);
  assert.match(migration, /instagram_story_queue_slot_unique/);
});

test("protects the publisher endpoint with a server-side secret", async () => {
  const route = await read("app/api/internal/instagram-story-publisher/route.ts");
  assert.match(route, /x-chakod-instagram-secret/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /processNextInstagramStory/);
});

test("double story checkout syncs eligible cars into the Instagram queue", async () => {
  const checkout = await read("app/api/stories/checkout/route.ts");
  assert.match(checkout, /instagramStoryEligibility/);
  assert.match(checkout, /syncInstagramStoryCandidate/);
  assert.match(checkout, /priceToman: listing\.price_toman/);
});
