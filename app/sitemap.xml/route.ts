import { sitemapIndex, xmlResponse } from "../../lib/sitemap-xml";

export const dynamic = "force-dynamic";

export function GET() {
  return xmlResponse(
    sitemapIndex([
      "/sitemaps/static.xml",
      "/sitemaps/cars.xml",
      "/sitemaps/businesses.xml",
      "/sitemaps/dealerships.xml",
      "/sitemaps/articles.xml",
    ]),
  );
}
