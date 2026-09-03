import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

let storyOrder;
try {
  storyOrder = await import("../app/components/home-stories-order.ts");
} catch {
  storyOrder = null;
}

async function readSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
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

test("shares the exact story through its public URL when available", () => {
  assert.equal(typeof storyOrder?.storySharePath, "function");
  assert.equal(
    storyOrder.storySharePath({ story_id: 1_000_000_042, share_url: "/stories/1000000042?ref=double-story" }),
    "/stories/1000000042?ref=double-story",
  );
});

test("falls back to a homepage deep link for legacy stories", () => {
  assert.equal(typeof storyOrder?.storySharePath, "function");
  assert.equal(storyOrder.storySharePath({ story_id: 317 }), "/?story=317");
});

test("finds the shared story inside its owner group", () => {
  assert.equal(typeof storyOrder?.findStoryPosition, "function");
  assert.deepEqual(
    storyOrder.findStoryPosition([
      { items: [{ story_id: 11 }, { story_id: 12 }] },
      { items: [{ story_id: 21 }] },
    ], 12),
    { groupIndex: 0, itemIndex: 1 },
  );
  assert.equal(storyOrder.findStoryPosition([{ items: [{ story_id: 11 }] }], 99), null);
});

test("requests a legacy shared story independently from homepage location filters", () => {
  assert.equal(typeof storyOrder?.legacyStoryRequest, "function");
  assert.equal(storyOrder.legacyStoryRequest(317), "scope=all&limit=1&story_id=317");
});

test("keeps newest-first order when opening a requested story", () => {
  assert.equal(typeof storyOrder?.orderStoriesForViewer, "function");
  const ordered = storyOrder.orderStoriesForViewer([
    { story_id: 11, starts_at: "2026-09-01T12:00:00Z" },
    { story_id: 12, starts_at: "2026-09-01T11:00:00Z" },
    { story_id: 317, starts_at: "2026-08-01T10:00:00Z" },
  ], 317);
  assert.deepEqual(ordered.map((story) => story.story_id), [11, 12, 317]);
});

test("retains a requested story and owner beyond normal viewer caps without reordering", () => {
  assert.equal(typeof storyOrder?.selectStoriesForOwner, "function");
  assert.equal(typeof storyOrder?.selectStoryGroups, "function");
  const ownerStories = Array.from({ length: 12 }, (_, index) => ({ story_id: index + 1 }));
  assert.deepEqual(
    storyOrder.selectStoriesForOwner(ownerStories, 12, 10).map((story) => story.story_id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
  );
  const groups = Array.from({ length: 14 }, (_, index) => ({
    key: `owner-${index + 1}`,
    items: [{ story_id: index + 1 }],
  }));
  assert.deepEqual(
    storyOrder.selectStoryGroups(groups, 14, 12).map((group) => group.key),
    [...groups.slice(0, 12).map((group) => group.key), "owner-14"],
  );
});

test("generates a QR with a four-module quiet zone", () => {
  assert.equal(typeof storyOrder?.storyQrOptions, "function");
  assert.deepEqual(storyOrder.storyQrOptions(), { width: 160, margin: 4 });
});

test("mobile story viewer is fullscreen with physical tap zones and no QR", async () => {
  const source = await readSource("app/components/HomeStoriesUnified.tsx");
  const css = await readSource("app/components/HomeStoriesUnified.module.css");
  const mobile = css.slice(css.indexOf("@media (max-width: 640px)"));

  assert.match(source, /className=\{styles\.tapPrevious\}[\s\S]*onClick=\{previous\}/);
  assert.match(source, /className=\{styles\.tapNext\}[\s\S]*onClick=\{next\}/);
  assert.match(source, /className=\{styles\.mediaBackdrop\}/);
  assert.match(mobile, /\.viewerCard\s*\{[\s\S]*height:\s*100dvh\s*;/);
  assert.match(mobile, /\.viewerCard\s*\{[\s\S]*border-radius:\s*0\s*;/);
  assert.match(mobile, /\.storyQr\s*\{\s*display:\s*none\s*;/);
});

// RED proof trigger: production viewer intentionally remains unchanged in this commit.
