import ListingCard from "./ListingCard";
import type { CatalogListing } from "../ads/[segment]/catalog-types";

type Props = {
  listing: CatalogListing;
  tone: "luxury" | "freezone" | "economic" | "neutral";
  badge: string;
};

export default function MarketListingItem({ listing, tone, badge }: Props) {
  return (
    <ListingCard
      listing={listing}
      tone={tone}
      badge={badge}
      variant="grid"
      showActions
    />
  );
}
