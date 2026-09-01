export type StoryEligibleListing = {
  id: number;
  status?: { code?: string };
};

export type ListingStoryReference = {
  listing_id: number;
};

export function eligibleStoryListings<T extends StoryEligibleListing>(
  listings: T[],
  activeStories: ListingStoryReference[],
) {
  const activeStoryListingIds = new Set(
    activeStories.map((story) => Number(story.listing_id)),
  );

  return listings.filter((listing) => (
    String(listing.status?.code || "").toLowerCase() === "active"
    && !activeStoryListingIds.has(Number(listing.id))
  ));
}
