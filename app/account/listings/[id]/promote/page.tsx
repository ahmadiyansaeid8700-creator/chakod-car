import ListingPromoteClient from "./ListingPromoteClient";

export default async function AccountListingPromotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingPromoteClient listingId={id} />;
}
