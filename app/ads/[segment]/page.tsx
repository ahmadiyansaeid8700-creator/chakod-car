import { permanentRedirect } from "next/navigation";
import { legacyAdsRedirect } from "../../../lib/car-routes";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LegacyAdsSegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ segment: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { segment } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  permanentRedirect(legacyAdsRedirect(segment, resolvedSearchParams));
}
