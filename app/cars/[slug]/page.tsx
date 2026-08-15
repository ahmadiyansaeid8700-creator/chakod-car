import { redirect } from "next/navigation";

import ListingDetailPage from "../../listing/[id]/page";
import { fetchListingDetail, type ListingData } from "../../listing/[id]/listing-data";
import {
  isDealerListing,
  isUsableListingPhone,
  normalizeListingPhone,
} from "../../../lib/listing-publication-policy";

function listingPhone(listing: ListingData) {
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
  let incompleteListing: ListingData | null = null;

  if (Number.isSafeInteger(listingId) && listingId > 0) {
    try {
      const response = await fetchListingDetail(listingId);
      if (response.data && !isUsableListingPhone(listingPhone(response.data))) {
        incompleteListing = response.data;
      }
    } catch {
      // ListingDetailPage keeps the canonical not-found/unavailable handling.
    }
  }

  if (incompleteListing) {
    const dealerId = Number(incompleteListing.dealer_id || 0);
    if (isDealerListing(incompleteListing) && Number.isSafeInteger(dealerId) && dealerId > 0) {
      redirect(`/showrooms/${dealerId}?ref=incomplete-listing`);
    }
    redirect("/cars?ref=incomplete-listing");
  }

  return ListingDetailPage({
    params: Promise.resolve({ id: slug }),
    canonical: true,
  });
}
