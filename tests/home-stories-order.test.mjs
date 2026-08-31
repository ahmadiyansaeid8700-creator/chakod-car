import assert from "node:assert/strict";
import test from "node:test";

let storyOrder;
try {
  storyOrder = await import("../app/components/home-stories-order.ts");
} catch {
  storyOrder = null;
}

test("orders the Instagram-style story rail newest-first from the left", () => {
  assert.equal(typeof storyOrder?.orderStoriesNewestFirst, "function");

  const ordered = storyOrder.orderStoriesNewestFirst([
    { story_id: 11, starts_at: "2026-08-30T09:00:00Z" },
    { story_id: 12, starts_at: "2026-08-31T11:00:00Z" },
    { story_id: 13, starts_at: "2026-08-31T10:00:00Z" },
  ]);

  assert.deepEqual(ordered.map((story) => story.story_id), [12, 13, 11]);
});

test("moves to the next story when the viewer is swiped right", () => {
  assert.equal(typeof storyOrder?.storySwipeIntent, "function");
  assert.equal(storyOrder.storySwipeIntent(100, 170), "next");
  assert.equal(storyOrder.storySwipeIntent(170, 100), "previous");
  assert.equal(storyOrder.storySwipeIntent(100, 130), null);
});

test("uses the right arrow for the next story", () => {
  assert.equal(typeof storyOrder?.storyArrowIntent, "function");
  assert.equal(storyOrder.storyArrowIntent("ArrowRight"), "next");
  assert.equal(storyOrder.storyArrowIntent("ArrowLeft"), "previous");
  assert.equal(storyOrder.storyArrowIntent("Escape"), null);
});
