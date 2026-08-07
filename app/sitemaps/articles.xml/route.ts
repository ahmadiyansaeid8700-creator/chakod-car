import { getPublishedArticles } from "../../../lib/content-articles";
import { absoluteUrl, urlSet, xmlResponse } from "../../../lib/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  const articles = await getPublishedArticles();

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
