import ListingImagesClient from "./ListingImagesClient";

export default async function AccountListingImagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingImagesClient listingId={id} />;
}
