import DealerScopedBackFix from "./DealerScopedBackFix";
import ListingManagerClient from "./ListingManagerClient";

export default async function AccountListingManagerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <DealerScopedBackFix listingId={id} />
      <ListingManagerClient listingId={id} />
    </>
  );
}
