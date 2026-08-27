import SegmentCatalogPage, {
  generateMetadata as generateCatalogMetadata,
} from "../_catalog/page";

type SearchParams = Record<string, string | string[] | undefined>;

const params = Promise.resolve({ segment: "freezone" });

export function generateMetadata() {
  return generateCatalogMetadata({ params });
}

export default function FreeZoneCarsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  return SegmentCatalogPage({ params, searchParams, canonical: true });
}
