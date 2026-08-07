import { articles } from "../../articles/article-data";
import { absoluteUrl, urlSet, xmlResponse } from "../../../lib/sitemap-xml";

export const dynamic = "force-dynamic";

export function GET() {
  return xmlResponse(
    urlSet([
      { loc: absoluteUrl("/articles"), changefreq: "weekly", priority: 0.7 },
      ...articles.map((article) => ({
        loc: absoluteUrl(`/articles/${article.slug}`),
        changefreq: "monthly" as const,
        priority: 0.6,
      })),
    ]),
  );
}
