export type StoryOrderItem = {
  story_id: number;
  starts_at?: string | null;
};

export type StoryNavigationIntent = "next" | "previous";

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
