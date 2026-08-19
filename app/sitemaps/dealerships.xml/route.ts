import {
  absoluteUrl,
  collection,
  itemDate,
  itemSlug,
  safeJson,
  urlSet,
  xmlResponse,
} from "../../../lib/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await safeJson(
    "https://api.chakod.com/api/businesses.php?limit=500&status=approved&type=dealership",
  );
  const items = collection(payload, ["data", "businesses", "dealerships", "items", "results"]);
  const entries = items
    .map((item) => {
      const slug = itemSlug(item);
      return slug
        ? {
            loc: absoluteUrl(`/businesses/${encodeURIComponent(slug)}`),
            lastmod: itemDate(item),
            changefreq: "weekly" as const,
            priority: 0.75,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return xmlResponse(
    urlSet([
      { loc: absoluteUrl("/dealerships"), changefreq: "daily", priority: 0.8 },
      ...entries,
    ]),
  );
}
