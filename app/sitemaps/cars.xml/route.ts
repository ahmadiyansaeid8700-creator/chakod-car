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
    "https://api.chakod.com/api/listings.php?page=1&per_page=500&status=active",
  );
  const items = collection(payload, ["data", "listings", "items", "results"]);
  const entries = items
    .map((item) => {
      const slug = itemSlug(item);
      return slug
        ? {
            loc: absoluteUrl(`/cars/${encodeURIComponent(slug)}`),
            lastmod: itemDate(item),
            changefreq: "daily" as const,
            priority: 0.8,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return xmlResponse(
    urlSet([
      { loc: absoluteUrl("/cars"), changefreq: "hourly", priority: 0.9 },
      ...entries,
    ]),
  );
}
