import { redirect } from "next/navigation";

import ListingDetailPage from "../../listing/[id]/page";
import { fetchListingDetail } from "../../listing/[id]/listing-data";
import {
  isDealerListing,
  isUsableListingPhone,
  normalizeListingPhone,
} from "../../../lib/listing-publication-policy";

function listingPhone(listing: Record<string, unknown>) {
  return normalizeListingPhone(
    String(
      listing.contact_phone
      || listing.seller_phone
      || listing.phone
      || listing.mobile
      || "",
    ),
  );
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listingId = Number(slug);

  if (Number.isSafeInteger(listingId) && listingId > 0) {
    try {
      const response = await fetchListingDetail(listingId);
      const listing = response.data;

      if (listing && !isUsableListingPhone(listingPhone(listing))) {
        const dealerId = Number(listing.dealer_id || 0);
        if (isDealerListing(listing) && Number.isSafeInteger(dealerId) && dealerId > 0) {
          redirect(`/showrooms/${dealerId}?ref=incomplete-listing`);
        }
        redirect("/cars?ref=incomplete-listing");
      }
    } catch {
      // ListingDetailPage keeps the canonical not-found/unavailable handling.
    }
  }

  return ListingDetailPage({
    params: Promise.resolve({ id: slug }),
    canonical: true,
  });
}
