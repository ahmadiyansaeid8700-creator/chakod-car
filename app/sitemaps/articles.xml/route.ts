import { absoluteUrl, urlSet, xmlResponse } from "../../../lib/sitemap-xml";

export const dynamic = "force-dynamic";

const articleSlugs = [
  "complete-guide-buying-used-car",
  "best-selling-cars-iran",
];

export function GET() {
  return xmlResponse(
    urlSet([
      { loc: absoluteUrl("/articles"), changefreq: "weekly", priority: 0.7 },
      ...articleSlugs.map((slug) => ({
        loc: absoluteUrl(`/articles/${slug}`),
        changefreq: "monthly" as const,
        priority: 0.6,
      })),
    ]),
  );
}
