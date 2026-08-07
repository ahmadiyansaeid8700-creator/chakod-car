import { notFound, permanentRedirect } from "next/navigation";
import CompareListingButton from "./CompareListingButton";
import ListingDetailClient from "./ListingDetailClient";
import { fetchListingDetail, type ListingApiResponse } from "./listing-data";
import { carDetailPath } from "../../../lib/car-routes";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getInitialListing(listingId: number): Promise<ListingApiResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2600);

  try {
    return await fetchListingDetail(listingId, controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function ListingDetailPage({
  params,
  canonical = false,
}: PageProps & { canonical?: boolean }) {
  const resolvedParams = await params;
  const listingId = Number(resolvedParams.id);

  if (!Number.isFinite(listingId) || listingId <= 0) notFound();

  if (!canonical) {
    permanentRedirect(carDetailPath(resolvedParams.id));
  }

  const initialResponse = await getInitialListing(listingId);

  return (
    <>
      <ListingDetailClient
        listingId={listingId}
        initialResponse={initialResponse}
      />
      <CompareListingButton listingId={listingId} />
    </>
  );
}
