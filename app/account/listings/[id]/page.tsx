import ListingManagerClient from "./ListingManagerClient";

export default async function AccountListingManagerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingManagerClient listingId={id} />;
}
