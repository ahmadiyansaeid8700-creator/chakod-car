import ListingEditClient from "./ListingEditClient";

export default async function AccountListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingEditClient listingId={id} />;
}
