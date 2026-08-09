import { notFound, permanentRedirect } from "next/navigation";

import ListingDetailDesktop from "./ListingDetailDesktop";
import ListingDetailMobile from "./ListingDetailMobile";
import SimilarListings from "./SimilarListings";
import { fetchListingDetail, type ListingApiResponse } from "./listing-data";
import { carDetailPath } from "../../../lib/car-routes";
import responsive from "./ListingDetailResponsive.module.css";

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
      <div className={responsive.mobileOnly}>
        <ListingDetailMobile
          listingId={listingId}
          initialResponse={initialResponse}
        />
      </div>

      <div className={responsive.desktopOnly}>
        <ListingDetailDesktop
          listingId={listingId}
          initialResponse={initialResponse}
        />
        <SimilarListings listingId={listingId} listing={initialResponse?.data || null} />
      </div>
    </>
  );
}
