import { permanentRedirect } from "next/navigation";

import { accountListingPath } from "../../../../lib/listing-routes";

export default async function LegacyDashboardListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  permanentRedirect(accountListingPath(listingId));
}
