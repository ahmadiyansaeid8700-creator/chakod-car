import type { Metadata } from "next";
import SegmentCatalogPage from "./_catalog/page";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "بازار خودرو چاکود",
  description:
    "جست‌وجوی دقیق میان آگهی‌های تأییدشده؛ از برند و مدل تا قیمت، سال، کارکرد و موقعیت.",
};

export default async function CarsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const requestedSegment = resolvedSearchParams.segment;
  const segment =
    (Array.isArray(requestedSegment) ? requestedSegment[0] : requestedSegment) ===
    "economic"
      ? "economic"
      : "all";

  return SegmentCatalogPage({
    params: Promise.resolve({ segment }),
    searchParams: Promise.resolve(resolvedSearchParams),
    canonical: true,
  });
}
