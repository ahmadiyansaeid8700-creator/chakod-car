export type StoryOrderItem = {
  story_id: number;
  starts_at?: string | null;
};

export type StoryNavigationIntent = "next" | "previous";

export type StoryShareItem = {
  story_id: number;
  share_url?: string | null;
};

export type StoryGroupItem = {
  items: Array<{ story_id: number }>;
};

function storyStartTime(value: string | null | undefined) {
  const timestamp = Date.parse(String(value || "").replace(" ", "T"));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function orderStoriesNewestFirst<T extends StoryOrderItem>(items: T[]) {
  return [...items].sort((left, right) => {
    const timeDifference = storyStartTime(right.starts_at) - storyStartTime(left.starts_at);
    return timeDifference || right.story_id - left.story_id;
  });
}

export function orderStoriesForViewer<T extends StoryOrderItem>(items: T[], requestedStoryId?: number | null) {
  void requestedStoryId;
  return orderStoriesNewestFirst(items);
}

export function selectStoriesForOwner<T extends { story_id: number }>(
  items: T[],
  requestedStoryId: number | null | undefined,
  limit: number,
) {
  const selected = items.slice(0, limit);
  if (!requestedStoryId || selected.some((story) => story.story_id === requestedStoryId)) return selected;
  const requested = items.find((story) => story.story_id === requestedStoryId);
  return requested ? [...selected, requested] : selected;
}

export function selectStoryGroups<T extends StoryGroupItem>(
  groups: T[],
  requestedStoryId: number | null | undefined,
  limit: number,
) {
  const selected = groups.slice(0, limit);
  if (!requestedStoryId || selected.some((group) => group.items.some((story) => story.story_id === requestedStoryId))) {
    return selected;
  }
  const requestedGroup = groups.find((group) => group.items.some((story) => story.story_id === requestedStoryId));
  return requestedGroup ? [...selected, requestedGroup] : selected;
}

export function storySwipeIntent(startX: number, endX: number): StoryNavigationIntent | null {
  const distance = endX - startX;
  if (Math.abs(distance) < 48) return null;
  return distance > 0 ? "next" : "previous";
}

export function storyArrowIntent(key: string): StoryNavigationIntent | null {
  if (key === "ArrowRight") return "next";
  if (key === "ArrowLeft") return "previous";
  return null;
}

export function storySharePath(item: StoryShareItem) {
  const publicPath = String(item.share_url || "").trim();
  if (publicPath) return publicPath;
  return `/?story=${encodeURIComponent(String(item.story_id))}`;
}

export function findStoryPosition(groups: StoryGroupItem[], storyId: number) {
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const itemIndex = groups[groupIndex].items.findIndex((story) => story.story_id === storyId);
    if (itemIndex >= 0) return { groupIndex, itemIndex };
  }
  return null;
}

export function legacyStoryRequest(storyId: number) {
  return new URLSearchParams({ scope: "all", limit: "1", story_id: String(storyId) }).toString();
}

export function storyQrOptions() {
  return { width: 160, margin: 4 } as const;
}
