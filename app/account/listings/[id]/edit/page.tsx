import ListingEditClient from "./ListingEditClient";
import InlineListingImagesManager from "./InlineListingImagesManager";

export default async function AccountListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <ListingEditClient listingId={id} />
      <InlineListingImagesManager listingId={id} />
    </>
  );
}
