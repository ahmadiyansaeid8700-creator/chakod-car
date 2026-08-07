import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import CompareListingButton from "./CompareListingButton";
import ListingDetailClient from "./ListingDetailClient";
import SimilarListings from "./SimilarListings";
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
  const reportHref = `/support?topic=report&listing_id=${listingId}&subject=${encodeURIComponent(`گزارش آگهی شماره ${listingId}`)}#request`;

  return (
    <>
      <ListingDetailClient
        listingId={listingId}
        initialResponse={initialResponse}
      />
      <CompareListingButton listingId={listingId} />
      <SimilarListings listingId={listingId} listing={initialResponse?.data || null} />
      <section
        dir="rtl"
        style={{
          width: "min(1180px, calc(100% - 24px))",
          margin: "0 auto 42px",
          border: "1px solid #eadff2",
          borderRadius: 18,
          background: "#fff",
          padding: "17px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ display: "block", color: "#2c1d37", marginBottom: 4 }}>
            مشکلی در اطلاعات این آگهی دیدید؟
          </strong>
          <span style={{ color: "#776980", fontSize: 12 }}>
            گزارش با شناسه همین آگهی برای پشتیبانی چاکود ثبت و قابل پیگیری می‌شود.
          </span>
        </div>
        <Link
          href={reportHref}
          style={{
            display: "inline-flex",
            minHeight: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: "#f4effb",
            padding: "0 14px",
            color: "#6d28d9",
            fontSize: 12,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          گزارش آگهی
        </Link>
      </section>
    </>
  );
}
